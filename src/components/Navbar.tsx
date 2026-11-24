import { LogOut } from "lucide-react";
import type { AuthUser } from "../types/trip";
import { PlanoraLogoMark } from "./WhimsicalDoodles";

export type ActiveRoute = "home" | "trips" | "detail";

interface NavbarProps {
  activeRoute: ActiveRoute;
  tripCount: number;
  currentUser: AuthUser | null;
  isCheckingAuth: boolean;
  onNavigate: (route: "home" | "trips") => void;
  onOpenAuth: (mode: "login" | "signup") => void;
  onLogout: () => void;
}

export function Navbar({
  activeRoute,
  tripCount,
  currentUser,
  isCheckingAuth,
  onNavigate,
  onOpenAuth,
  onLogout,
}: NavbarProps) {
  return (
    <header className="w-full border-b border-[#EADACC] bg-[#FFF5E8]/95 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 sm:gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => onNavigate("home")}
          className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#A94D67] rounded-md cursor-pointer"
        >
          <PlanoraLogoMark className="w-7 h-7 shrink-0" />
          <span className="font-heading font-bold text-xl tracking-tight text-[#3B2723]">
            Planora
          </span>
        </button>

        {/* Zone 2: Clean Single-Line Text Navigation Links */}
        <nav className="flex items-center gap-5 sm:gap-8 text-sm font-medium">
          <button
            type="button"
            onClick={() => onNavigate("home")}
            className={`py-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer border-b-2 ${
              activeRoute === "home"
                ? "text-[#3B2723] border-[#F4775B]"
                : "text-[#6E524B] border-transparent hover:text-[#3B2723]"
            }`}
          >
            Plan Trip
          </button>
          <button
            type="button"
            onClick={() => onNavigate("trips")}
            className={`py-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer border-b-2 tabular-nums ${
              activeRoute === "trips" || activeRoute === "detail"
                ? "text-[#3B2723] border-[#F4775B]"
                : "text-[#6E524B] border-transparent hover:text-[#3B2723]"
            }`}
          >
            My Trips{currentUser && tripCount > 0 ? ` (${tripCount})` : ""}
          </button>
        </nav>

        {/* Zone 3: Auth Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          {isCheckingAuth ? (
            <div className="w-24 h-8 rounded-xl bg-[#F9EBDC] animate-pulse" aria-hidden="true" />
          ) : currentUser ? (
            <>
              <span className="hidden md:inline text-xs font-medium text-[#6E524B] max-w-[140px] truncate">
                {currentUser.name}
              </span>
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-heading font-semibold text-[#3B2723] bg-[#FFFCF7] border border-[#EADACC] hover:border-[#F4775B] hover:text-[#A94D67] rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Log out</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onOpenAuth("login")}
                className="px-3 py-2 text-xs sm:text-sm font-medium text-[#3B2723] hover:text-[#A94D67] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => onOpenAuth("signup")}
                className="px-4 py-2 text-xs sm:text-sm font-heading font-semibold text-white bg-[#A94D67] hover:bg-[#913E55] rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A94D67]"
              >
                Sign up
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
