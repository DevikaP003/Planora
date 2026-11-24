import { useCallback, useEffect, useState } from "react";
import { Navbar, type ActiveRoute } from "./components/Navbar";
import { TripPlannerForm } from "./components/TripPlannerForm";
import { GeneratingState } from "./components/GeneratingState";
import { ItineraryView } from "./components/ItineraryView";
import { MyTripsView } from "./components/MyTripsView";
import { AuthModal, type AuthMode } from "./components/AuthModal";
import { PlanoraLogoMark, SunCloudDoodle } from "./components/WhimsicalDoodles";
import type { AuthUser, CreateTripInput, TripRecord } from "./types/trip";

function parseLocationRoute(): { route: ActiveRoute; tripId: string | null } {
  const path = window.location.pathname;
  if (path === "/trips") {
    return { route: "trips", tripId: null };
  }
  const match = path.match(/^\/trips\/([a-zA-Z0-9_-]+)$/);
  if (match) {
    return { route: "detail", tripId: match[1] };
  }
  return { route: "home", tripId: null };
}

async function readJsonSafe<T = Record<string, unknown>>(
  res: Response
): Promise<{ ok: boolean; data: T | null }> {
  const text = await res.text();
  if (!text) {
    return { ok: false, data: null };
  }
  try {
    return { ok: true, data: JSON.parse(text) as T };
  } catch {
    return { ok: false, data: null };
  }
}

