import crypto from "node:crypto";
import { promisify } from "node:util";
import type { NextFunction, Request, Response } from "express";
import { prisma } from "./prisma";

const scryptAsync = promisify(crypto.scrypt);

export const SESSION_COOKIE_NAME = "planora_session";
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
const SCRYPT_KEYLEN = 64;

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface AuthRequest extends Request {
  authUser?: AuthenticatedUser;
  sessionTokenHash?: string;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, SCRYPT_KEYLEN)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split(":");
  if (parts.length !== 2) return false;
  const [salt, expectedHex] = parts;
  if (!salt || !expectedHex || !/^[0-9a-f]+$/i.test(expectedHex)) return false;

  const expectedBuffer = Buffer.from(expectedHex, "hex");
  const derived = (await scryptAsync(password, salt, expectedBuffer.length)) as Buffer;
  if (derived.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(derived, expectedBuffer);
}

export function hashSessionToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie;
  if (!header || typeof header !== "string") return {};

  const out: Record<string, string> = {};
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const rawVal = part.slice(idx + 1).trim();
    if (!key) continue;
    try {
      out[key] = decodeURIComponent(rawVal);
    } catch {
      out[key] = rawVal;
    }
  }
  return out;
}

export function setSessionCookie(res: Response, rawToken: string): void {
  const cookieParts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(rawToken)}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=None",
    "Partitioned",
    `Max-Age=${SESSION_TTL_SECONDS}`,
  ];
  res.setHeader("Set-Cookie", cookieParts.join("; "));
}

export function clearSessionCookie(res: Response): void {
  const cookieParts = [
    `${SESSION_COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=None",
    "Partitioned",
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
  ];
  res.setHeader("Set-Cookie", cookieParts.join("; "));
}

export async function createUserSession(userId: string): Promise<string> {
  const rawToken = generateSessionToken();
  const tokenHash = hashSessionToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return rawToken;
}

export async function revokeSessionByToken(rawToken: string | undefined): Promise<void> {
  if (!rawToken) return;
  const tokenHash = hashSessionToken(rawToken);
  await prisma.session.deleteMany({
    where: { tokenHash },
  });
}

export function isValidCsrfRequest(req: Request): boolean {
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return true;
  }

  const originHeader = req.headers.origin;
  const forwardedHost = req.headers["x-forwarded-host"];
  const expectedHost = (
    Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost || req.headers.host || ""
  )
    .split(",")[0]
    .trim()
    .toLowerCase();

  if (originHeader && expectedHost) {
    try {
      const originHost = new URL(originHeader).host.toLowerCase();
      if (originHost !== expectedHost) {
        return false;
      }
    } catch {
      return false;
    }
  }

  const hasRequestedWith = Boolean(req.headers["x-requested-with"]);
  const hasMatchingOrigin = Boolean(originHeader && expectedHost);
  return hasRequestedWith || hasMatchingOrigin;
}

export async function resolveAuthenticatedSession(
  req: Request
): Promise<{ user: AuthenticatedUser; tokenHash: string } | null> {
  const cookies = parseCookies(req);
  const rawToken = cookies[SESSION_COOKIE_NAME];
  if (!rawToken || rawToken.length < 16) return null;

  const tokenHash = hashSessionToken(rawToken);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
        },
      },
    },
  });

  if (!session) return null;

  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return {
    tokenHash,
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      createdAt: session.user.createdAt.toISOString(),
    },
  };
}

export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!isValidCsrfRequest(req)) {
    res.status(403).json({ error: "Cross-origin request blocked." });
    return;
  }

  try {
    const resolved = await resolveAuthenticatedSession(req);
    if (!resolved) {
      res.status(401).json({ error: "Please log in to continue." });
      return;
    }
    req.authUser = resolved.user;
    req.sessionTokenHash = resolved.tokenHash;
    next();
  } catch (err) {
    console.error("Session verification error:", err instanceof Error ? err.message : "Unknown error");
    res.status(500).json({ error: "Unable to verify session right now." });
  }
}
