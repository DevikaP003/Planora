import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  Copy,
  MapPin,
  Moon,
  Sun,
  Sunrise,
  Briefcase,
  Compass,
} from "lucide-react";
import type { ActivitySlot, TripRecord } from "../types/trip";
import { formatCostPair, formatCurrency } from "../utils/currency";
import { pickTripIllustration } from "../utils/tripIllustration";

interface ItineraryViewProps {
  trip: TripRecord;
  onBackToTrips: () => void;
  onPlanNew: () => void;
  backLabel?: string;
}

type ItinerarySection = "schedule" | "budget" | "packing";

function formatReadableDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatShortDateRange(start: string, end: string): string {
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

function formatAmount(
  inrValue: number,
  currency: string,
  localValue?: number,
  localCurrency?: string
): string {
  if (currency !== "INR") {
    return formatCurrency(inrValue, currency);
  }
  const pair = formatCostPair(inrValue, localValue, localCurrency);
  return pair.approxLocal ? `${pair.primaryInr} · ${pair.approxLocal}` : pair.primaryInr;
}

function SlotRow({
  period,
  slot,
  currency,
  localCurrency,
}: {
  period: "morning" | "afternoon" | "evening";
  slot: ActivitySlot;
  currency: string;
  localCurrency?: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);

  const config = {
    morning: {
      label: "Morning",
      icon: Sunrise,
      iconColor: "text-[#C68400]",
      imgSrc: "/src/assets/images/sunset_vibe_morning_1795500196265.jpg",
      imgAlt: "Tiny coffee cup and pocket map illustration",
    },
    afternoon: {
      label: "Afternoon",
      icon: Sun,
      iconColor: "text-[#F4775B]",
      imgSrc: "/src/assets/images/sunset_vibe_afternoon_1795500196542.jpg",
      imgAlt: "Tiny retro camera and ticket stubs illustration",
    },
    evening: {
      label: "Evening",
      icon: Moon,
      iconColor: "text-[#A94D67]",
      imgSrc: "/src/assets/images/sunset_vibe_evening_1795500197134.jpg",
      imgAlt: "Tiny paper lanterns and crescent moon illustration",
    },
  }[period];

  const Icon = config.icon;
  const places = Array.isArray(slot.places) && slot.places.length > 0 ? slot.places : [slot.location];

  return (
    <div className="py-4 px-5 sm:px-6 flex flex-col md:flex-row md:items-start gap-3 md:gap-6">
      {/* Period, Tiny Whimsical Stamp & Time */}
      <div className="md:w-48 shrink-0 flex items-center gap-2.5">
        {!imgFailed ? (
          <img
            src={config.imgSrc}
            alt={config.imgAlt}
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="w-9 h-9 rounded-xl object-cover border border-[#EADACC] bg-[#FFF5E8] shrink-0"
          />
        ) : (
          <div className="w-9 h-9 rounded-xl bg-[#FFF5E8] border border-[#EADACC] flex items-center justify-center shrink-0">
            <Icon className={`w-4 h-4 ${config.iconColor}`} aria-hidden="true" />
          </div>
        )}
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1 text-xs font-heading font-semibold text-[#3B2723]">
            <span>{config.label}</span>
          </div>
          <div className="text-[11px] text-[#6E524B] tabular-nums">{slot.timeWindow}</div>
        </div>
      </div>

      {/* Activity Title, Places & Note */}
      <div className="flex-1 min-w-0 space-y-1">
        <h3 className="font-heading text-base font-semibold text-[#3B2723] leading-snug">
          {slot.title}
        </h3>
        <p className="text-xs font-medium text-[#A94D67] leading-relaxed">
          {places.join(" · ")}
        </p>
        {slot.description && (
          <p className="text-sm text-[#6E524B] leading-relaxed">{slot.description}</p>
        )}
      </div>

      {/* Location & Cost */}
      <div className="md:w-44 shrink-0 flex md:flex-col items-center md:items-end justify-between gap-1 text-xs">
        <span className="inline-flex items-center gap-1 text-[#6E524B] truncate max-w-[170px]">
          <MapPin className="w-3.5 h-3.5 shrink-0 text-[#FF9F68]" aria-hidden="true" />
          <span className="truncate">{slot.location}</span>
        </span>
        <span className="font-heading font-semibold text-[#3B2723] tabular-nums whitespace-nowrap">
          {formatAmount(slot.estimatedCost, currency, slot.localEstimatedCost, localCurrency)}
        </span>
      </div>
    </div>
  );
}

export function ItineraryView({
  trip,
  onBackToTrips,
  onPlanNew,
  backLabel = "My Trips",
}: ItineraryViewProps) {
  const [activeSection, setActiveSection] = useState<ItinerarySection>("schedule");
  const [selectedDay, setSelectedDay] = useState<number | "all">("all");
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);
  const [heroStampFailed, setHeroStampFailed] = useState(false);
  const [budgetStampFailed, setBudgetStampFailed] = useState(false);
  const [placesStampFailed, setPlacesStampFailed] = useState(false);
  const [packingImgFailed, setPackingImgFailed] = useState(false);
  const [tipsImgFailed, setTipsImgFailed] = useState(false);

  const itinerary = trip.itinerary;
  const heroStamp = pickTripIllustration(trip);

  const totalChecklistCount = useMemo(() => {
    if (!itinerary) return 0;
    return itinerary.packingChecklist.reduce((sum, cat) => sum + cat.items.length, 0);
  }, [itinerary]);

  const packedCount = useMemo(
    () => Object.values(checkedItems).filter(Boolean).length,
    [checkedItems]
  );

  function toggleChecklistItem(key: string) {
    setCheckedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleCopySummary() {
    if (!itinerary) return;
    const titleText = itinerary.tripTitle || `${trip.destination} Itinerary`;
    const cur = itinerary.currency || "INR";
    const budget = itinerary.budget;
    const totalLabel =
      budget && budget.isInternational && typeof budget.totalLocal === "number"
        ? `${formatCurrency(budget.totalInr, "INR")} (${formatCurrency(budget.totalLocal, budget.localCurrency)} approx.)`
        : formatCurrency(itinerary.totalEstimatedCost, cur);
    const perPersonAmount =
      budget?.perPersonInr ?? Math.round(itinerary.totalEstimatedCost / Math.max(1, trip.travelers));
    const perPersonLabel =
      budget && budget.isInternational && typeof budget.perPersonLocal === "number"
        ? `${formatCurrency(perPersonAmount, "INR")} (${formatCurrency(budget.perPersonLocal, budget.localCurrency)} approx.)`
        : formatCurrency(perPersonAmount, cur);

    const lines: string[] = [
      `${titleText} (${trip.destination})`,
      `${formatShortDateRange(trip.startDate, trip.endDate)} · ${trip.travelers} travelers · Total est. ${totalLabel} (${perPersonLabel} / person)`,
      budget ? `${budget.flightsNote} ${budget.exchangeRateNote}` : "Flights are not included.",
      "",
      ...itinerary.days.flatMap((d) => [
        `Day ${d.dayNumber} (${d.date}) — ${d.title || d.dayTitle || `Day ${d.dayNumber}`} [${formatCurrency(d.estimatedCost, cur)}]`,
        `  Morning: ${d.morning.title} (${(d.morning.places || [d.morning.location]).join(", ")})`,
        `  Afternoon: ${d.afternoon.title} (${(d.afternoon.places || [d.afternoon.location]).join(", ")})`,
        `  Evening: ${d.evening.title} (${(d.evening.places || [d.evening.location]).join(", ")})`,
        "",
      ]),
    ];

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be unavailable in restricted contexts
    }
  }

  if (!itinerary) {
    return (
      <section className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="bg-[#FFFCF7] border border-[#EADACC] rounded-3xl p-8 space-y-4">
          <h2 className="font-heading text-2xl font-bold text-[#3B2723]">
            {trip.destination}
          </h2>
          <p className="text-sm text-[#6E524B]">
            {trip.status === "generating"
              ? "This itinerary is currently being generated."
              : trip.errorMessage || "No itinerary details are available for this trip."}
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={onBackToTrips}
              className="px-4 py-2 rounded-xl border border-[#EADACC] bg-[#FFF5E8] text-sm font-medium text-[#3B2723] hover:border-[#F4775B] cursor-pointer"
            >
              Back to My Trips
            </button>
            <button
              type="button"
              onClick={onPlanNew}
              className="px-4 py-2 rounded-xl bg-[#A94D67] text-sm font-heading font-semibold text-white hover:bg-[#913E55] cursor-pointer transition-colors"
            >
              Plan a New Trip
            </button>
          </div>
        </div>
      </section>
    );
  }

  const currency = itinerary.currency || "INR";
  const budget = itinerary.budget;
  const localCurrency = budget?.isInternational ? budget.localCurrency : undefined;
  const totalInrAmount = budget?.totalInr ?? itinerary.totalEstimatedCost;
  const perPersonAmount =
    budget?.perPersonInr ?? Math.round(totalInrAmount / Math.max(1, trip.travelers));
  const totalPair =
    currency === "INR"
      ? formatCostPair(totalInrAmount, budget?.totalLocal, localCurrency)
      : { primaryInr: formatCurrency(itinerary.totalEstimatedCost, currency), approxLocal: null };
  const perPersonPair =
    currency === "INR"
      ? formatCostPair(perPersonAmount, budget?.perPersonLocal, localCurrency)
      : { primaryInr: formatCurrency(perPersonAmount, currency), approxLocal: null };

  const visibleDays =
    selectedDay === "all"
      ? itinerary.days
      : itinerary.days.filter((d) => d.dayNumber === selectedDay);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBackToTrips}
          className="inline-flex items-center gap-2 text-sm font-medium text-[#6E524B] hover:text-[#3B2723] transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          {backLabel}
        </button>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleCopySummary}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#EADACC] bg-[#FFFCF7] hover:bg-[#F9EBDC] text-xs font-medium text-[#3B2723] transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#A94D67]" aria-hidden="true" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                Copy Plan
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onPlanNew}
            className="px-4 py-2 rounded-xl bg-[#A94D67] hover:bg-[#913E55] text-xs font-heading font-semibold text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            New Trip
          </button>
        </div>
      </div>

      {/* Compact Trip Snapshot & Key Budget Strip */}
      <section className="bg-[#FFFCF7] border border-[#EADACC] rounded-3xl p-5 sm:p-7 space-y-5">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex items-start gap-3.5 max-w-2xl">
            {!heroStampFailed ? (
              <img
                src={heroStamp.src}
                alt={heroStamp.alt}
                referrerPolicy="no-referrer"
                onError={() => setHeroStampFailed(true)}
                className="w-12 h-12 rounded-xl object-cover border border-[#EADACC] bg-[#FFF5E8] shrink-0 mt-0.5"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-[#FFF0EB] border border-[#EADACC] flex items-center justify-center shrink-0 mt-0.5">
                <Compass className="w-5 h-5 text-[#F4775B]" />
              </div>
            )}

            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#6E524B]">
                <span className="font-semibold text-[#3B2723]">{trip.destination}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">
                  {formatShortDateRange(trip.startDate, trip.endDate)}
                </span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">
                  {trip.travelers} {trip.travelers === 1 ? "traveler" : "travelers"}
                </span>
                <span aria-hidden="true">·</span>
                <span>{capitalize(trip.budgetLevel)}</span>
                <span aria-hidden="true">·</span>
                <span>{capitalize(trip.travelPace)} pace</span>
              </div>

              <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-[#3B2723] text-balance">
                {itinerary.tripTitle || `${trip.destination} Itinerary`}
              </h1>

              {(itinerary.tripSummary || itinerary.overview) && (
                <p className="text-sm text-[#6E524B] leading-relaxed">
                  {itinerary.tripSummary || itinerary.overview}
                </p>
              )}
            </div>
          </div>

          {/* Primary Cost Readout */}
          <div className="md:text-right shrink-0 space-y-1">
            <div className="text-xs text-[#6E524B]">
              Est. total ({trip.travelers} {trip.travelers === 1 ? "traveler" : "travelers"})
            </div>
            <div className="font-heading text-2xl sm:text-3xl font-extrabold text-[#A94D67] tabular-nums">
              {totalPair.primaryInr}
            </div>
            {totalPair.approxLocal && (
              <div className="text-xs font-semibold text-[#3B2723] tabular-nums">
                {totalPair.approxLocal} ({localCurrency})
              </div>
            )}
            <div className="text-xs text-[#6E524B] tabular-nums">
              {perPersonPair.primaryInr}
              {perPersonPair.approxLocal ? ` (${perPersonPair.approxLocal})` : ""} / person
            </div>
          </div>
        </div>

        {/* Hairline Category Budget Strip */}
        {budget?.categories && (
          <div className="pt-4 border-t border-[#EADACC] grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              {
                label: "Stay",
                inr: budget.categories.accommodationInr,
                local: budget.categories.accommodationLocal,
              },
              {
                label: "Food",
                inr: budget.categories.foodInr,
                local: budget.categories.foodLocal,
              },
              {
                label: "Local transport",
                inr: budget.categories.transportInr,
                local: budget.categories.transportLocal,
              },
              {
                label: "Activities",
                inr: budget.categories.activitiesInr,
                local: budget.categories.activitiesLocal,
              },
            ].map((item) => {
              const pair = formatCostPair(item.inr, item.local, localCurrency);
              return (
                <div key={item.label} className="space-y-0.5">
                  <div className="text-xs text-[#6E524B]">{item.label}</div>
                  <div className="font-heading text-sm sm:text-base font-bold text-[#3B2723] tabular-nums">
                    {pair.primaryInr}
                  </div>
                  {pair.approxLocal && (
                    <div className="text-[11px] text-[#6E524B] tabular-nums">
                      {pair.approxLocal}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Flights & Exchange Rate Clarifier */}
        <div className="pt-3 border-t border-[#EADACC] flex flex-wrap items-center justify-between gap-2 text-xs text-[#6E524B]">
          <span>
            {budget?.flightsNote ||
              "Flights are not included. Covers stay, food, local transport & activities."}
          </span>
          {budget?.isInternational && <span>{budget.exchangeRateNote}</span>}
        </div>
      </section>

      {/* Primary Section Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 p-1 bg-[#F9EBDC] border border-[#EADACC] rounded-xl">
          {(
            [
              { id: "schedule", label: `Schedule (${itinerary.days.length}d)` },
              { id: "budget", label: "Budget & Places" },
              { id: "packing", label: "Packing & Tips" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSection(tab.id)}
              className={`px-3.5 py-1.5 text-xs sm:text-sm font-heading font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 tabular-nums ${
                activeSection === tab.id
                  ? "bg-[#FFFCF7] text-[#A94D67] shadow-sm"
                  : "text-[#6E524B] hover:text-[#3B2723]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Day Selector when on Schedule tab */}
        {activeSection === "schedule" && itinerary.days.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            <button
              type="button"
              onClick={() => setSelectedDay("all")}
              className={`px-3 py-1.5 rounded-lg border text-xs font-heading font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                selectedDay === "all"
                  ? "border-[#F4775B] bg-[#FFF0EB] text-[#A94D67]"
                  : "border-[#EADACC] bg-[#FFFCF7] text-[#6E524B] hover:text-[#3B2723]"
              }`}
            >
              All days
            </button>
            {itinerary.days.map((day) => (
              <button
                key={day.dayNumber}
                type="button"
                onClick={() => setSelectedDay(day.dayNumber)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-heading font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 tabular-nums ${
                  selectedDay === day.dayNumber
                    ? "border-[#F4775B] bg-[#FFF0EB] text-[#A94D67]"
                    : "border-[#EADACC] bg-[#FFFCF7] text-[#6E524B] hover:text-[#3B2723]"
                }`}
              >
                Day {day.dayNumber}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* TAB 1: SCHEDULE */}
      {activeSection === "schedule" && (
        <section className="space-y-6">
          {visibleDays.map((day) => {
            const dayPair =
              currency === "INR"
                ? formatCostPair(day.estimatedCost, day.localEstimatedCost, localCurrency)
                : { primaryInr: formatCurrency(day.estimatedCost, currency), approxLocal: null };

            return (
              <div
                key={day.dayNumber}
                className="bg-[#FFFCF7] border border-[#EADACC] rounded-3xl overflow-hidden"
              >
                {/* Clean Day Header */}
                <div className="px-5 sm:px-6 py-4 bg-[#F9EBDC]/60 border-b border-[#EADACC] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-heading font-bold text-[#A94D67] tabular-nums">
                        Day {day.dayNumber}
                      </span>
                      <span className="text-[#9C8179]" aria-hidden="true">
                        ·
                      </span>
                      <span className="text-[#6E524B] tabular-nums">
                        {formatReadableDate(day.date)}
                      </span>
                    </div>
                    <h2 className="font-heading text-lg sm:text-xl font-bold text-[#3B2723]">
                      {day.title || day.dayTitle || `Day ${day.dayNumber}`}
                    </h2>
                  </div>

                  <div className="sm:text-right text-sm font-heading font-bold text-[#3B2723] tabular-nums whitespace-nowrap shrink-0">
                    {dayPair.primaryInr}
                    {dayPair.approxLocal && (
                      <span className="text-xs font-medium text-[#6E524B] ml-1.5">
                        ({dayPair.approxLocal})
                      </span>
                    )}
                    <span className="text-xs font-normal text-[#6E524B] ml-1">/ day</span>
                  </div>
                </div>

                {/* Morning / Afternoon / Evening Clean Timeline Rows */}
                <div className="divide-y divide-[#EADACC]">
                  <SlotRow
                    period="morning"
                    slot={day.morning}
                    currency={currency}
                    localCurrency={localCurrency}
                  />
                  <SlotRow
                    period="afternoon"
                    slot={day.afternoon}
                    currency={currency}
                    localCurrency={localCurrency}
                  />
                  <SlotRow
                    period="evening"
                    slot={day.evening}
                    currency={currency}
                    localCurrency={localCurrency}
                  />
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* TAB 2: BUDGET & PLACES */}
      {activeSection === "budget" && (
        <section className="space-y-6">
          {/* Daily Cost Table */}
          <div className="bg-[#FFFCF7] border border-[#EADACC] rounded-3xl p-5 sm:p-7 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {!budgetStampFailed ? (
                  <img
                    src="/src/assets/images/sunset_globe_plane_1795500199385.jpg"
                    alt="Tiny globe and paper airplane illustration"
                    referrerPolicy="no-referrer"
                    onError={() => setBudgetStampFailed(true)}
                    className="w-10 h-10 rounded-xl object-cover border border-[#EADACC] bg-[#FFF5E8] shrink-0"
                  />
                ) : null}
                <div>
                  <h2 className="font-heading text-xl font-bold text-[#3B2723]">
                    Daily budget breakdown
                  </h2>
                  <span className="text-xs text-[#6E524B]">
                    All travelers combined · Flights excluded
                  </span>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-[#EADACC] text-xs text-[#6E524B]">
                    <th className="py-2.5 pr-4 font-medium">Day</th>
                    <th className="py-2.5 px-3 font-medium text-right">Stay</th>
                    <th className="py-2.5 px-3 font-medium text-right">Food</th>
                    <th className="py-2.5 px-3 font-medium text-right">Transport</th>
                    <th className="py-2.5 px-3 font-medium text-right">Activities</th>
                    <th className="py-2.5 pl-3 font-medium text-right">Day total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EADACC] tabular-nums">
                  {itinerary.days.map((day) => {
                    const cb = day.costBreakdown;
                    const dayPair =
                      currency === "INR"
                        ? formatCostPair(day.estimatedCost, day.localEstimatedCost, localCurrency)
                        : { primaryInr: formatCurrency(day.estimatedCost, currency), approxLocal: null };
                    return (
                      <tr key={day.dayNumber} className="text-[#3B2723]">
                        <td className="py-3 pr-4">
                          <span className="font-heading font-semibold text-[#A94D67]">
                            Day {day.dayNumber}
                          </span>
                          <span className="text-xs text-[#6E524B] ml-2">
                            {formatReadableDate(day.date)}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right text-[#6E524B]">
                          {cb ? formatCurrency(cb.accommodationInr, "INR") : "—"}
                        </td>
                        <td className="py-3 px-3 text-right text-[#6E524B]">
                          {cb ? formatCurrency(cb.foodInr, "INR") : "—"}
                        </td>
                        <td className="py-3 px-3 text-right text-[#6E524B]">
                          {cb ? formatCurrency(cb.transportInr, "INR") : "—"}
                        </td>
                        <td className="py-3 px-3 text-right text-[#6E524B]">
                          {cb ? formatCurrency(cb.activitiesInr, "INR") : "—"}
                        </td>
                        <td className="py-3 pl-3 text-right font-heading font-semibold">
                          <div>{dayPair.primaryInr}</div>
                          {dayPair.approxLocal && (
                            <div className="text-[11px] font-normal text-[#6E524B]">
                              {dayPair.approxLocal}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[#EADACC] font-heading font-bold text-[#3B2723] tabular-nums">
                    <td className="pt-3 pr-4">
                      Total ({trip.travelers} {trip.travelers === 1 ? "traveler" : "travelers"})
                    </td>
                    <td className="pt-3 px-3 text-right">
                      {budget?.categories
                        ? formatCurrency(budget.categories.accommodationInr, "INR")
                        : "—"}
                    </td>
                    <td className="pt-3 px-3 text-right">
                      {budget?.categories ? formatCurrency(budget.categories.foodInr, "INR") : "—"}
                    </td>
                    <td className="pt-3 px-3 text-right">
                      {budget?.categories
                        ? formatCurrency(budget.categories.transportInr, "INR")
                        : "—"}
                    </td>
                    <td className="pt-3 px-3 text-right">
                      {budget?.categories
                        ? formatCurrency(budget.categories.activitiesInr, "INR")
                        : "—"}
                    </td>
                    <td className="pt-3 pl-3 text-right text-[#A94D67]">
                      <div>{totalPair.primaryInr}</div>
                      {totalPair.approxLocal && (
                        <div className="text-[11px] font-normal text-[#6E524B]">
                          {totalPair.approxLocal}
                        </div>
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* All Places Grouped Cleanly by Day */}
          <div className="bg-[#FFFCF7] border border-[#EADACC] rounded-3xl p-5 sm:p-7 space-y-4">
            <div className="flex items-center gap-3">
              {!placesStampFailed ? (
                <img
                  src={heroStamp.src}
                  alt={heroStamp.alt}
                  referrerPolicy="no-referrer"
                  onError={() => setPlacesStampFailed(true)}
                  className="w-10 h-10 rounded-xl object-cover border border-[#EADACC] bg-[#FFF5E8] shrink-0"
                />
              ) : null}
              <h2 className="font-heading text-xl font-bold text-[#3B2723]">
                All places included
              </h2>
            </div>

            <div className="divide-y divide-[#EADACC]">
              {itinerary.days.map((day) => {
                const dayPlaces = Array.from(
                  new Set(
                    [
                      ...(day.morning.places?.length ? day.morning.places : [day.morning.location]),
                      ...(day.afternoon.places?.length
                        ? day.afternoon.places
                        : [day.afternoon.location]),
                      ...(day.evening.places?.length ? day.evening.places : [day.evening.location]),
                    ]
                      .map((p) => p?.trim())
                      .filter((p): p is string => Boolean(p))
                  )
                );
                return (
                  <div
                    key={day.dayNumber}
                    className="py-3 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4"
                  >
                    <span className="sm:w-28 shrink-0 font-heading text-xs font-bold text-[#A94D67] tabular-nums">
                      Day {day.dayNumber} · {formatReadableDate(day.date)}
                    </span>
                    <p className="text-sm text-[#3B2723] leading-relaxed">
                      {dayPlaces.join(" · ")}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* TAB 3: PACKING & TIPS */}
      {activeSection === "packing" && (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Packing Checklist */}
          <div className="lg:col-span-7 bg-[#FFFCF7] border border-[#EADACC] rounded-3xl p-6 sm:p-7 space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <h2 className="font-heading text-xl font-bold text-[#3B2723]">
                  Packing checklist
                </h2>
                <p className="text-xs text-[#6E524B] tabular-nums">
                  {packedCount} of {totalChecklistCount} packed
                </p>
              </div>

              {!packingImgFailed ? (
                <img
                  src="/src/assets/images/sunset_packing_kit_1795500198053.jpg"
                  alt="Tiny passport, sunglasses, and rolled map illustration"
                  referrerPolicy="no-referrer"
                  onError={() => setPackingImgFailed(true)}
                  className="w-12 h-12 rounded-xl object-cover border border-[#EADACC] shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-[#FFF0EB] flex items-center justify-center shrink-0">
                  <Briefcase className="w-5 h-5 text-[#F4775B]" />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {itinerary.packingChecklist.map((group) => (
                <div key={group.category} className="space-y-2.5">
                  <h3 className="font-heading text-xs font-semibold text-[#A94D67]">
                    {group.category}
                  </h3>
                  <ul className="space-y-1.5">
                    {group.items.map((item) => {
                      const key = `${group.category}:${item}`;
                      const checked = Boolean(checkedItems[key]);
                      return (
                        <li key={key}>
                          <button
                            type="button"
                            onClick={() => toggleChecklistItem(key)}
                            className="w-full flex items-start gap-2.5 text-left group cursor-pointer py-0.5"
                          >
                            <span
                              className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                checked
                                  ? "bg-[#A94D67] border-[#A94D67] text-white"
                                  : "border-[#DEC9B8] bg-[#FFF5E8] group-hover:border-[#F4775B]"
                              }`}
                            >
                              {checked && <Check className="w-3 h-3" strokeWidth={3} />}
                            </span>
                            <span
                              className={`text-sm leading-snug transition-colors ${
                                checked
                                  ? "line-through text-[#9C8179]"
                                  : "text-[#3B2723] group-hover:text-[#A94D67]"
                              }`}
                            >
                              {item}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Local Travel Tips */}
          <div className="lg:col-span-5 bg-[#F9EBDC] border border-[#EADACC] rounded-3xl p-6 sm:p-7 space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <h2 className="font-heading text-xl font-bold text-[#3B2723]">
                  Local tips
                </h2>
                <p className="text-xs text-[#6E524B]">
                  Essentials for {trip.destination}
                </p>
              </div>

              {!tipsImgFailed ? (
                <img
                  src="/src/assets/images/sunset_tips_scooter_1795500197878.jpg"
                  alt="Tiny vintage scooter and travel signpost illustration"
                  referrerPolicy="no-referrer"
                  onError={() => setTipsImgFailed(true)}
                  className="w-12 h-12 rounded-xl object-cover border border-[#EADACC] shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-[#FFFCF7] flex items-center justify-center shrink-0">
                  <Compass className="w-5 h-5 text-[#F4775B]" />
                </div>
              )}
            </div>

            <ol className="space-y-3">
              {itinerary.travelTips.map((tip, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="font-heading text-xs font-bold text-[#A94D67] tabular-nums pt-0.5 shrink-0">
                    {String(idx + 1).padStart(2, "0")}.
                  </span>
                  <p className="text-sm text-[#3B2723] leading-relaxed">{tip}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}
    </div>
  );
}
