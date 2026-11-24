import "dotenv/config";
import express from "express";
import path from "path";
import { Prisma } from "@prisma/client";
import { prisma, isDatabaseConfigured, ensureDatabaseSchema } from "./server/prisma";
import { generateTripItinerary } from "./server/gemini";
import {
  clearSessionCookie,
  createUserSession,
  hashPassword,
  isValidCsrfRequest,
  parseCookies,
  requireAuth,
  resolveAuthenticatedSession,
  revokeSessionByToken,
  SESSION_COOKIE_NAME,
  setSessionCookie,
  verifyPassword,
  type AuthRequest,
} from "./server/auth";
import type { BudgetLevel, CreateTripInput, TravelPace } from "./src/types/trip";

const app = express();
app.set("trust proxy", 1);
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: "1mb" }));

const VALID_BUDGETS: ReadonlySet<BudgetLevel> = new Set(["budget", "moderate", "luxury"]);
const VALID_PACES: ReadonlySet<TravelPace> = new Set(["relaxed", "balanced", "packed"]);
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validateSignupInput(
  body: unknown
): { ok: true; data: { name: string; email: string; password: string } } | { ok: false; message: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, message: "Invalid signup request." };
  }
  const raw = body as Record<string, unknown>;
  const name = typeof raw.name === "string" ? raw.name.trim().replace(/\s+/g, " ") : "";
  const email = typeof raw.email === "string" ? raw.email.trim().toLowerCase() : "";
  const password = typeof raw.password === "string" ? raw.password : "";

  if (name.length < 2 || name.length > 80) {
    return { ok: false, message: "Please enter your name (2 to 80 characters)." };
  }
  if (!email || email.length > 254 || !EMAIL_REGEX.test(email)) {
    return { ok: false, message: "Please enter a valid email address." };
  }
  if (password.length < 8 || password.length > 128) {
    return { ok: false, message: "Password must be at least 8 characters long." };
  }

  return { ok: true, data: { name, email, password } };
}

function validateLoginInput(
  body: unknown
): { ok: true; data: { email: string; password: string } } | { ok: false; message: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, message: "Invalid login request." };
  }
  const raw = body as Record<string, unknown>;
  const email = typeof raw.email === "string" ? raw.email.trim().toLowerCase() : "";
  const password = typeof raw.password === "string" ? raw.password : "";

  if (!email || !EMAIL_REGEX.test(email)) {
    return { ok: false, message: "Please enter a valid email address." };
  }
  if (!password) {
    return { ok: false, message: "Please enter your password." };
  }

  return { ok: true, data: { email, password } };
}

function validateCreateTripInput(
  body: unknown
): { ok: true; data: CreateTripInput } | { ok: false; message: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, message: "Invalid request payload." };
  }

  const raw = body as Record<string, unknown>;
  const destination = typeof raw.destination === "string" ? raw.destination.trim() : "";
  if (destination.length < 2 || destination.length > 120) {
    return { ok: false, message: "Destination must be between 2 and 120 characters." };
  }

  if (!isValidIsoDate(raw.startDate) || !isValidIsoDate(raw.endDate)) {
    return { ok: false, message: "Please provide valid start and end dates (YYYY-MM-DD)." };
  }

  const startMs = Date.parse(`${raw.startDate}T00:00:00Z`);
  const endMs = Date.parse(`${raw.endDate}T00:00:00Z`);
  if (endMs < startMs) {
    return { ok: false, message: "End date cannot be earlier than start date." };
  }

  const dayCount = Math.floor((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1;
  if (dayCount > 14) {
    return { ok: false, message: "Trips can be up to 14 days long for detailed planning." };
  }

  const travelers = Number(raw.travelers);
  if (!Number.isInteger(travelers) || travelers < 1 || travelers > 20) {
    return { ok: false, message: "Number of travelers must be a whole number from 1 to 20." };
  }

  const budgetLevel = raw.budgetLevel as BudgetLevel;
  if (!VALID_BUDGETS.has(budgetLevel)) {
    return { ok: false, message: "Budget level must be budget, moderate, or luxury." };
  }

  const travelPace = raw.travelPace as TravelPace;
  if (!VALID_PACES.has(travelPace)) {
    return { ok: false, message: "Travel pace must be relaxed, balanced, or packed." };
  }

  const rawInterests = Array.isArray(raw.interests) ? raw.interests : [];
  const interests = rawInterests
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0 && item.length <= 40)
    .slice(0, 10);

  return {
    ok: true,
    data: {
      destination,
      startDate: raw.startDate,
      endDate: raw.endDate,
      travelers,
      budgetLevel,
      interests,
      travelPace,
    },
  };
}

