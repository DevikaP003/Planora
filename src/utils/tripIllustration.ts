import type { TripRecord } from "../types/trip";

export const MINI_CARD_ILLUSTRATIONS = {
  coastal: {
    src: "/src/assets/images/sunset_mini_coastal_1795500841123.jpg",
    alt: "Tiny whimsical sailboat and palm tree under a sunset",
  },
  heritage: {
    src: "/src/assets/images/sunset_mini_heritage_1795500840607.jpg",
    alt: "Tiny whimsical heritage palace archway and birds",
  },
  mountains: {
    src: "/src/assets/images/sunset_mini_mountain_1795500841244.jpg",
    alt: "Tiny whimsical mountain peaks with pine tree and paper airplane",
  },
  cityscape: {
    src: "/src/assets/images/sunset_mini_city_1795500842396.jpg",
    alt: "Tiny whimsical scooter beside a glowing paper lantern",
  },
} as const;

export function pickTripIllustration(trip: TripRecord): { src: string; alt: string } {
  const haystack = `${trip.destination} ${trip.interests.join(" ")} ${trip.itinerary?.tripTitle || ""}`.toLowerCase();

  if (/\b(beach|beaches|coast|island|goa|bali|kerala|andaman|maldives|phuket|greece|amalfi|hawaii|sea)\b/.test(haystack)) {
    return MINI_CARD_ILLUSTRATIONS.coastal;
  }
  if (/\b(mountain|hill|valley|trek|hiking|ladakh|manali|shimla|darjeeling|kashmir|munnar|coorg|alps|swiss|nepal|nature)\b/.test(haystack)) {
    return MINI_CARD_ILLUSTRATIONS.mountains;
  }
  if (/\b(heritage|history|fort|palace|temple|jaipur|udaipur|jodhpur|agra|varanasi|hampi|kyoto|rome|cairo|athens|museums)\b/.test(haystack)) {
    return MINI_CARD_ILLUSTRATIONS.heritage;
  }
  if (/\b(cafe|cafes|food|market|markets|nightlife|tokyo|lisbon|paris|london|singapore|bangkok|mumbai|delhi|bengaluru)\b/.test(haystack)) {
    return MINI_CARD_ILLUSTRATIONS.cityscape;
  }

  const variants = [
    MINI_CARD_ILLUSTRATIONS.cityscape,
    MINI_CARD_ILLUSTRATIONS.coastal,
    MINI_CARD_ILLUSTRATIONS.heritage,
    MINI_CARD_ILLUSTRATIONS.mountains,
  ];
  let hash = 0;
  for (let i = 0; i < trip.id.length; i++) {
    hash = (hash * 31 + trip.id.charCodeAt(i)) >>> 0;
  }
  return variants[hash % variants.length];
}
