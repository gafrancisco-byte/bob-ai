import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { TimeEntry, Punch } from "./types";

const STORAGE_KEY = "hris_time_entries_v3";

// ── Schedule constants ─────────────────────────────────────────────────────────
/** Earliest allowed clock-in (07:00) */
const EARLIEST_IN_MINS = 7 * 60;
/** Latest on-time clock-in (09:00); past this is LATE */
const LATE_CUTOFF_MINS = 9 * 60;
/** Noon punch window: 12:00 ±2 min tolerance */
const NOON_MINS = 12 * 60;
const NOON_TOLERANCE = 2;
/** Standard shift length in minutes */
const SHIFT_MINS = 8 * 60;

// ── Helpers ────────────────────────────────────────────────────────────────────

function minutesOf(d: Date) {
  return d.getHours() * 60 + d.getMinutes();
}

/** True if morningIn was recorded after 09:00 */
export function isLatePunch(morningInIso: string): boolean {
  return minutesOf(new Date(morningInIso)) > LATE_CUTOFF_MINS;
}

/**
 * Compute the expected afternoon-out time (morningIn + 8 h).
 * Returns minutes-of-day, e.g. 960 for 4:00 PM.
 */
export function expectedOutMins(morningInIso: string): number {
  return minutesOf(new Date(morningInIso)) + SHIFT_MINS;
}

/**
 * Returns true if `now` is within the allowed window for a given punch.
 *
 * morningIn    : 07:00 → before noon (flexible start)
 * morningOut   : 12:00 ±2 min
 * afternoonIn  : 12:00 ±2 min
 * afternoonOut : morningIn + 8 h  (±5 min tolerance either side)
 * overtimeIn   : after afternoonOut has been recorded (any time)
 * overtimeOut  : after overtimeIn has been recorded (any time)
 */
export function isWindowOpen(
  punch: Punch,
  now: Date = new Date(),
  entry?: TimeEntry | null
): boolean {
  const mins = minutesOf(now);

  switch (punch) {
    case "morningIn":
      return mins >= EARLIEST_IN_MINS && mins < NOON_MINS;

    case "morningOut":
    case "afternoonIn":
      return Math.abs(mins - NOON_MINS) <= NOON_TOLERANCE;

    case "afternoonOut": {
      if (!entry?.morningIn) return false;
      const expected = expectedOutMins(entry.morningIn);
      // Allow punching out from (expected - 5 min) onwards with no upper cap
      return mins >= expected - 5;
    }

    case "overtimeIn":
      // Allowed any time after afternoonOut is already recorded
      return entry?.afternoonOut != null;

    case "overtimeOut":
      // Allowed any time after overtimeIn is recorded
      return entry?.overtimeIn != null;
  }
}

/** Human-readable label for a punch's window */
export function windowLabel(punch: Punch, entry?: TimeEntry | null): string {
  const fmtMins = (m: number) => {
    const h = Math.floor(m / 60);
    const min = m % 60;
    return `${h % 12 || 12}:${String(min).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
  };
  switch (punch) {
    case "morningIn":    return "7:00 AM – 11:58 AM";
    case "morningOut":   return "12:00 NN";
    case "afternoonIn":  return "12:00 NN";
    case "afternoonOut":
      if (entry?.morningIn) return `${fmtMins(expectedOutMins(entry.morningIn))} (8 h from clock-in)`;
      return "Clock-in + 8 h";
    case "overtimeIn":   return "After regular shift ends";
    case "overtimeOut":  return "After OT clock-in";
  }
}

// ── Worked-hours helpers (exported for reuse in components) ───────────────────

export function regularHours(entry: TimeEntry): number {
  let total = 0;
  if (entry.morningIn && entry.morningOut)
    total += (new Date(entry.morningOut).getTime() - new Date(entry.morningIn).getTime()) / 3_600_000;
  if (entry.afternoonIn && entry.afternoonOut)
    total += (new Date(entry.afternoonOut).getTime() - new Date(entry.afternoonIn).getTime()) / 3_600_000;
  return Math.max(0, total);
}

export function overtimeHours(entry: TimeEntry): number {
  if (!entry.overtimeIn || !entry.overtimeOut) return 0;
  return Math.max(
    0,
    (new Date(entry.overtimeOut).getTime() - new Date(entry.overtimeIn).getTime()) / 3_600_000
  );
}

// ── Storage ────────────────────────────────────────────────────────────────────

function load(): TimeEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as TimeEntry[]) : [];
  } catch {
    return [];
  }
}

function save(entries: TimeEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

// ── Context ────────────────────────────────────────────────────────────────────

interface TimekeepingCtx {
  entries: TimeEntry[];
  todayEntry: TimeEntry | null;
  /** Next punch the employee needs to make today (null = full day done incl. OT out if started) */
  nextPunch: Punch | null;
  /** Whether the current time satisfies the window for nextPunch */
  canPunch: boolean;
  /** True when today's morningIn was after 09:00 */
  isLate: boolean;
  /** True when an OT session is active or complete today */
  isOT: boolean;
  punch: () => void;
}

const Ctx = createContext<TimekeepingCtx | null>(null);

export function TimekeepingProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<TimeEntry[]>(load);
  const [now, setNow] = useState(new Date());

  // Re-evaluate every 30 s so windows open/close automatically
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    save(entries);
  }, [entries]);

  const todayEntry = entries.find((e) => e.date === todayIso()) ?? null;

  /** Determine next required punch in sequence */
  const nextPunch: Punch | null = (() => {
    if (!todayEntry || !todayEntry.morningIn)     return "morningIn";
    if (!todayEntry.morningOut)                    return "morningOut";
    if (!todayEntry.afternoonIn)                   return "afternoonIn";
    if (!todayEntry.afternoonOut)                  return "afternoonOut";
    // Regular shift complete — OT is optional but sequential once started
    if (!todayEntry.overtimeIn)                    return "overtimeIn";
    if (!todayEntry.overtimeOut)                   return "overtimeOut";
    return null; // everything done
  })();

  const canPunch =
    nextPunch !== null && isWindowOpen(nextPunch, now, todayEntry);

  const isLate = todayEntry?.morningIn ? isLatePunch(todayEntry.morningIn) : false;
  const isOT   = !!(todayEntry?.overtimeIn);

  const punch = useCallback(() => {
    if (!nextPunch || !isWindowOpen(nextPunch, new Date(), todayEntry)) return;

    const ts   = new Date().toISOString();
    const date = todayIso();

    setEntries((prev) => {
      const existing = prev.find((e) => e.date === date);
      if (!existing) {
        const entry: TimeEntry = {
          id: crypto.randomUUID(),
          date,
          morningIn: ts,
          morningOut: null,
          afternoonIn: null,
          afternoonOut: null,
          overtimeIn: null,
          overtimeOut: null,
        };
        return [...prev, entry];
      }
      return prev.map((e) =>
        e.date === date ? { ...e, [nextPunch]: ts } : e
      );
    });
  }, [nextPunch, todayEntry]);

  return (
    <Ctx.Provider value={{ entries, todayEntry, nextPunch, canPunch, isLate, isOT, punch }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTimekeeping() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTimekeeping must be used inside TimekeepingProvider");
  return ctx;
}
