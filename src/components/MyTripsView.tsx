import { useMemo, useState } from "react";
import { ArrowRight, Compass, Search, Trash2 } from "lucide-react";
import type { AuthUser, TripRecord } from "../types/trip";
import { formatCostPair, formatCurrency } from "../utils/currency";
import { pickTripIllustration } from "../utils/tripIllustration";

interface MyTripsViewProps {
  trips: TripRecord[];
  currentUser: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  onOpenTrip: (trip: TripRecord) => void;
  onDeleteTrip: (id: string) => Promise<void>;
  onPlanNew: () => void;
  onOpenAuth: (mode: "login" | "signup") => void;
}

function formatDateRange(start: string, end: string): string {
  const s = new Date(`${start}T00:00:00Z`);
  const e = new Date(`${end}T00:00:00Z`);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) {
    return `${start} – ${end}`;
  }
  const sText = s.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const eText = e.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  return `${sText} – ${eText}`;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function MyTripsView({
  trips,
  currentUser,
  isLoading,
  error,
  onOpenTrip,
  onDeleteTrip,
  onPlanNew,
  onOpenAuth,
}: MyTripsViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "ready" | "generating">("all");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [emptyImgFailed, setEmptyImgFailed] = useState(false);
  const [headerImgFailed, setHeaderImgFailed] = useState(false);
  const [cardImgFailed, setCardImgFailed] = useState<Record<string, boolean>>({});

  const filteredTrips = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return trips.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (!q) return true;
      const title = t.itinerary?.tripTitle?.toLowerCase() ?? "";
      return (
        t.destination.toLowerCase().includes(q) ||
        title.includes(q) ||
        t.interests.some((i) => i.toLowerCase().includes(q))
      );
    });
  }, [trips, searchQuery, statusFilter]);

  async function handleConfirmDelete(id: string) {
    setDeletingId(id);
    try {
      await onDeleteTrip(id);
      setConfirmDeleteId(null);
    } finally {
      setDeletingId(null);
    }
  }

  if (!currentUser) {
    return (
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="bg-[#FFFCF7] border border-[#EADACC] rounded-3xl p-8 sm:p-12 text-center max-w-lg mx-auto space-y-5">
          {!emptyImgFailed ? (
            <img
              src="/src/assets/images/sunset_empty_luggage_1795500199721.jpg"
              alt="Small sunny suitcase with map, camera, and palm frond"
              referrerPolicy="no-referrer"
              onError={() => setEmptyImgFailed(true)}
              className="w-28 h-28 mx-auto rounded-2xl object-cover border border-[#EADACC]"
            />
          ) : (
            <div className="w-16 h-16 mx-auto rounded-2xl bg-[#FFF0EB] flex items-center justify-center">
              <Compass className="w-7 h-7 text-[#F4775B]" />
            </div>
          )}

          <div className="space-y-1.5">
            <h1 className="font-heading text-2xl font-bold text-[#3B2723]">
              Log in to see your saved trips
            </h1>
            <p className="text-sm text-[#6E524B] max-w-sm mx-auto">
              Your itineraries are private to your account. Log in or create a free account to view and manage your trips.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => onOpenAuth("login")}
              className="px-5 py-2.5 rounded-xl bg-[#A94D67] hover:bg-[#913E55] text-sm font-heading font-semibold text-white transition-colors cursor-pointer"
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => onOpenAuth("signup")}
              className="px-5 py-2.5 rounded-xl border border-[#EADACC] bg-[#FFF5E8] hover:border-[#F4775B] text-sm font-heading font-semibold text-[#3B2723] transition-colors cursor-pointer"
            >
              Create Account
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
        <div className="flex items-center gap-3.5">
          {!headerImgFailed ? (
            <img
              src="/src/assets/images/sunset_globe_plane_1795500199385.jpg"
              alt="Tiny globe with soaring paper airplane"
              referrerPolicy="no-referrer"
              onError={() => setHeaderImgFailed(true)}
              className="w-12 h-12 rounded-xl object-cover border border-[#EADACC] bg-[#FFF5E8] shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-[#FFF0EB] border border-[#EADACC] flex items-center justify-center shrink-0">
              <Compass className="w-5 h-5 text-[#F4775B]" />
            </div>
          )}
          <div className="space-y-0.5">
            <h1 className="font-heading text-3xl font-extrabold tracking-tight text-[#3B2723]">
              My Trips
            </h1>
            <p className="text-sm text-[#6E524B]">
              Pick a saved trip to open its schedule, budget, and packing list.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search
              className="w-4 h-4 text-[#9C8179] absolute left-3.5 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search trips..."
              aria-label="Search saved trips"
              className="pl-9 pr-4 py-2 rounded-xl border border-[#EADACC] bg-[#FFFCF7] text-sm text-[#3B2723] placeholder:text-[#9C8179] focus:border-[#F4775B] focus:outline-none w-48 sm:w-56"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-[#F9EBDC] border border-[#EADACC] rounded-xl">
            {(["all", "ready", "generating"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  statusFilter === tab
                    ? "bg-[#FFFCF7] text-[#3B2723] shadow-sm"
                    : "text-[#6E524B] hover:text-[#3B2723]"
                }`}
              >
                {capitalize(tab)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-2xl bg-[#FEF2F2] border border-[#FECACA] px-5 py-4 text-sm text-[#B91C1C]"
        >
          {error}
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-[#FFFCF7] border border-[#EADACC] rounded-2xl p-5 space-y-4 animate-pulse"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#F9EBDC] shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-[#F9EBDC] rounded-lg w-3/4" />
                  <div className="h-3 bg-[#F9EBDC] rounded-lg w-1/2" />
                </div>
              </div>
              <div className="h-9 bg-[#F9EBDC] rounded-xl w-full" />
            </div>
          ))}
        </div>
      ) : filteredTrips.length === 0 ? (
        /* Empty State */
        <div className="bg-[#FFFCF7] border border-[#EADACC] rounded-3xl p-8 sm:p-12 text-center max-w-lg mx-auto space-y-4">
          {!emptyImgFailed ? (
            <img
              src="/src/assets/images/sunset_empty_luggage_1795500199721.jpg"
              alt="Small sunny suitcase with map, camera, and palm frond"
              referrerPolicy="no-referrer"
              onError={() => setEmptyImgFailed(true)}
              className="w-28 h-28 mx-auto rounded-2xl object-cover border border-[#EADACC]"
            />
          ) : (
            <div className="w-16 h-16 mx-auto rounded-2xl bg-[#FFF0EB] flex items-center justify-center">
              <Compass className="w-7 h-7 text-[#F4775B]" />
            </div>
          )}

          <div className="space-y-1.5">
            <h2 className="font-heading text-xl font-bold text-[#3B2723]">
              {trips.length === 0 ? "No saved trips yet" : "No matching trips"}
            </h2>
            <p className="text-sm text-[#6E524B] max-w-sm mx-auto">
              {trips.length === 0
                ? "Create your first itinerary and it will appear here."
                : "Clear your search or filter to see all saved trips."}
            </p>
          </div>

          <button
            type="button"
            onClick={onPlanNew}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#A94D67] hover:bg-[#913E55] text-sm font-heading font-semibold text-white transition-colors cursor-pointer"
          >
            <span>Plan a Trip</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      ) : (
        /* Compact Saved Trip Cards with Small Whimsical Stamp Illustrations */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTrips.map((trip) => {
            const title = trip.itinerary?.tripTitle || trip.destination;
            const totalCost = trip.itinerary?.totalEstimatedCost;
            const currency = trip.itinerary?.currency || "INR";
            const dayCount = trip.itinerary?.days?.length ?? 0;
            const isConfirming = confirmDeleteId === trip.id;
            const illustration = pickTripIllustration(trip);
            const imgFailed = Boolean(cardImgFailed[trip.id]);

            return (
              <article
                key={trip.id}
                className="bg-[#FFFCF7] border border-[#EADACC] hover:border-[#F4775B] rounded-2xl p-5 flex flex-col justify-between gap-4 transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    {!imgFailed ? (
                      <img
                        src={illustration.src}
                        alt={illustration.alt}
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setCardImgFailed((prev) => ({ ...prev, [trip.id]: true }))
                        }
                        className="w-12 h-12 rounded-xl object-cover border border-[#EADACC] bg-[#FFF5E8] shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-[#FFF0EB] border border-[#EADACC] flex items-center justify-center shrink-0">
                        <Compass className="w-5 h-5 text-[#F4775B]" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h2 className="font-heading text-base font-bold text-[#3B2723] leading-snug">
                          {title}
                        </h2>
                        {isConfirming ? (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleConfirmDelete(trip.id)}
                              disabled={deletingId === trip.id}
                              className="px-2 py-1 rounded-lg bg-[#DC2626] text-white text-xs font-medium cursor-pointer whitespace-nowrap"
                            >
                              {deletingId === trip.id ? "..." : "Delete"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 rounded-lg bg-[#F9EBDC] text-[#3B2723] text-xs font-medium cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(trip.id)}
                            aria-label={`Delete trip to ${trip.destination}`}
                            className="p-1 rounded-lg text-[#9C8179] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors cursor-pointer shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-[#6E524B] mt-1">
                        <span className="font-medium text-[#3B2723]">{trip.destination}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">
                          {formatDateRange(trip.startDate, trip.endDate)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#6E524B] tabular-nums">
                    {dayCount > 0 && (
                      <>
                        <span>{dayCount} days</span>
                        <span aria-hidden="true">·</span>
                      </>
                    )}
                    <span>
                      {trip.travelers} {trip.travelers === 1 ? "traveler" : "travelers"}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{capitalize(trip.budgetLevel)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{capitalize(trip.travelPace)}</span>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="pt-3.5 border-t border-[#EADACC] flex items-center justify-between gap-2">
                  <div className="text-xs tabular-nums min-w-0">
                    {trip.status === "ready" && typeof totalCost === "number" ? (
                      (() => {
                        const budget = trip.itinerary?.budget;
                        const localCur = budget?.isInternational ? budget.localCurrency : undefined;
                        const inrTotal = budget?.totalInr ?? totalCost;
                        const perPerson =
                          budget?.perPersonInr ??
                          Math.round(inrTotal / Math.max(1, trip.travelers));
                        const pair =
                          currency === "INR"
                            ? formatCostPair(inrTotal, budget?.totalLocal, localCur)
                            : {
                                primaryInr: formatCurrency(totalCost, currency),
                                approxLocal: null,
                              };

                        return (
                          <div className="space-y-0.5">
                            <div className="flex flex-wrap items-baseline gap-x-1.5">
                              <span className="font-heading font-bold text-base text-[#3B2723]">
                                {pair.primaryInr}
                              </span>
                              {pair.approxLocal && (
                                <span className="text-[11px] text-[#6E524B]">
                                  ({pair.approxLocal})
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-[#6E524B] truncate">
                              {formatCurrency(perPerson, currency === "INR" ? "INR" : currency)}/person · Excl. flights
                            </div>
                          </div>
                        );
                      })()
                    ) : trip.status === "generating" ? (
                      <span className="text-[#9A4318] font-medium">Generating...</span>
                    ) : (
                      <span className="text-[#DC2626] font-medium">Generation failed</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenTrip(trip)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#A94D67] hover:bg-[#913E55] text-xs font-heading font-semibold text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <span>Open</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
