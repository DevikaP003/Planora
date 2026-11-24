import { GoogleGenAI, Type } from "@google/genai";
import type { CreateTripInput, TripItinerary } from "../src/types/trip";

function buildDateList(startDateIso: string, endDateIso: string): string[] {
  const start = new Date(`${startDateIso}T00:00:00Z`);
  const end = new Date(`${endDateIso}T00:00:00Z`);
  const dates: string[] = [];
  const cursor = new Date(start);

  while (cursor <= end && dates.length < 14) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

const activitySchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "Short, specific name of the activity or stop." },
    description: {
      type: Type.STRING,
      description: "1 crisp, practical sentence (max 22 words) explaining what to do, eat, or see.",
    },
    timeWindow: { type: Type.STRING, description: "e.g., 9:00 AM – 12:00 PM" },
    location: { type: Type.STRING, description: "Neighborhood, district, or primary venue name." },
    places: {
      type: Type.ARRAY,
      description:
        "List of ALL specific named landmarks, attractions, cafes, restaurants, parks, or viewpoints visited in this time block.",
      items: { type: Type.STRING },
    },
    estimatedCost: {
      type: Type.NUMBER,
      description: "Estimated cost in Indian Rupees (INR) for all travelers combined for this slot.",
    },
  },
  required: ["title", "description", "timeWindow", "location", "places", "estimatedCost"],
};

const dayBreakdownSchema = {
  type: Type.OBJECT,
  properties: {
    accommodationInr: {
      type: Type.NUMBER,
      description: "Estimated accommodation/lodging cost in INR for all travelers for this day/night (0 on final departure day if no stay).",
    },
    foodInr: {
      type: Type.NUMBER,
      description: "Estimated meals, cafes, snacks, and drinks cost in INR for all travelers for this day.",
    },
    transportInr: {
      type: Type.NUMBER,
      description: "Estimated local transport (trains, metro, cabs, auto, ferries, buses) cost in INR for all travelers for this day.",
    },
    activitiesInr: {
      type: Type.NUMBER,
      description: "Estimated attraction tickets, tours, museums, and experiences cost in INR for all travelers for this day.",
    },
  },
  required: ["accommodationInr", "foodInr", "transportInr", "activitiesInr"],
};

const itinerarySchema = {
  type: Type.OBJECT,
  properties: {
    tripTitle: {
      type: Type.STRING,
      description: "A vibrant, memorable 4-7 word title for the trip.",
    },
    tripSummary: {
      type: Type.STRING,
      description: "1 crisp sentence summarizing the trip highlights.",
    },
    isInternational: {
      type: Type.BOOLEAN,
      description: "False for trips within India; true for trips outside India.",
    },
    localCurrency: {
      type: Type.STRING,
      description:
        "Three-letter ISO code of the destination's local currency (e.g., INR for India, EUR for France/Portugal/Italy, JPY for Japan, IDR for Bali, THB for Thailand, GBP for UK, USD for USA, AED for UAE).",
    },
    exchangeRateToInr: {
      type: Type.NUMBER,
      description:
        "Approximate INR value of 1 unit of localCurrency (1 for INR; e.g., ~91 for EUR, ~84 for USD, ~0.56 for JPY, ~0.0054 for IDR).",
    },
    packingChecklist: {
      type: Type.ARRAY,
      description: "3-4 grouped packing categories tailored to destination season and activities.",
      items: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING },
          items: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ["category", "items"],
      },
    },
    travelTips: {
      type: Type.ARRAY,
      description: "5 concise, practical, destination-specific tips for transit, money, etiquette, or timing.",
      items: { type: Type.STRING },
    },
    days: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          dayNumber: { type: Type.INTEGER },
          date: { type: Type.STRING, description: "Exact YYYY-MM-DD date for this day." },
          title: { type: Type.STRING, description: "Short playful title for the day." },
          summary: {
            type: Type.STRING,
            description: "1 short sentence summarizing the day's route.",
          },
          morning: activitySchema,
          afternoon: activitySchema,
          evening: activitySchema,
          costBreakdown: dayBreakdownSchema,
          estimatedCost: {
            type: Type.NUMBER,
            description:
              "Total estimated cost in INR for this day for all travelers (sum of accommodationInr + foodInr + transportInr + activitiesInr).",
          },
        },
        required: [
          "dayNumber",
          "date",
          "title",
          "summary",
          "morning",
          "afternoon",
          "evening",
          "costBreakdown",
          "estimatedCost",
        ],
      },
    },
  },
  required: [
    "tripTitle",
    "tripSummary",
    "isInternational",
    "localCurrency",
    "exchangeRateToInr",
    "packingChecklist",
    "travelTips",
    "days",
  ],
};

