import { useMemo, useState } from "react";
import { Calendar, Compass, Minus, Plus, Users, ArrowRight } from "lucide-react";
import type { BudgetLevel, CreateTripInput, TravelPace } from "../types/trip";
import { CompassSticker, TicketStubDoodle, WhimsicalFlightPath } from "./WhimsicalDoodles";

interface TripPlannerFormProps {
  onSubmit: (input: CreateTripInput) => Promise<void>;
  isSubmitting: boolean;
  serverError: string | null;
}

const QUICK_DESTINATIONS = [
  "Jaipur, India",
  "Kerala, India",
  "Goa, India",
  "Kyoto, Japan",
  "Lisbon, Portugal",
  "Bali, Indonesia",
];

const BUDGET_OPTIONS: Array<{ value: BudgetLevel; label: string }> = [
  { value: "budget", label: "Budget" },
  { value: "moderate", label: "Moderate" },
  { value: "luxury", label: "Luxury" },
];

const PACE_OPTIONS: Array<{ value: TravelPace; label: string }> = [
  { value: "relaxed", label: "Relaxed" },
  { value: "balanced", label: "Balanced" },
  { value: "packed", label: "Packed" },
];

const INTEREST_OPTIONS = [
  "Food & Cafes",
  "Art & Museums",
  "Nature & Parks",
  "Hidden Gems",
  "History",
  "Markets",
  "Nightlife",
  "Beaches",
];