function serializeTrip(trip: {
  id: string;
  userId?: string | null;
  destination: string;
  startDate: Date;
  endDate: Date;
  travelers: number;
  budgetLevel: string;
  interests: string[];
  travelPace: string;
  status: string;
  itinerary: Prisma.JsonValue | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: trip.id,
    userId: trip.userId ?? null,
    destination: trip.destination,
    startDate: trip.startDate.toISOString().slice(0, 10),
    endDate: trip.endDate.toISOString().slice(0, 10),
    travelers: trip.travelers,
    budgetLevel: trip.budgetLevel,
    interests: trip.interests,
    travelPace: trip.travelPace,
    status: trip.status,
    itinerary: trip.itinerary,
    errorMessage: trip.errorMessage,
    createdAt: trip.createdAt.toISOString(),
    updatedAt: trip.updatedAt.toISOString(),
  };
}

function redactSecrets(text: string): string {
  let clean = text;
  const secrets = [process.env.GEMINI_API_KEY, process.env.DATABASE_URL].filter(
    (v): v is string => Boolean(v && v.trim().length > 0)
  );
  for (const secret of secrets) {
    clean = clean.split(secret).join("[REDACTED]");
  }
  return clean
    .replace(/AIza[0-9A-Za-z_-]{16,}/g, "[REDACTED_KEY]")
    .replace(/postgres(?:ql)?:\/\/[^\s"'`]+/gi, "[REDACTED_DB_URL]")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [REDACTED]")
    .replace(/(api[_-]?key|password|secret|token)\s*[:=]\s*[^\s,;]+/gi, "$1=[REDACTED]");
}

function extractReadableErrorDetail(err: unknown): {
  status?: number;
  code?: string;
  message: string;
} {
  const errObj = err as { status?: number; code?: string; message?: string };
  const rawMessage = err instanceof Error ? err.message : String(err ?? "Unknown error");
  let parsedMessage = rawMessage;

  const jsonStart = rawMessage.indexOf("{");
  if (jsonStart !== -1) {
    try {
      const maybeJson = JSON.parse(rawMessage.slice(jsonStart)) as {
        error?: { message?: string; status?: string; code?: number };
      };
      if (maybeJson?.error?.message) {
        parsedMessage = maybeJson.error.message;
      }
    } catch {
      // Keep rawMessage when trailing JSON isn't parseable
    }
  }

  return {
    status: typeof errObj?.status === "number" ? errObj.status : undefined,
    code: typeof errObj?.code === "string" ? errObj.code : undefined,
    message: redactSecrets(parsedMessage).replace(/\s+/g, " ").trim(),
  };
}

function sanitizeErrorMessage(err: unknown): string {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return `Database error (${err.code}) while saving your trip. Please try again.`;
  }
  if (err instanceof Prisma.PrismaClientInitializationError) {
    return "Could not connect to the database. Please verify DATABASE_URL in Settings > Secrets.";
  }

  const { status, message } = extractReadableErrorDetail(err);
  const shortDetail = message.length > 260 ? `${message.slice(0, 257)}...` : message;

  if (status === 401 || status === 403 || /API_KEY_INVALID|PERMISSION_DENIED/i.test(message)) {
    return "Gemini API authentication failed. Please verify GEMINI_API_KEY in Settings > Secrets.";
  }
  if (status === 429 || /RESOURCE_EXHAUSTED/i.test(message)) {
    return "Gemini API rate limit or quota reached (429). Please wait a moment and try again.";
  }
  if (status === 404 || /\bNOT_FOUND\b/i.test(message)) {
    return `Gemini model error (404): ${shortDetail || "Requested model was not found."}`;
  }
  if (status === 400 || /INVALID_ARGUMENT/i.test(message)) {
    return `Gemini request error (400): ${shortDetail || "Invalid generation request."}`;
  }
  if (/GEMINI_API_KEY/i.test(message)) {
    return shortDetail;
  }

  return shortDetail || "Something went wrong while building your itinerary. Please try again.";
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    databaseConfigured: isDatabaseConfigured(),
    aiConfigured: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Authentication routes
app.get("/api/auth/me", async (req, res) => {
  if (!isDatabaseConfigured()) {
    return res.status(503).json({
      error: "Database is not configured. Please add DATABASE_URL in Settings > Secrets.",
    });
  }

  try {
    await ensureDatabaseSchema();
    const resolved = await resolveAuthenticatedSession(req);
    return res.json({ user: resolved ? resolved.user : null });
  } catch (err) {
    console.error("Failed to check session:", err instanceof Error ? err.message : "Unknown error");
    return res.status(500).json({ error: "Unable to verify session right now." });
  }
});

app.post("/api/auth/signup", async (req, res) => {
  if (!isDatabaseConfigured()) {
    return res.status(503).json({
      error: "Database is not configured. Please add DATABASE_URL in Settings > Secrets.",
    });
  }
  if (!isValidCsrfRequest(req)) {
    return res.status(403).json({ error: "Cross-origin request blocked." });
  }

  const validation = validateSignupInput(req.body);
  if (!validation.ok) {
    return res.status(400).json({ error: validation.message });
  }

  const { name, email, password } = validation.data;

  try {
    await ensureDatabaseSchema();

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      return res.status(409).json({
        error: "An account with this email already exists. Please log in instead.",
      });
    }

    const passwordHash = await hashPassword(password);
    const createdUser = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    const rawToken = await createUserSession(createdUser.id);
    setSessionCookie(res, rawToken);

    return res.status(201).json({
      user: {
        id: createdUser.id,
        name: createdUser.name,
        email: createdUser.email,
        createdAt: createdUser.createdAt.toISOString(),
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return res.status(409).json({
        error: "An account with this email already exists. Please log in instead.",
      });
    }
    console.error("Signup failed:", err instanceof Error ? err.message : "Unknown error");
    return res.status(500).json({ error: "Unable to create your account right now. Please try again." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  if (!isDatabaseConfigured()) {
    return res.status(503).json({
      error: "Database is not configured. Please add DATABASE_URL in Settings > Secrets.",
    });
  }
  if (!isValidCsrfRequest(req)) {
    return res.status(403).json({ error: "Cross-origin request blocked." });
  }

  const validation = validateLoginInput(req.body);
  if (!validation.ok) {
    return res.status(400).json({ error: validation.message });
  }

  const { email, password } = validation.data;

  try {
    await ensureDatabaseSchema();

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const validPassword = await verifyPassword(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const rawToken = await createUserSession(user.id);
    setSessionCookie(res, rawToken);

    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt.toISOString(),
      },
    });
  } catch (err) {
    console.error("Login failed:", err instanceof Error ? err.message : "Unknown error");
    return res.status(500).json({ error: "Unable to log in right now. Please try again." });
  }
});

app.post("/api/auth/logout", async (req, res) => {
  if (!isValidCsrfRequest(req)) {
    return res.status(403).json({ error: "Cross-origin request blocked." });
  }

  try {
    const cookies = parseCookies(req);
    await revokeSessionByToken(cookies[SESSION_COOKIE_NAME]);
  } catch (err) {
    console.error("Logout session cleanup failed:", err instanceof Error ? err.message : "Unknown error");
  }

  clearSessionCookie(res);
  return res.json({ ok: true });
});

// Protected trip routes (authenticated user & ownership enforced)
app.get("/api/trips", requireAuth, async (req: AuthRequest, res) => {
  if (!isDatabaseConfigured()) {
    return res.status(503).json({
      error: "Database is not configured. Please add DATABASE_URL in Settings > Secrets.",
    });
  }

  try {
    const trips = await prisma.trip.findMany({
      where: { userId: req.authUser!.id },
      orderBy: { createdAt: "desc" },
    });
    return res.json({ trips: trips.map(serializeTrip) });
  } catch (err) {
    console.error("Failed to list trips:", err instanceof Error ? err.message : "Unknown error");
    return res.status(500).json({ error: "Unable to load saved trips right now." });
  }
});

app.get("/api/trips/:id", requireAuth, async (req: AuthRequest, res) => {
  if (!isDatabaseConfigured()) {
    return res.status(503).json({
      error: "Database is not configured. Please add DATABASE_URL in Settings > Secrets.",
    });
  }

  const id = req.params.id?.trim();
  if (!id || id.length > 64 || !/^[a-zA-Z0-9_-]+$/.test(id)) {
    return res.status(400).json({ error: "Invalid trip identifier." });
  }

  try {
    const trip = await prisma.trip.findUnique({ where: { id } });
    if (!trip) {
      return res.status(404).json({ error: "Trip not found." });
    }
    if (trip.userId !== req.authUser!.id) {
      return res.status(403).json({ error: "You do not have permission to view this trip." });
    }
    return res.json({ trip: serializeTrip(trip) });
  } catch (err) {
    console.error("Failed to fetch trip:", err instanceof Error ? err.message : "Unknown error");
    return res.status(500).json({ error: "Unable to load this trip." });
  }
});

app.delete("/api/trips/:id", requireAuth, async (req: AuthRequest, res) => {
  if (!isDatabaseConfigured()) {
    return res.status(503).json({
      error: "Database is not configured. Please add DATABASE_URL in Settings > Secrets.",
    });
  }

  const id = req.params.id?.trim();
  if (!id || id.length > 64 || !/^[a-zA-Z0-9_-]+$/.test(id)) {
    return res.status(400).json({ error: "Invalid trip identifier." });
  }

  try {
    const trip = await prisma.trip.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });
    if (!trip) {
      return res.status(404).json({ error: "Trip not found." });
    }
    if (trip.userId !== req.authUser!.id) {
      return res.status(403).json({ error: "You do not have permission to delete this trip." });
    }

    await prisma.trip.delete({ where: { id } });
    return res.json({ deleted: true });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return res.status(404).json({ error: "Trip not found." });
    }
    console.error("Failed to delete trip:", err instanceof Error ? err.message : "Unknown error");
    return res.status(500).json({ error: "Unable to delete this trip." });
  }
});