interface GeminiItineraryPayload {
  tripTitle?: string;
  tripSummary?: string;
  overview?: string;
  isInternational?: boolean;
  localCurrency?: string;
  exchangeRateToInr?: number;
  packingChecklist?: Array<{ category: string; items: string[] }>;
  travelTips?: string[];
  days: Array<{
    dayNumber: number;
    date: string;
    title: string;
    dayTitle?: string;
    summary: string;
    morning: {
      title: string;
      description: string;
      timeWindow: string;
      location: string;
      places?: string[];
      estimatedCost: number;
    };
    afternoon: {
      title: string;
      description: string;
      timeWindow: string;
      location: string;
      places?: string[];
      estimatedCost: number;
    };
    evening: {
      title: string;
      description: string;
      timeWindow: string;
      location: string;
      places?: string[];
      estimatedCost: number;
    };
    costBreakdown?: {
      accommodationInr?: number;
      foodInr?: number;
      transportInr?: number;
      activitiesInr?: number;
    };
    estimatedCost: number;
  }>;
}

function formatRateLabel(rate: number): string {
  if (rate >= 10) return rate.toFixed(1).replace(/\.0$/, "");
  if (rate >= 1) return rate.toFixed(2).replace(/0$/, "").replace(/\.$/, "");
  return rate.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
}