export default function App() {
  const initial = parseLocationRoute();
  const [activeRoute, setActiveRoute] = useState<ActiveRoute>(initial.route);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(initial.tripId);

  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthMode>("login");
  const [authContextMessage, setAuthContextMessage] = useState<string | null>(null);
  const [pendingTripInput, setPendingTripInput] = useState<CreateTripInput | null>(null);

  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [activeTrip, setActiveTrip] = useState<TripRecord | null>(null);
  const [isLoadingTrips, setIsLoadingTrips] = useState(false);
  const [tripsError, setTripsError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingMeta, setGeneratingMeta] = useState<{
    destination: string;
    dayCount: number;
  } | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const navigateTo = useCallback((path: string, route: ActiveRoute, tripId: string | null = null) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, "", path);
    }
    setActiveRoute(route);
    setSelectedTripId(tripId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const openAuthModal = useCallback((mode: AuthMode, message: string | null = null) => {
    setAuthModalMode(mode);
    setAuthContextMessage(message);
    setAuthModalOpen(true);
  }, []);

  const fetchTrips = useCallback(async () => {
    setIsLoadingTrips(true);
    setTripsError(null);
    try {
      const res = await fetch("/api/trips", {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (res.status === 401) {
        setCurrentUser(null);
        setTrips([]);
        setActiveTrip(null);
        return;
      }
      const parsed = await readJsonSafe<{ trips?: TripRecord[]; error?: string }>(res);
      if (!parsed.ok || !parsed.data) {
        throw new Error(
          `Could not reach the trips service (HTTP ${res.status || "network"}). Please try refreshing.`
        );
      }
      if (!res.ok) {
        throw new Error(parsed.data.error || "Unable to load saved trips.");
      }
      setTrips(Array.isArray(parsed.data.trips) ? parsed.data.trips : []);
    } catch (err) {
      setTripsError(err instanceof Error ? err.message : "Unable to load saved trips.");
    } finally {
      setIsLoadingTrips(false);
    }
  }, []);

  // Check initial HTTP-only session cookie via /api/auth/me
  useEffect(() => {
    let cancelled = false;
    async function checkSession() {
      setIsCheckingAuth(true);
      try {
        const res = await fetch("/api/auth/me", {
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        const parsed = await readJsonSafe<{ user?: AuthUser | null }>(res);
        if (!cancelled && res.ok && parsed.ok && parsed.data?.user) {
          setCurrentUser(parsed.data.user);
        } else if (!cancelled) {
          setCurrentUser(null);
        }
      } catch {
        if (!cancelled) setCurrentUser(null);
      } finally {
        if (!cancelled) setIsCheckingAuth(false);
      }
    }
    checkSession();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load user's trips whenever authenticated user changes
  useEffect(() => {
    if (isCheckingAuth) return;
    if (currentUser) {
      fetchTrips();
    } else {
      setTrips([]);
      setActiveTrip(null);
      setTripsError(null);
    }
  }, [currentUser, isCheckingAuth, fetchTrips]);

  useEffect(() => {
    if (isCheckingAuth || !currentUser) return;
    if (activeRoute === "detail" && selectedTripId) {
      const found = trips.find((t) => t.id === selectedTripId);
      if (found) {
        setActiveTrip(found);
      } else {
        fetch(`/api/trips/${encodeURIComponent(selectedTripId)}`, {
          credentials: "include",
          headers: { Accept: "application/json" },
        })
          .then(async (res) => {
            if (res.status === 401) {
              setCurrentUser(null);
              return;
            }
            if (!res.ok) throw new Error("Trip not found");
            const parsed = await readJsonSafe<{ trip?: TripRecord }>(res);
            if (parsed.ok && parsed.data?.trip) setActiveTrip(parsed.data.trip);
          })
          .catch(() => {
            setActiveTrip(null);
          });
      }
    }
  }, [activeRoute, selectedTripId, trips, currentUser, isCheckingAuth]);

  useEffect(() => {
    function handlePopState() {
      const parsed = parseLocationRoute();
      setActiveRoute(parsed.route);
      setSelectedTripId(parsed.tripId);
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const executeTripGeneration = useCallback(
    async (input: CreateTripInput) => {
      setGenerateError(null);
      const startMs = Date.parse(`${input.startDate}T00:00:00Z`);
      const endMs = Date.parse(`${input.endDate}T00:00:00Z`);
      const dayCount = Math.max(1, Math.floor((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1);

      setIsGenerating(true);
      setGeneratingMeta({ destination: input.destination, dayCount });

      try {
        const res = await fetch("/api/trips/generate?async=1", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "X-Requested-With": "Planora",
          },
          body: JSON.stringify(input),
        });

        if (res.status === 401) {
          setCurrentUser(null);
          setPendingTripInput(input);
          openAuthModal("login", "Please log in or sign up to generate and save your trip.");
          return;
        }

        const parsed = await readJsonSafe<{ trip?: TripRecord; error?: string }>(res);
        if (!parsed.ok || !parsed.data) {
          if (res.status === 504 || res.status === 502) {
            throw new Error(
              `The trip generator timed out before starting (HTTP ${res.status}). Please try again.`
            );
          }
          throw new Error(
            `The trip generator returned an unexpected response (HTTP ${res.status || "error"}). Please try again.`
          );
        }

        if (!res.ok || !parsed.data.trip) {
          throw new Error(
            parsed.data.error || `Unable to generate itinerary (HTTP ${res.status}). Please try again.`
          );
        }

        let latestTrip: TripRecord = parsed.data.trip;

        if (latestTrip.status === "generating") {
          const deadline = Date.now() + 90_000;
          while (latestTrip.status === "generating" && Date.now() < deadline) {
            await new Promise((resolve) => setTimeout(resolve, 1200));
            const pollRes = await fetch(`/api/trips/${encodeURIComponent(latestTrip.id)}`, {
              credentials: "include",
              headers: { Accept: "application/json" },
            });
            if (pollRes.status === 401) {
              setCurrentUser(null);
              throw new Error("Your session expired. Please log in again.");
            }
            const pollParsed = await readJsonSafe<{ trip?: TripRecord; error?: string }>(pollRes);
            if (!pollRes.ok || !pollParsed.ok || !pollParsed.data?.trip) {
              throw new Error(
                pollParsed.data?.error ||
                  `Unable to check itinerary progress (HTTP ${pollRes.status || "error"}).`
              );
            }
            latestTrip = pollParsed.data.trip;
          }
        }

        if (latestTrip.status === "failed") {
          throw new Error(
            latestTrip.errorMessage || "Trip generation failed. Please try again."
          );
        }

        if (latestTrip.status !== "ready" || !latestTrip.itinerary) {
          throw new Error(
            "Itinerary generation is taking longer than expected. Please check My Trips in a moment."
          );
        }

        setTrips((prev) => [latestTrip, ...prev.filter((t) => t.id !== latestTrip.id)]);
        setActiveTrip(latestTrip);
        navigateTo(`/trips/${latestTrip.id}`, "detail", latestTrip.id);
      } catch (err) {
        setGenerateError(
          err instanceof Error ? err.message : "Something went wrong while generating."
        );
        fetchTrips();
      } finally {
        setIsGenerating(false);
        setGeneratingMeta(null);
      }
    },
    [fetchTrips, navigateTo, openAuthModal]
  );

  async function handleGenerateTrip(input: CreateTripInput) {
    if (!currentUser) {
      setPendingTripInput(input);
      openAuthModal("login", "Log in or create an account to generate and save your trip.");
      return;
    }
    await executeTripGeneration(input);
  }

  async function handleDeleteTrip(id: string) {
    const res = await fetch(`/api/trips/${encodeURIComponent(id)}`, {
      method: "DELETE",
      credentials: "include",
      headers: {
        "X-Requested-With": "Planora",
      },
    });
    if (res.status === 401) {
      setCurrentUser(null);
      openAuthModal("login", "Please log in again to manage your trips.");
      return;
    }
    if (res.ok) {
      setTrips((prev) => prev.filter((t) => t.id !== id));
      if (activeTrip?.id === id) {
        setActiveTrip(null);
      }
    }
  }

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: {
          "X-Requested-With": "Planora",
        },
      });
    } catch {
      // Clear client state regardless
    }
    setCurrentUser(null);
    setTrips([]);
    setActiveTrip(null);
    setPendingTripInput(null);
    navigateTo("/", "home", null);
  }

  function handleAuthSuccess(user: AuthUser) {
    setCurrentUser(user);
    setAuthModalOpen(false);
    setAuthContextMessage(null);
    if (pendingTripInput) {
      const queued = pendingTripInput;
      setPendingTripInput(null);
      void executeTripGeneration(queued);
    }
  }

  function handleNavClick(route: "home" | "trips") {
    setGenerateError(null);
    if (route === "home") {
      navigateTo("/", "home", null);
    } else {
      if (currentUser) {
        fetchTrips();
      }
      navigateTo("/trips", "trips", null);
    }
  }

  function handleOpenTrip(trip: TripRecord) {
    setActiveTrip(trip);
    navigateTo(`/trips/${trip.id}`, "detail", trip.id);
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF5E8] text-[#3B2723]">
      <Navbar
        activeRoute={activeRoute}
        tripCount={trips.length}
        currentUser={currentUser}
        isCheckingAuth={isCheckingAuth}
        onNavigate={handleNavClick}
        onOpenAuth={(mode) => openAuthModal(mode, null)}
        onLogout={handleLogout}
      />

      <main className="flex-1">
        {isGenerating && generatingMeta ? (
          <GeneratingState
            destination={generatingMeta.destination}
            dayCount={generatingMeta.dayCount}
          />
        ) : activeRoute === "home" ? (
          <TripPlannerForm
            onSubmit={handleGenerateTrip}
            isSubmitting={isGenerating}
            serverError={generateError}
          />
        ) : activeRoute === "trips" ? (
          <MyTripsView
            trips={trips}
            currentUser={currentUser}
            isLoading={isLoadingTrips}
            error={tripsError}
            onOpenTrip={handleOpenTrip}
            onDeleteTrip={handleDeleteTrip}
            onPlanNew={() => handleNavClick("home")}
            onOpenAuth={(mode) => openAuthModal(mode, null)}
          />
        ) : currentUser && activeTrip ? (
          <ItineraryView
            trip={activeTrip}
            onBackToTrips={() => handleNavClick("trips")}
            onPlanNew={() => handleNavClick("home")}
          />
        ) : (
          <MyTripsView
            trips={trips}
            currentUser={currentUser}
            isLoading={isLoadingTrips}
            error={tripsError}
            onOpenTrip={handleOpenTrip}
            onDeleteTrip={handleDeleteTrip}
            onPlanNew={() => handleNavClick("home")}
            onOpenAuth={(mode) => openAuthModal(mode, null)}
          />
        )}
      </main>

      <footer className="border-t border-[#EADACC] py-6 mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#6E524B]">
          <div className="flex items-center gap-2">
            <PlanoraLogoMark className="w-5 h-5 shrink-0" />
            <span className="font-heading font-semibold text-[#3B2723]">Planora</span>
            <SunCloudDoodle className="w-5 h-5 shrink-0" />
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => handleNavClick("home")}
              className="hover:text-[#3B2723] transition-colors cursor-pointer"
            >
              Plan a Trip
            </button>
            <button
              type="button"
              onClick={() => handleNavClick("trips")}
              className="hover:text-[#3B2723] transition-colors cursor-pointer"
            >
              My Trips
            </button>
          </div>
        </div>
      </footer>

      <AuthModal
        isOpen={authModalOpen}
        initialMode={authModalMode}
        contextMessage={authContextMessage}
        onClose={() => {
          setAuthModalOpen(false);
          setAuthContextMessage(null);
          setPendingTripInput(null);
        }}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}