function getDefaultDates(): { start: string; end: string } {
  const start = new Date();
  start.setDate(start.getDate() + 14);
  const end = new Date(start);
  end.setDate(end.getDate() + 3);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export function TripPlannerForm({
  onSubmit,
  isSubmitting,
  serverError,
}: TripPlannerFormProps) {
  const defaults = useMemo(() => getDefaultDates(), []);
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);
  const [travelers, setTravelers] = useState(2);
  const [budgetLevel, setBudgetLevel] = useState<BudgetLevel>("moderate");
  const [travelPace, setTravelPace] = useState<TravelPace>("balanced");
  const [interests, setInterests] = useState<string[]>(["Food & Cafes", "Hidden Gems"]);
  const [customInterest, setCustomInterest] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  const dayCount = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const s = Date.parse(`${startDate}T00:00:00Z`);
    const e = Date.parse(`${endDate}T00:00:00Z`);
    if (Number.isNaN(s) || Number.isNaN(e) || e < s) return 0;
    return Math.floor((e - s) / (1000 * 60 * 60 * 24)) + 1;
  }, [startDate, endDate]);

  function toggleInterest(label: string) {
    setInterests((prev) =>
      prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
    );
  }

  function handleAddCustomInterest() {
    const trimmed = customInterest.trim();
    if (!trimmed) return;
    if (!interests.includes(trimmed) && interests.length < 10) {
      setInterests((prev) => [...prev, trimmed]);
    }
    setCustomInterest("");
    setShowCustomInput(false);
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const trimmedDest = destination.trim();
    if (trimmedDest.length < 2) {
      setFormError("Enter a city, region, or country to start planning.");
      return;
    }
    if (!startDate || !endDate) {
      setFormError("Select both a start and end date.");
      return;
    }
    if (dayCount <= 0) {
      setFormError("End date must be on or after your start date.");
      return;
    }
    if (dayCount > 14) {
      setFormError("Trips can be up to 14 days long.");
      return;
    }
    if (!Number.isInteger(travelers) || travelers < 1 || travelers > 20) {
      setFormError("Travelers must be between 1 and 20.");
      return;
    }

    await onSubmit({
      destination: trimmedDest,
      startDate,
      endDate,
      travelers,
      budgetLevel,
      interests,
      travelPace,
    });
  }

  const displayedError = formError || serverError;

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left Column: Crisp Headline + Postcard Illustration */}
        <div className="lg:col-span-5 lg:sticky lg:top-8 space-y-5">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <CompassSticker className="w-8 h-8 shrink-0" />
              <span className="text-sm font-medium text-[#A94D67]">
                Quick trip planner
              </span>
            </div>

            <h1 className="font-heading text-3xl sm:text-5xl font-extrabold tracking-tight text-[#3B2723] leading-[1.1] text-balance">
              Plan your trip in seconds.
            </h1>

            <p className="text-base text-[#6E524B] leading-relaxed max-w-md">
              Get a clear day-by-day schedule, INR cost breakdown, places to visit, and packing checklist.
            </p>
          </div>

          <div className="pt-1 space-y-2.5 max-w-sm">
            {!heroImgFailed ? (
              <div className="rounded-3xl overflow-hidden border border-[#EADACC] bg-[#FFF5E8]">
                <img
                  src="/src/assets/images/sunset_hero_postcard_1795500196488.jpg"
                  alt="Whimsical suitcase with travel stickers, paper airplane, and brass compass"
                  referrerPolicy="no-referrer"
                  onError={() => setHeroImgFailed(true)}
                  className="w-full aspect-[4/3] object-cover"
                />
              </div>
            ) : (
              <div className="rounded-3xl border border-[#EADACC] bg-[#FFFCF7] aspect-[4/3] flex flex-col items-center justify-center p-8 text-center">
                <Compass className="w-12 h-12 text-[#F4775B] mb-3" />
                <p className="font-heading font-semibold text-[#3B2723]">
                  Ready for takeoff
                </p>
              </div>
            )}

            <div className="flex items-center gap-2.5 px-1">
              {[
                {
                  src: "/src/assets/images/sunset_mini_coastal_1795500841123.jpg",
                  alt: "Tiny sailboat and palm stamp",
                },
                {
                  src: "/src/assets/images/sunset_mini_heritage_1795500840607.jpg",
                  alt: "Tiny heritage palace stamp",
                },
                {
                  src: "/src/assets/images/sunset_mini_mountain_1795500841244.jpg",
                  alt: "Tiny mountain peaks stamp",
                },
                {
                  src: "/src/assets/images/sunset_mini_city_1795500842396.jpg",
                  alt: "Tiny scooter and lantern stamp",
                },
              ].map((stamp) => (
                <img
                  key={stamp.src}
                  src={stamp.src}
                  alt={stamp.alt}
                  referrerPolicy="no-referrer"
                  className="w-9 h-9 rounded-xl object-cover border border-[#EADACC] bg-[#FFF5E8] shrink-0"
                />
              ))}
              <WhimsicalFlightPath className="flex-1 h-7" />
            </div>
          </div>
        </div>

        {/* Right Column: Compact, Efficient Planner Form */}
        <div className="lg:col-span-7">
          <form
            onSubmit={handleFormSubmit}
            className="bg-[#FFFCF7] border border-[#EADACC] rounded-3xl p-6 sm:p-8 shadow-sm space-y-5"
            noValidate
          >
            <div className="flex items-center justify-between gap-4 border-b border-[#EADACC] pb-3.5">
              <div className="flex items-center gap-2.5">
                <TicketStubDoodle className="w-7 h-7 shrink-0" />
                <h2 className="font-heading text-xl font-bold text-[#3B2723]">
                  Trip details
                </h2>
              </div>
              {dayCount > 0 && (
                <span className="text-sm font-medium text-[#A94D67] tabular-nums whitespace-nowrap shrink-0">
                  {dayCount} {dayCount === 1 ? "day" : "days"}
                  {dayCount > 1 ? ` · ${dayCount - 1} nights` : ""}
                </span>
              )}
            </div>

            {displayedError && (
              <div
                role="alert"
                className="rounded-xl bg-[#FEF2F2] border border-[#FECACA] px-4 py-3 text-sm text-[#B91C1C]"
              >
                {displayedError}
              </div>
            )}

            {/* Destination */}
            <div className="space-y-2">
              <label
                htmlFor="destination"
                className="block text-sm font-medium text-[#3B2723]"
              >
                Where to?
              </label>
              <input
                id="destination"
                name="destination"
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="City, state, or country (e.g., Jaipur, Kerala, Kyoto)"
                maxLength={120}
                required
                className="w-full rounded-xl border border-[#DEC9B8] bg-[#FFF5E8] px-4 py-2.5 text-base text-[#3B2723] placeholder:text-[#9C8179] focus:border-[#F4775B] focus:bg-[#FFFCF7] focus:outline-none transition-colors"
              />
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                {QUICK_DESTINATIONS.map((city) => (
                  <button
                    key={city}
                    type="button"
                    onClick={() => setDestination(city)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      destination === city
                        ? "border-[#F4775B] bg-[#FFF0EB] text-[#A94D67]"
                        : "border-[#EADACC] bg-[#FFF5E8] text-[#6E524B] hover:border-[#DEC9B8] hover:text-[#3B2723]"
                    }`}
                  >
                    {city}
                  </button>
                ))}
              </div>
            </div>

            {/* Dates & Travelers in one clean row */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
              <div className="sm:col-span-4 space-y-1.5">
                <label
                  htmlFor="startDate"
                  className="flex items-center gap-1.5 text-xs font-medium text-[#3B2723]"
                >
                  <Calendar className="w-3.5 h-3.5 text-[#FF9F68]" aria-hidden="true" />
                  Start date
                </label>
                <input
                  id="startDate"
                  name="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="w-full rounded-xl border border-[#DEC9B8] bg-[#FFF5E8] px-3 py-2 text-sm text-[#3B2723] tabular-nums focus:border-[#F4775B] focus:bg-[#FFFCF7] focus:outline-none transition-colors"
                />
              </div>

              <div className="sm:col-span-4 space-y-1.5">
                <label
                  htmlFor="endDate"
                  className="flex items-center gap-1.5 text-xs font-medium text-[#3B2723]"
                >
                  <Calendar className="w-3.5 h-3.5 text-[#FF9F68]" aria-hidden="true" />
                  End date
                </label>
                <input
                  id="endDate"
                  name="endDate"
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  className="w-full rounded-xl border border-[#DEC9B8] bg-[#FFF5E8] px-3 py-2 text-sm text-[#3B2723] tabular-nums focus:border-[#F4775B] focus:bg-[#FFFCF7] focus:outline-none transition-colors"
                />
              </div>

              <div className="sm:col-span-4 space-y-1.5">
                <span className="flex items-center gap-1.5 text-xs font-medium text-[#3B2723]">
                  <Users className="w-3.5 h-3.5 text-[#F4775B]" aria-hidden="true" />
                  Travelers
                </span>
                <div className="flex items-center justify-between rounded-xl border border-[#DEC9B8] bg-[#FFF5E8] p-1 h-[38px]">
                  <button
                    type="button"
                    onClick={() => setTravelers((n) => Math.max(1, n - 1))}
                    disabled={travelers <= 1}
                    aria-label="Decrease travelers"
                    className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#FFFCF7] border border-[#EADACC] text-[#3B2723] hover:border-[#F4775B] disabled:opacity-40 cursor-pointer transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-heading font-semibold text-sm text-[#3B2723] tabular-nums">
                    {travelers}
                  </span>
                  <button
                    type="button"
                    onClick={() => setTravelers((n) => Math.min(20, n + 1))}
                    disabled={travelers >= 20}
                    aria-label="Increase travelers"
                    className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#FFFCF7] border border-[#EADACC] text-[#3B2723] hover:border-[#F4775B] disabled:opacity-40 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Budget & Pace Side-by-Side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <span className="block text-xs font-medium text-[#3B2723]">
                  Budget
                </span>
                <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#FFF5E8] border border-[#EADACC]">
                  {BUDGET_OPTIONS.map((opt) => {
                    const active = budgetLevel === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setBudgetLevel(opt.value)}
                        className={`py-2 px-2 rounded-lg text-xs font-heading font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                          active
                            ? "bg-[#FFFCF7] text-[#A94D67] border border-[#F4775B] shadow-sm"
                            : "text-[#6E524B] border border-transparent hover:text-[#3B2723]"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="block text-xs font-medium text-[#3B2723]">
                  Pace
                </span>
                <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#FFF5E8] border border-[#EADACC]">
                  {PACE_OPTIONS.map((opt) => {
                    const active = travelPace === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setTravelPace(opt.value)}
                        className={`py-2 px-2 rounded-lg text-xs font-heading font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                          active
                            ? "bg-[#FFFCF7] text-[#A94D67] border border-[#F4775B] shadow-sm"
                            : "text-[#6E524B] border border-transparent hover:text-[#3B2723]"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Interests */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-[#3B2723]">
                  Interests (optional)
                </span>
                {!showCustomInput && (
                  <button
                    type="button"
                    onClick={() => setShowCustomInput(true)}
                    className="text-xs font-medium text-[#A94D67] hover:underline cursor-pointer"
                  >
                    + Add custom
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {INTEREST_OPTIONS.map((item) => {
                  const active = interests.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleInterest(item)}
                      className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        active
                          ? "border-[#F4775B] bg-[#FFF0EB] text-[#A94D67]"
                          : "border-[#EADACC] bg-[#FFF5E8] text-[#6E524B] hover:border-[#DEC9B8] hover:text-[#3B2723]"
                      }`}
                    >
                      {item}
                    </button>
                  );
                })}
                {interests
                  .filter((item) => !INTEREST_OPTIONS.includes(item))
                  .map((custom) => (
                    <button
                      key={custom}
                      type="button"
                      onClick={() => toggleInterest(custom)}
                      className="px-2.5 py-1.5 rounded-lg border border-[#F4775B] bg-[#FFF0EB] text-[#A94D67] text-xs font-medium cursor-pointer whitespace-nowrap shrink-0"
                    >
                      {custom} ×
                    </button>
                  ))}
              </div>

              {showCustomInput && (
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={customInterest}
                    onChange={(e) => setCustomInterest(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCustomInterest();
                      }
                    }}
                    placeholder="e.g., Trekking, Street Food"
                    maxLength={40}
                    autoFocus
                    className="flex-1 rounded-xl border border-[#DEC9B8] bg-[#FFF5E8] px-3 py-1.5 text-sm text-[#3B2723] placeholder:text-[#9C8179] focus:border-[#F4775B] focus:bg-[#FFFCF7] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomInterest}
                    className="px-3.5 py-1.5 rounded-xl border border-[#EADACC] bg-[#F9EBDC] hover:bg-[#F2DEC9] text-xs font-medium text-[#3B2723] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-1">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-6 rounded-2xl bg-[#A94D67] hover:bg-[#913E55] disabled:opacity-60 text-white font-heading font-semibold text-base flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A94D67]"
              >
                <span>{isSubmitting ? "Generating..." : "Generate Itinerary"}</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
