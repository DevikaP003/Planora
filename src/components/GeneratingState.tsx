import { useEffect, useState } from "react";
import { PlanoraLogoMark, WhimsicalFlightPath } from "./WhimsicalDoodles";

interface GeneratingStateProps {
  destination: string;
  dayCount: number;
}

const STEPS = [
  "Saving your trip preferences...",
  "Mapping morning, afternoon, and evening stops...",
  "Estimating daily budgets and travel tips...",
  "Packing your custom checklist...",
];

export function GeneratingState({ destination, dayCount }: GeneratingStateProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setStepIndex((prev) => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, 2400);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="max-w-2xl mx-auto px-4 py-16 sm:py-24 text-center">
      <div className="bg-[#FFFCF7] border border-[#EADACC] rounded-3xl p-8 sm:p-12 shadow-sm">
        <div className="mx-auto w-28 h-28 rounded-2xl overflow-hidden border border-[#EADACC] bg-[#FFF5E8] flex items-center justify-center mb-6 animate-float-plane">
          {!imgFailed ? (
            <img
              src="/src/assets/images/sunset_globe_plane_1795500199385.jpg"
              alt="Illustrated world globe with soaring paper airplane in tropical sunset tones"
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <PlanoraLogoMark className="w-12 h-12" />
          )}
        </div>

        <h2 className="font-heading text-2xl sm:text-3xl font-bold text-[#3B2723] text-balance">
          Charting {dayCount} {dayCount === 1 ? "day" : "days"} in {destination}
        </h2>

        <p className="mt-3 text-base text-[#6E524B] max-w-md mx-auto">
          {STEPS[stepIndex]}
        </p>

        <div className="mt-8 max-w-xs mx-auto">
          <WhimsicalFlightPath className="w-full h-10" />
        </div>

        <div className="mt-6 flex items-center justify-center gap-2">
          {STEPS.map((_, idx) => (
            <span
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx <= stepIndex ? "w-8 bg-[#F4775B]" : "w-3 bg-[#EADACC]"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
