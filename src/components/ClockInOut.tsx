import { useState, useEffect } from "react";
import { useTimekeeping, expectedOutMins } from "../TimekeepingContext";

function fmt(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function fmtMins(totalMins: number) {
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

export default function ClockInOut() {
  const { todayEntry, nextPunch, canPunch, isLate, isOT, punch } = useTimekeeping();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // ── Derived state ────────────────────────────────────────────────────────────
  const regularDone  = !!todayEntry?.afternoonOut;
  const isClockedIn  = todayEntry !== null && (
    // In morning session
    (!!todayEntry.morningIn && !todayEntry.morningOut) ||
    // In afternoon session
    (!!todayEntry.afternoonIn && !todayEntry.afternoonOut) ||
    // In OT session
    (!!todayEntry.overtimeIn && !todayEntry.overtimeOut)
  );
  const everythingDone = nextPunch === null && todayEntry !== null;

  // Which session's clock-in to use for the elapsed timer
  const sessionStart =
    todayEntry?.overtimeIn && !todayEntry.overtimeOut
      ? todayEntry.overtimeIn
      : todayEntry?.afternoonIn && !todayEntry.afternoonOut
      ? todayEntry.afternoonIn
      : todayEntry?.morningIn && !todayEntry.morningOut
      ? todayEntry.morningIn
      : null;

  const elapsed = isClockedIn && sessionStart
    ? Math.floor((now.getTime() - new Date(sessionStart).getTime()) / 1000)
    : 0;
  const elHH = String(Math.floor(elapsed / 3600)).padStart(2, "0");
  const elMM = String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0");
  const elSS = String(elapsed % 60).padStart(2, "0");

  // ── Button config ────────────────────────────────────────────────────────────
  const isClockInAction =
    nextPunch === "morningIn" || nextPunch === "afternoonIn" || nextPunch === "overtimeIn";

  const btnLabel = (() => {
    if (nextPunch === "overtimeIn")  return "OT Clock In";
    if (nextPunch === "overtimeOut") return "OT Clock Out";
    return isClockInAction ? "Clock In" : "Clock Out";
  })();

  const btnColor = (() => {
    if (nextPunch === "overtimeIn" || nextPunch === "overtimeOut")
      return "bg-amber-500 hover:bg-amber-600 active:bg-amber-700";
    return isClockInAction
      ? "bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800"
      : "bg-red-500 hover:bg-red-600 active:bg-red-700";
  })();

  // Expected end time label for the regular shift
  const expectedEndLabel = todayEntry?.morningIn
    ? fmtMins(expectedOutMins(todayEntry.morningIn))
    : null;

  return (
    <div className="flex flex-col items-center gap-6 py-10">
      {/* Live clock */}
      <p className="text-5xl font-mono font-semibold text-gray-800 dark:text-gray-100 tabular-nums">
        {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </p>
      <p className="text-sm text-gray-500">
        {now.toLocaleDateString([], { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
      </p>

      {/* Status badges */}
      <div className="flex flex-wrap justify-center items-center gap-2">
        <span
          className={`inline-flex items-center gap-2 rounded-full px-4 py-1 text-sm font-medium ${
            isClockedIn ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${isClockedIn ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
          {everythingDone ? "Day Complete" : isClockedIn ? "Clocked In" : "Clocked Out"}
        </span>

        {isLate && (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-600 dark:bg-red-950 dark:text-red-400">
            ⚠ Late
          </span>
        )}
        {isOT && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-400">
            OT
          </span>
        )}
      </div>

      {/* Expected end-time hint (only after clocking in, before regular shift ends) */}
      {todayEntry?.morningIn && !regularDone && expectedEndLabel && (
        <p className="text-xs text-gray-400">
          Expected clock-out: <span className="font-semibold text-gray-600 dark:text-gray-300">{expectedEndLabel}</span>
        </p>
      )}

      {/* Elapsed timer */}
      {isClockedIn && sessionStart && (
        <div className="text-center">
          <p className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-600 mb-1">
            {isOT && todayEntry?.overtimeIn && !todayEntry?.overtimeOut ? "OT Elapsed" : "Elapsed"}
          </p>
          <p className={`text-3xl font-mono font-semibold tabular-nums ${
            isOT && todayEntry?.overtimeIn && !todayEntry?.overtimeOut
              ? "text-amber-600"
              : "text-indigo-600"
          }`}>
            {elHH}:{elMM}:{elSS}
          </p>
          <p className="text-xs text-gray-400 mt-1">Since {fmt(sessionStart)}</p>
        </div>
      )}

      {/* Everything done */}
      {everythingDone && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-6 py-4 text-center dark:border-green-900 dark:bg-green-950">
          <p className="text-sm font-semibold text-green-700 dark:text-green-400">✓ Day complete — all punches recorded</p>
          {todayEntry?.morningIn && (
            <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">
              Arrived {fmt(todayEntry.morningIn)}
              {isLate ? " · Late" : ""}
              {isOT ? " · OT logged" : ""}
            </p>
          )}
        </div>
      )}

      {/* Regular shift done — OT prompt */}
      {regularDone && !everythingDone && nextPunch === "overtimeIn" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-center text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400">
          Regular shift complete. Clock in again to log <span className="font-semibold">overtime</span>.
        </div>
      )}

      {/* Action button */}
      {!everythingDone && (
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={punch}
            disabled={!canPunch}
            className={`mt-2 w-48 rounded-xl py-3 text-base font-semibold text-white shadow transition-colors ${
              canPunch ? btnColor : "cursor-not-allowed bg-gray-300 dark:bg-gray-700 dark:text-gray-500"
            }`}
          >
            {btnLabel}
          </button>
          {!canPunch && nextPunch === "morningIn" && (
            <p className="text-xs text-gray-400 dark:text-gray-600">Available from 7:00 AM</p>
          )}
          {!canPunch && nextPunch === "afternoonOut" && expectedEndLabel && (
            <p className="text-xs text-gray-400 dark:text-gray-600">
              Available at {expectedEndLabel}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
