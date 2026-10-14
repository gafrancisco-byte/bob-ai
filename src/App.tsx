import { useState } from "react";
import { AuthProvider, useAuth } from "./AuthContext";
import { TimekeepingProvider, useTimekeeping } from "./TimekeepingContext";
import { ThemeProvider, useTheme } from "./ThemeContext";
import type { View } from "./types";
import ClockInOut from "./components/ClockInOut";
import DailyTimesheet from "./components/DailyTimesheet";
import WeeklySummary from "./components/WeeklySummary";
import LoginPage from "./components/LoginPage";
import ProfileModal from "./components/ProfileModal";

const NAV_ITEMS: { id: View; label: string }[] = [
  { id: "clock",  label: "Clock In / Out"  },
  { id: "daily",  label: "Daily Timesheet" },
  { id: "weekly", label: "Cutoff Summary"  },
];

// ── Theme toggle button ────────────────────────────────────────────────────────
function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300"
      aria-label="Toggle dark mode"
    >
      {theme === "dark" ? (
        /* Sun icon */
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 7a5 5 0 100 10A5 5 0 0012 7z" />
        </svg>
      ) : (
        /* Moon icon */
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </svg>
      )}
    </button>
  );
}

// ── Shift-in-progress dot ──────────────────────────────────────────────────────
function StatusDot() {
  const { nextPunch, todayEntry } = useTimekeeping();
  const isActive = todayEntry !== null && nextPunch !== null;
  return isActive ? (
    <span
      className="inline-block h-2 w-2 rounded-full bg-green-400 animate-pulse"
      title="Shift in progress"
    />
  ) : null;
}

// ── Avatar initials ────────────────────────────────────────────────────────────
function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

// ── Main shell (only rendered when authenticated) ─────────────────────────────
function Shell() {
  const { employee } = useAuth();
  const [view, setView] = useState<View>("clock");
  const [profileOpen, setProfileOpen] = useState(false);

  if (!employee) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">

          {/* Left: employee avatar + name button */}
          <button
            onClick={() => setProfileOpen(true)}
            className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors hover:bg-gray-100 active:bg-gray-200 dark:hover:bg-gray-800 dark:active:bg-gray-700"
            title="View / edit profile"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 select-none dark:bg-indigo-900 dark:text-indigo-300">
              {initials(employee.name)}
            </span>
            <span className="text-left">
              <span className="block text-sm font-semibold text-gray-800 leading-tight dark:text-gray-100">
                {employee.name}
              </span>
              <span className="block text-xs text-gray-400 leading-tight dark:text-gray-500">
                {employee.department}
              </span>
            </span>
          </button>

          {/* Right: brand + dot + theme toggle */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold tracking-tight text-indigo-700 dark:text-indigo-400">HRIS</span>
            <span className="text-xs text-gray-400 font-light dark:text-gray-600">Timekeeping</span>
            <StatusDot />
            <ThemeToggle />
          </div>
        </div>

        {/* Tabs */}
        <nav className="mx-auto max-w-3xl px-4">
          <div className="flex gap-1">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
                  view === item.id
                    ? "text-indigo-700 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-indigo-600 dark:text-indigo-400 dark:after:bg-indigo-500"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </nav>
      </header>

      {/* Page content */}
      <main className="mx-auto max-w-3xl px-4 py-8">
        {view === "clock"  && <ClockInOut />}
        {view === "daily"  && <DailyTimesheet />}
        {view === "weekly" && <WeeklySummary />}
      </main>

      {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}
    </div>
  );
}

// ── Auth gate ──────────────────────────────────────────────────────────────────
function AuthGate() {
  const { employee } = useAuth();
  if (!employee) return <LoginPage />;
  return (
    <TimekeepingProvider>
      <Shell />
    </TimekeepingProvider>
  );
}

// ── Root ───────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </ThemeProvider>
  );
}