function extractJsonText(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenceMatch && fenceMatch[1]) {
    return fenceMatch[1].trim();
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

function normalizePlaces(rawPlaces: unknown, fallbackLocation: string): string[] {
  if (!Array.isArray(rawPlaces)) {
    return fallbackLocation ? [fallbackLocation] : [];
  }
  const cleaned = rawPlaces
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  if (cleaned.length > 0) return cleaned;
  return fallbackLocation ? [fallbackLocation] : [];
}

function isRetryableGeminiError(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  if (status === 429 || status === 500 || status === 502 || status === 503 || status === 504) {
    return true;
  }
  const msg = err instanceof Error ? err.message : String(err);
  return /ECONNRESET|ETIMEDOUT|ENOTFOUND|fetch failed|503|UNAVAILABLE|RESOURCE_EXHAUSTED/i.test(
    msg
  );
}

export async function generateTripItinerary(input: CreateTripInput): Promise<TripItinerary> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured. Please add it in Settings > Secrets.");
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  const dateList = buildDateList(input.startDate, input.endDate);
  const interestsLabel =
    input.interests.length > 0 ? input.interests.join(", ") : "local culture, food, and sightseeing";

  const prompt = [
    `Create a complete, authentic day-by-day travel itinerary for ${input.destination}.`,
    `Trip dates (${dateList.length} days total): ${dateList.join(", ")}.`,
    `Travelers: ${input.travelers} ${input.travelers === 1 ? "person" : "people"}.`,
    `Budget level: ${input.budgetLevel}.`,
    `Travel pace: ${input.travelPace}.`,
    `Interests: ${interestsLabel}.`,
    "",
    "Requirements:",
    `- Generate ALL ${dateList.length} day objects in the 'days' array matching the exact dates above in chronological order (dayNumber 1 through ${dateList.length}).`,
    "- Planora supports destinations across ALL of India (cities, states, circuits, hill stations, heritage towns, beaches, Northeast, Himalayas, islands) as well as all international destinations worldwide.",
    "- If the destination is a region, state, or country (e.g., Rajasthan, Kerala, Ladakh, Northeast India, Japan, Italy), design a geographically logical multi-stop route with realistic transit flow so travelers never zig-zag.",
    "- Tailor activity density to the requested travel pace (relaxed = unhurried, 1-2 anchor stops per block; balanced = steady mix; packed = energetic full schedule).",
    "- Estimate ALL costs in Indian Rupees (INR) for ALL travelers combined, scaled realistically for the budget level (do NOT include intercity/international flight tickets in these estimates).",
    "- Set isInternational=false and localCurrency='INR' (exchangeRateToInr=1) for trips inside India. Set isInternational=true, the destination's 3-letter localCurrency (e.g., EUR, JPY, THB, GBP, USD, IDR, AED), and an approximate reference exchangeRateToInr for trips outside India.",
    "- For each day, populate costBreakdown with realistic INR estimates for accommodationInr, foodInr, transportInr, and activitiesInr, and set day.estimatedCost to their sum. Also estimate each morning/afternoon/evening slot cost in INR.",
    "- Include 2-4 specific named places (landmarks, temples/forts/museums, viewpoints, neighborhoods, markets, authentic local cafes, and restaurants) in the `places` array for morning, afternoon, and evening, plus clear time windows, neighborhood locations, and 1 crisp practical sentence per slot.",
    "- Provide a practical packingChecklist grouped by category (e.g., Clothing, Essentials, Documents & Tech) and 5 destination-specific travelTips (covering local transit, payments/UPI or cards/cash, timing, and etiquette).",
  ].join("\n");

  let response;
  let lastError: unknown;
  const modelName = "gemini-3.1-flash-lite";

  for (let attempt = 0; attempt < 2; attempt++) {
    const startedAt = Date.now();
    try {
      response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          systemInstruction:
            "You are Planora, a knowledgeable travel curator covering all regions of India and international destinations worldwide. Output crisp, accurate, geographically coherent travel itineraries strictly following the JSON schema with all costs estimated in Indian Rupees (INR) excluding flights.",
          responseMimeType: "application/json",
          responseSchema: itinerarySchema,
        },
      });
      console.log(`[gemini] ${modelName} succeeded in ${Date.now() - startedAt}ms (attempt ${attempt + 1})`);
      lastError = undefined;
      break;
    } catch (err) {
      const elapsed = Date.now() - startedAt;
      console.warn(`[gemini] ${modelName} failed in ${elapsed}ms (attempt ${attempt + 1})`);
      lastError = err;
      if (attempt === 0 && isRetryableGeminiError(err)) {
        await new Promise((resolve) => setTimeout(resolve, 900));
        continue;
      }
      throw err;
    }
  }

  if (lastError) {
    throw lastError;
  }

  const rawText = extractJsonText(response?.text ?? "");
  if (!rawText) {
    throw new Error("Gemini returned an empty response. Please try generating again.");
  }

  let parsed: GeminiItineraryPayload;
  try {
    parsed = JSON.parse(rawText) as GeminiItineraryPayload;
  } catch (parseErr) {
    const parseDetail = parseErr instanceof Error ? parseErr.message : "Invalid JSON syntax";
    throw new Error(`Received malformed itinerary JSON from AI (${parseDetail}). Please try again.`);
  }

  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.days) || parsed.days.length === 0) {
    throw new Error("Generated itinerary did not contain daily plans. Please try again.");
  }

  const rawLocalCurrency = parsed.localCurrency?.trim().toUpperCase() || "INR";
  const localCurrency = /^[A-Z]{3}$/.test(rawLocalCurrency) ? rawLocalCurrency : "INR";
  const isInternational = Boolean(parsed.isInternational) && localCurrency !== "INR";
  const rawRate = Number(parsed.exchangeRateToInr);
  const exchangeRateToInr = isInternational
    ? Number.isFinite(rawRate) && rawRate > 0
      ? rawRate
      : 84
    : 1;

  const toLocal = (inrAmount: number): number | undefined => {
    if (!isInternational) return undefined;
    if (inrAmount <= 0) return 0;
    return Math.max(1, Math.round(inrAmount / exchangeRateToInr));
  };

  const normalizedDays = parsed.days.map((day, idx) => {
    const morningCost = Math.max(0, Math.round(Number(day.morning?.estimatedCost) || 0));
    const afternoonCost = Math.max(0, Math.round(Number(day.afternoon?.estimatedCost) || 0));
    const eveningCost = Math.max(0, Math.round(Number(day.evening?.estimatedCost) || 0));

    const accommodationInr = Math.max(0, Math.round(Number(day.costBreakdown?.accommodationInr) || 0));
    const foodInr = Math.max(0, Math.round(Number(day.costBreakdown?.foodInr) || 0));
    const transportInr = Math.max(0, Math.round(Number(day.costBreakdown?.transportInr) || 0));
    let activitiesInr = Math.max(0, Math.round(Number(day.costBreakdown?.activitiesInr) || 0));

    const slotsSum = morningCost + afternoonCost + eveningCost;
    if (accommodationInr + foodInr + transportInr + activitiesInr === 0) {
      activitiesInr = Math.max(slotsSum, Math.round(Number(day.estimatedCost) || 0));
    }

    const dayCost = accommodationInr + foodInr + transportInr + activitiesInr;

    const morningLocation = day.morning?.location?.trim() || input.destination;
    const afternoonLocation = day.afternoon?.location?.trim() || input.destination;
    const eveningLocation = day.evening?.location?.trim() || input.destination;

    return {
      dayNumber: idx + 1,
      date: dateList[idx] ?? day.date,
      title: day.title?.trim() || day.dayTitle?.trim() || `Day ${idx + 1} in ${input.destination}`,
      summary: day.summary?.trim() || "",
      morning: {
        title: day.morning?.title?.trim() || "Morning exploration",
        description: day.morning?.description?.trim() || "",
        timeWindow: day.morning?.timeWindow?.trim() || "9:00 AM – 12:00 PM",
        location: morningLocation,
        places: normalizePlaces(day.morning?.places, morningLocation),
        estimatedCost: morningCost,
        ...(isInternational ? { localEstimatedCost: toLocal(morningCost) } : {}),
      },
      afternoon: {
        title: day.afternoon?.title?.trim() || "Afternoon discovery",
        description: day.afternoon?.description?.trim() || "",
        timeWindow: day.afternoon?.timeWindow?.trim() || "1:30 PM – 5:00 PM",
        location: afternoonLocation,
        places: normalizePlaces(day.afternoon?.places, afternoonLocation),
        estimatedCost: afternoonCost,
        ...(isInternational ? { localEstimatedCost: toLocal(afternoonCost) } : {}),
      },
      evening: {
        title: day.evening?.title?.trim() || "Evening dining & stroll",
        description: day.evening?.description?.trim() || "",
        timeWindow: day.evening?.timeWindow?.trim() || "6:30 PM – 9:30 PM",
        location: eveningLocation,
        places: normalizePlaces(day.evening?.places, eveningLocation),
        estimatedCost: eveningCost,
        ...(isInternational ? { localEstimatedCost: toLocal(eveningCost) } : {}),
      },
      costBreakdown: {
        accommodationInr,
        foodInr,
        transportInr,
        activitiesInr,
        ...(isInternational
          ? {
              accommodationLocal: toLocal(accommodationInr),
              foodLocal: toLocal(foodInr),
              transportLocal: toLocal(transportInr),
              activitiesLocal: toLocal(activitiesInr),
            }
          : {}),
      },
      estimatedCost: dayCost,
      ...(isInternational ? { localEstimatedCost: toLocal(dayCost) } : {}),
    };
  });

  const totalAccommodationInr = normalizedDays.reduce(
    (sum, d) => sum + (d.costBreakdown?.accommodationInr || 0),
    0
  );
  const totalFoodInr = normalizedDays.reduce((sum, d) => sum + (d.costBreakdown?.foodInr || 0), 0);
  const totalTransportInr = normalizedDays.reduce(
    (sum, d) => sum + (d.costBreakdown?.transportInr || 0),
    0
  );
  const totalActivitiesInr = normalizedDays.reduce(
    (sum, d) => sum + (d.costBreakdown?.activitiesInr || 0),
    0
  );

  const daysSumInr = normalizedDays.reduce((acc, d) => acc + d.estimatedCost, 0);
  const categoriesSumInr =
    totalAccommodationInr + totalFoodInr + totalTransportInr + totalActivitiesInr;
  const totalInr = Math.max(daysSumInr, categoriesSumInr);
  const perPersonInr = Math.max(1, Math.round(totalInr / Math.max(1, input.travelers)));

  const packingChecklist = Array.isArray(parsed.packingChecklist)
    ? parsed.packingChecklist
        .filter((group) => group && typeof group.category === "string" && Array.isArray(group.items))
        .map((group) => ({
          category: group.category.trim(),
          items: group.items
            .filter((item): item is string => typeof item === "string")
            .map((item) => item.trim())
            .filter(Boolean),
        }))
        .filter((group) => group.category.length > 0 && group.items.length > 0)
    : [];

  const travelTips = Array.isArray(parsed.travelTips)
    ? parsed.travelTips
        .filter((tip): tip is string => typeof tip === "string")
        .map((tip) => tip.trim())
        .filter(Boolean)
    : [];

  const exchangeRateNote = isInternational
    ? `Approximate conversion: 1 ${localCurrency} ≈ ₹${formatRateLabel(exchangeRateToInr)} (estimated reference rate, not live).`
    : "Estimated directly in Indian Rupees (INR).";

  return {
    tripTitle: parsed.tripTitle?.trim() || `${input.destination} Getaway`,
    tripSummary: parsed.tripSummary?.trim() || parsed.overview?.trim() || "",
    currency: "INR",
    totalEstimatedCost: totalInr,
    budget: {
      isInternational,
      localCurrency,
      exchangeRateToInr,
      exchangeRateNote,
      includesFlights: false,
      flightsNote:
        "Flights are not included. Covers estimated accommodation, food, local transport, and activities.",
      totalInr,
      ...(isInternational ? { totalLocal: toLocal(totalInr) } : {}),
      perPersonInr,
      ...(isInternational ? { perPersonLocal: toLocal(perPersonInr) } : {}),
      categories: {
        accommodationInr: totalAccommodationInr,
        foodInr: totalFoodInr,
        transportInr: totalTransportInr,
        activitiesInr: totalActivitiesInr,
        ...(isInternational
          ? {
              accommodationLocal: toLocal(totalAccommodationInr),
              foodLocal: toLocal(totalFoodInr),
              transportLocal: toLocal(totalTransportInr),
              activitiesLocal: toLocal(totalActivitiesInr),
            }
          : {}),
      },
    },
    packingChecklist,
    travelTips,
    days: normalizedDays,
  };
}
