import { useEffect, useState } from "react";
import { Eye, EyeOff, X } from "lucide-react";
import type { AuthUser } from "../types/trip";
import { PlanoraLogoMark } from "./WhimsicalDoodles";

export type AuthMode = "login" | "signup";

interface AuthModalProps {
  isOpen: boolean;
  initialMode: AuthMode;
  contextMessage?: string | null;
  onClose: () => void;
  onSuccess: (user: AuthUser) => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function AuthModal({
  isOpen,
  initialMode,
  contextMessage,
  onClose,
  onSuccess,
}: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setError(null);
      setPassword("");
      setShowPassword(false);
      setImgFailed(false);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  function switchMode(next: AuthMode) {
    setMode(next);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim().replace(/\s+/g, " ");

    if (mode === "signup" && (trimmedName.length < 2 || trimmedName.length > 80)) {
      setError("Please enter your name (at least 2 characters).");
      return;
    }
    if (!trimmedEmail || !EMAIL_REGEX.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (mode === "signup" && password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (mode === "login" && !password) {
      setError("Please enter your password.");
      return;
    }

    setIsSubmitting(true);
    try {
      const endpoint = mode === "signup" ? "/api/auth/signup" : "/api/auth/login";
      const payload =
        mode === "signup"
          ? { name: trimmedName, email: trimmedEmail, password }
          : { email: trimmedEmail, password };

      const res = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Requested-With": "Planora",
        },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let data: { user?: AuthUser; error?: string } | null = null;
      if (text) {
        try {
          data = JSON.parse(text) as { user?: AuthUser; error?: string };
        } catch {
          data = null;
        }
      }

      if (!res.ok || !data?.user) {
        throw new Error(
          data?.error ||
            (mode === "signup"
              ? "Could not create your account. Please try again."
              : "Could not log in. Please check your credentials.")
        );
      }

      onSuccess(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3B2723]/40 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="w-full max-w-md bg-[#FFFCF7] border border-[#EADACC] rounded-3xl p-6 sm:p-8 shadow-lg space-y-5 relative">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close authentication modal"
          className="absolute top-5 right-5 p-1.5 rounded-lg text-[#6E524B] hover:text-[#3B2723] hover:bg-[#F9EBDC] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 pr-8">
          {!imgFailed ? (
            <img
              src={
                mode === "signup"
                  ? "/src/assets/images/sunset_mini_mountain_1795500841244.jpg"
                  : "/src/assets/images/sunset_globe_plane_1795500199385.jpg"
              }
              alt={
                mode === "signup"
                  ? "Tiny whimsical mountains and paper airplane"
                  : "Tiny globe with soaring paper airplane"
              }
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className="w-11 h-11 rounded-xl object-cover border border-[#EADACC] bg-[#FFF5E8] shrink-0"
            />
          ) : (
            <PlanoraLogoMark className="w-9 h-9 shrink-0" />
          )}
          <div>
            <h2
              id="auth-modal-title"
              className="font-heading text-xl font-bold text-[#3B2723]"
            >
              {mode === "signup" ? "Create your account" : "Welcome back"}
            </h2>
            <p className="text-xs text-[#6E524B]">
              {mode === "signup"
                ? "Save your itineraries and access them anytime."
                : "Log in to view and manage your saved trips."}
            </p>
          </div>
        </div>

        {contextMessage && (
          <div className="rounded-xl bg-[#FFF4D2] border border-[#FFD166] px-3.5 py-2.5 text-xs font-medium text-[#3B2723]">
            {contextMessage}
          </div>
        )}

        {/* Mode Toggle */}
        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#FFF5E8] border border-[#EADACC]">
          <button
            type="button"
            onClick={() => switchMode("login")}
            className={`py-2 rounded-lg text-xs font-heading font-semibold transition-colors cursor-pointer ${
              mode === "login"
                ? "bg-[#FFFCF7] text-[#A94D67] border border-[#F4775B] shadow-xs"
                : "text-[#6E524B] border border-transparent hover:text-[#3B2723]"
            }`}
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => switchMode("signup")}
            className={`py-2 rounded-lg text-xs font-heading font-semibold transition-colors cursor-pointer ${
              mode === "signup"
                ? "bg-[#FFFCF7] text-[#A94D67] border border-[#F4775B] shadow-xs"
                : "text-[#6E524B] border border-transparent hover:text-[#3B2723]"
            }`}
          >
            Sign up
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-xl bg-[#FEF2F2] border border-[#FECACA] px-4 py-3 text-sm text-[#B91C1C]"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {mode === "signup" && (
            <div className="space-y-1.5">
              <label htmlFor="auth-name" className="block text-xs font-medium text-[#3B2723]">
                Full name
              </label>
              <input
                id="auth-name"
                name="name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Devika Sharma"
                maxLength={80}
                required
                className="w-full rounded-xl border border-[#DEC9B8] bg-[#FFF5E8] px-3.5 py-2.5 text-sm text-[#3B2723] placeholder:text-[#9C8179] focus:border-[#F4775B] focus:bg-[#FFFCF7] focus:outline-none transition-colors"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="auth-email" className="block text-xs font-medium text-[#3B2723]">
              Email address
            </label>
            <input
              id="auth-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              maxLength={254}
              required
              className="w-full rounded-xl border border-[#DEC9B8] bg-[#FFF5E8] px-3.5 py-2.5 text-sm text-[#3B2723] placeholder:text-[#9C8179] focus:border-[#F4775B] focus:bg-[#FFFCF7] focus:outline-none transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="auth-password" className="block text-xs font-medium text-[#3B2723]">
              Password
            </label>
            <div className="relative">
              <input
                id="auth-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "At least 8 characters" : "Enter your password"}
                maxLength={128}
                required
                className="w-full rounded-xl border border-[#DEC9B8] bg-[#FFF5E8] pl-3.5 pr-10 py-2.5 text-sm text-[#3B2723] placeholder:text-[#9C8179] focus:border-[#F4775B] focus:bg-[#FFFCF7] focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#6E524B] hover:text-[#3B2723] cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-5 rounded-xl bg-[#A94D67] hover:bg-[#913E55] disabled:opacity-60 text-white font-heading font-semibold text-sm transition-colors cursor-pointer shadow-xs"
          >
            {isSubmitting
              ? mode === "signup"
                ? "Creating account..."
                : "Logging in..."
              : mode === "signup"
                ? "Create Account"
                : "Log In"}
          </button>
        </form>
      </div>
    </div>
  );
}