app.post("/api/trips/generate", requireAuth, async (req: AuthRequest, res) => {
  if (!isDatabaseConfigured()) {
    return res.status(503).json({
      error: "Database is not configured. Please add DATABASE_URL in Settings > Secrets.",
    });
  }

  const validation = validateCreateTripInput(req.body);
  if (!validation.ok) {
    return res.status(400).json({ error: validation.message });
  }

  if (!process.env.GEMINI_API_KEY?.trim()) {
    return res.status(503).json({
      error: "GEMINI_API_KEY is not configured. Please add it in Settings > Secrets.",
    });
  }

  const input = validation.data;
  const userId = req.authUser!.id;
  const runAsync = req.query.async === "1" || req.query.async === "true";
  let tripId: string | null = null;

  try {
    // 1. Save trip to PostgreSQL linked to the logged-in user
    const created = await prisma.trip.create({
      data: {
        userId,
        destination: input.destination,
        startDate: new Date(`${input.startDate}T00:00:00Z`),
        endDate: new Date(`${input.endDate}T00:00:00Z`),
        travelers: input.travelers,
        budgetLevel: input.budgetLevel,
        interests: input.interests,
        travelPace: input.travelPace,
        status: "generating",
        itinerary: Prisma.JsonNull,
      },
    });
    tripId = created.id;

    const executeGeneration = async () => {
      const itinerary = await generateTripItinerary(input);
      return prisma.trip.update({
        where: { id: created.id },
        data: {
          itinerary: itinerary as unknown as Prisma.InputJsonValue,
          status: "ready",
          errorMessage: null,
        },
      });
    };

    if (runAsync) {
      void executeGeneration().catch(async (err) => {
        const detail = extractReadableErrorDetail(err);
        const friendlyMessage = sanitizeErrorMessage(err);
        console.error("Async trip generation error:", {
          tripId: created.id,
          status: detail.status,
          code: detail.code,
          message: detail.message,
        });
        try {
          await prisma.trip.update({
            where: { id: created.id },
            data: {
              status: "failed",
              errorMessage: friendlyMessage,
            },
          });
        } catch {
          // Ignore follow-up DB update failure
        }
      });

      return res.status(202).json({ trip: serializeTrip(created) });
    }

    // 2-5. Synchronous path: generate, save JSONB + status "ready", and return
    const updated = await executeGeneration();
    return res.status(201).json({ trip: serializeTrip(updated) });
  } catch (err) {
    const detail = extractReadableErrorDetail(err);
    const friendlyMessage = sanitizeErrorMessage(err);
    console.error("Trip generation error:", {
      tripId,
      status: detail.status,
      code: detail.code,
      message: detail.message,
    });

    if (tripId) {
      try {
        const failed = await prisma.trip.update({
          where: { id: tripId },
          data: {
            status: "failed",
            errorMessage: friendlyMessage,
          },
        });
        return res.status(502).json({
          error: friendlyMessage,
          trip: serializeTrip(failed),
        });
      } catch {
        // Ignore follow-up DB update failure
      }
    }

    return res.status(500).json({ error: friendlyMessage });
  }
});

async function startServer() {
  try {
    await ensureDatabaseSchema();
  } catch (err) {
    console.error("Database schema bootstrap error:", err instanceof Error ? err.message : "Unknown error");
  }

  // Ensure unknown /api/* routes always return JSON rather than falling through to SPA HTML
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "API endpoint not found." });
  });

  // Express JSON error fallback
  app.use(
    (
      err: unknown,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      if (req.path.startsWith("/api")) {
        if (err instanceof SyntaxError && "status" in err && (err as { status?: number }).status === 400) {
          return res.status(400).json({ error: "Invalid JSON request body." });
        }
        const detail = extractReadableErrorDetail(err);
        console.error("Unhandled API error:", detail.message);
        return res.status(500).json({ error: detail.message || "Unexpected server error. Please try again." });
      }
      return next(err);
    }
  );

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve("dist");
    app.use(express.static(distDir));
    app.get("/{*splat}", (req, res, next) => {
      if (req.path.startsWith("/api/")) {
        return next();
      }
      return res.sendFile(path.join(distDir, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Planora server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err instanceof Error ? err.message : "Unknown error");
  process.exit(1);
});
