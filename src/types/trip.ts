export type BudgetLevel = "budget" | "moderate" | "luxury";
export type TravelPace = "relaxed" | "balanced" | "packed";
export type TripStatus = "generating" | "ready" | "failed";

export interface ActivitySlot {
  title: string;
  description: string;
  timeWindow: string;
  location: string;
  places?: string[];
  estimatedCost: number;
  localEstimatedCost?: number;
}

export interface DayCostBreakdown {
  accommodationInr: number;
  foodInr: number;
  transportInr: number;
  activitiesInr: number;
  accommodationLocal?: number;
  foodLocal?: number;
  transportLocal?: number;
  activitiesLocal?: number;
}

export interface ItineraryDay {
  dayNumber: number;
  date: string;
  title: string;
  dayTitle?: string;
  summary: string;
  morning: ActivitySlot;
  afternoon: ActivitySlot;
  evening: ActivitySlot;
  estimatedCost: number;
  localEstimatedCost?: number;
  costBreakdown?: DayCostBreakdown;
}

export interface PackingCategory {
  category: string;
  items: string[];
}

export interface TripBudgetDetails {
  isInternational: boolean;
  localCurrency: string;
  exchangeRateToInr: number;
  exchangeRateNote: string;
  includesFlights: boolean;
  flightsNote: string;
  totalInr: number;
  totalLocal?: number;
  perPersonInr: number;
  perPersonLocal?: number;
  categories: DayCostBreakdown;
}

export interface TripItinerary {
  tripTitle?: string;
  tripSummary: string;
  overview?: string;
  currency?: string;
  totalEstimatedCost: number;
  budget?: TripBudgetDetails;
  packingChecklist: PackingCategory[];
  travelTips: string[];
  days: ItineraryDay[];
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface TripRecord {
  id: string;
  userId?: string | null;
  destination: string;
  startDate: string;
  endDate: string;
  travelers: number;
  budgetLevel: BudgetLevel;
  interests: string[];
  travelPace: TravelPace;
  status: TripStatus;
  itinerary: TripItinerary | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTripInput {
  destination: string;
  startDate: string;
  endDate: string;
  travelers: number;
  budgetLevel: BudgetLevel;
  interests: string[];
  travelPace: TravelPace;
}
