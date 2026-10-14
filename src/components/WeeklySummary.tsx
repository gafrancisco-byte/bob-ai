import { useState } from "react";
import { useTimekeeping, regularHours, overtimeHours, isLatePunch } from "../TimekeepingContext";
import type { TimeEntry } from "../types";

const STANDARD_HOURS_PER_DAY = 8;

// ── Cutoff helpers ─────────────────────────────────────────────────────────────

interface Cutoff {
  year: number;
  month: number; // 1-based
  half: 1 | 2;  // 1 = 1st–15th, 2 = 16th–end
}

function cutoffLabel({ year, month, half }: Cutoff): string {
  const monthName = new Date(year, month - 1, 1).toLocaleDateString([], { month: "long", year: "numeric" });
  return half === 1
    ? `1 – 15 ${monthName}`
    : `16 – ${lastDayOf(year, month)} ${monthName}`;
}

function lastDayOf(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** Returns all ISO date strings (YYYY-MM-DD) that belong to the given cutoff */
function cutoffDates({ year, month, half }: Cutoff): string[] {
  const start = half === 1 ? 1 : 16;
  const end   = half === 1 ? 15 : lastDayOf(year, month);
  const dates: string[] = [];
  for (let d = start; d <= end; d++) {
    const mm = String(month).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    dates.push(`${year}-${mm}-${dd}`);
  }
  return dates;
}

/** Current cutoff based on today */
function currentCutoff(): Cutoff {
  const now = new Date();
  return {
    year:  now.getFullYear(),
    month: now.getMonth() + 1,
    half:  now.getDate() <= 15 ? 1 : 2,
  };
}

/** Move to previous cutoff */
function prevCutoff({ year, month, half }: Cutoff): Cutoff {
  if (half === 2) return { year, month, half: 1 };
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear  = month === 1 ? year - 1 : year;
  return { year: prevYear, month: prevMonth, half: 2 };
}

/** Move to next cutoff */
function nextCutoff({ year, month, half }: Cutoff): Cutoff {
  if (half === 1) return { year, month, half: 2 };
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear  = month === 12 ? year + 1 : year;
  return { year: nextYear, month: nextMonth, half: 1 };
}

/** True if the given cutoff is in the future (past today) */
function isFutureCutoff(c: Cutoff): boolean {
  const today = new Date();
  const cutoffStart = new Date(c.year, c.month - 1, c.half === 1 ? 1 : 16);
  return cutoffStart > today;
}

// ── Formatting ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString([], {
    weekday: "short", month: "short", day: "numeric",
  });
}

function isWeekend(iso: string): boolean {
  const d = new Date(iso + "T12:00:00").getDay();
  return d === 0 || d === 6;
}

function hhmm(hours: number): string {
  const hh = Math.floor(hours);
  const mm = Math.round((hours - hh) * 60);
  return `${hh}h ${mm}m`;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function CutoffSummary() {
  const { entries } = useTimekeeping();
  const [cutoff, setCutoff] = useState<Cutoff>(currentCutoff);

  const dates = cutoffDates(cutoff);
  const todayIso = new Date().toISOString().slice(0, 10);

  type DaySummary = {
    iso: string;
    entry: TimeEntry | null;
    regular: number;
    ot: number;
    total: number;
    late: boolean;
    weekend: boolean;
    isFuture: boolean;
  };

  const summaries: DaySummary[] = dates.map((iso) => {
    const dayEntries = entries.filter((e) => e.date === iso);
    const entry  = dayEntries[0] ?? null;
    const regular = dayEntries.reduce((s, e) => s + regularHours(e), 0);
    const ot      = dayEntries.reduce((s, e) => s + overtimeHours(e), 0);
    const late    = entry?.morningIn ? isLatePunch(entry.morningIn) : false;
    return {
      iso,
      entry,
      regular,
      ot,
      total: regular + ot,
      late,
      weekend: isWeekend(iso),
      isFuture: iso > todayIso,
    };
  });

  // Totals — only weekdays, only past/today
  const workdays = summaries.filter((d) => !d.weekend && !d.isFuture);
  const cutoffRegular  = workdays.reduce((s, d) => s + d.regular, 0);
  const cutoffOT       = workdays.reduce((s, d) => s + d.ot,      0);
  const cutoffTotal    = cutoffRegular + cutoffOT;
  const targetDays     = workdays.length;
  const targetHours    = targetDays * STANDARD_HOURS_PER_DAY;
  const undertime      = Math.max(0, targetHours - cutoffRegular);
  const lateDays       = workdays.filter((d) => d.late).length;

  // Bar chart
  const maxBar = Math.max(...summaries.map((d) => d.total), STANDARD_HOURS_PER_DAY);

  const nc = nextCutoff(cutoff);

  return (
    <div className="space-y-6">
      {/* Period navigator */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCutoff((c) => prevCutoff(c))}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
        >
          ← Prev
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-700">{cutoffLabel(cutoff)}</p>
          <p className="text-xs text-gray-400">{cutoff.half === 1 ? "1st Cutoff" : "2nd Cutoff"}</p>
        </div>
        <button
          onClick={() => setCutoff((c) => nextCutoff(c))}
          disabled={isFutureCutoff(nc)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next →
        </button>
      </div>

      {/* Stacked bar chart */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-end gap-1 h-32 overflow-x-auto">
          {summaries.map((d) => {
            const isToday   = d.iso === todayIso;
            const totalPct  = maxBar > 0 ? (d.total   / maxBar) * 100 : 0;
            const otPct     = maxBar > 0 ? (d.ot      / maxBar) * 100 : 0;
            const regPct    = totalPct - otPct;
            const dayNum    = parseInt(d.iso.slice(8), 10);
            return (
              <div key={d.iso} className="flex flex-1 min-w-[18px] flex-col items-center gap-0.5">
                <div className="relative w-full flex flex-col-reverse items-stretch" style={{ height: "88px" }}>
                  {d.isFuture ? (
                    <div className="w-full rounded-t border border-dashed border-gray-200" style={{ height: "4px" }} />
                  ) : d.weekend ? (
                    <div className="w-full rounded-t bg-gray-100" style={{ height: "4px" }} />
                  ) : (
                    <>
                      <div
                        className={`w-full ${d.ot > 0 ? "" : "rounded-t"} transition-all ${
                          isToday ? "bg-indigo-500" : "bg-indigo-200"
                        }`}
                        style={{ height: `${regPct}%`, minHeight: d.regular > 0 ? "4px" : "0" }}
                      />
                      {d.ot > 0 && (
                        <div
                          className="w-full rounded-t bg-amber-400 transition-all"
                          style={{ height: `${otPct}%`, minHeight: "4px" }}
                        />
                      )}
                    </>
                  )}
                </div>
                <span className={`text-[10px] tabular-nums font-medium ${
                  isToday ? "text-indigo-600" : d.weekend ? "text-gray-300" : "text-gray-500"
                }`}>
                  {dayNum}
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex items-center justify-end gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-indigo-300" /> Regular</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-amber-400" /> OT</span>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total (incl. OT)", value: hhmm(cutoffTotal),   color: "text-indigo-700" },
          { label: "Regular Hours",    value: hhmm(cutoffRegular), color: "text-gray-700"   },
          { label: "Overtime Hours",   value: hhmm(cutoffOT),      color: "text-amber-600"  },
          { label: "Undertime",        value: hhmm(undertime),     color: "text-red-500"    },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
            <p className="text-xs text-gray-400">{s.label}</p>
            <p className={`mt-1 text-xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Late days callout */}
      {lateDays > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900 dark:bg-red-950">
          <span className="text-sm font-semibold text-red-600 dark:text-red-400">⚠ {lateDays} late {lateDays === 1 ? "day" : "days"} this cutoff</span>
        </div>
      )}

      {/* Per-day breakdown table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500 dark:bg-gray-900 dark:text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Clock In</th>
              <th className="px-4 py-3 text-left">Clock Out</th>
              <th className="px-4 py-3 text-right">Regular</th>
              <th className="px-4 py-3 text-right text-amber-600">OT</th>
              <th className="px-4 py-3 text-right">vs Target</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {summaries.map((d) => {
              const isToday = d.iso === todayIso;
              const diff    = !d.weekend && !d.isFuture
                ? d.regular - STANDARD_HOURS_PER_DAY
                : null;

              return (
                <tr
                  key={d.iso}
                  className={`${
                    d.isFuture  ? "opacity-30 dark:opacity-20" :
                    isToday     ? "bg-indigo-50 dark:bg-indigo-950/30" :
                    d.weekend   ? "bg-gray-50 text-gray-400 dark:bg-gray-900/50 dark:text-gray-600" :
                    "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  }`}
                >
                  {/* Date */}
                  <td className={`px-4 py-2.5 font-medium ${isToday ? "text-indigo-700 dark:text-indigo-400" : d.weekend ? "text-gray-400 dark:text-gray-600" : "text-gray-700 dark:text-gray-300"}`}>
                    <div className="flex items-center gap-2">
                      {fmtDate(d.iso)}
                      {d.late && (
                        <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-600 dark:bg-red-950 dark:text-red-400">Late</span>
                      )}
                      {d.weekend && (
                        <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-400 dark:bg-gray-800 dark:text-gray-600">Off</span>
                      )}
                    </div>
                  </td>

                  {/* Clock In */}
                  <td className="px-4 py-2.5 font-mono text-gray-600 dark:text-gray-400">
                    {d.entry?.morningIn
                      ? new Date(d.entry.morningIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : <span className="text-gray-300 dark:text-gray-700">—</span>}
                  </td>

                  {/* Clock Out (afternoonOut or active) */}
                  <td className="px-4 py-2.5 font-mono text-gray-600 dark:text-gray-400">
                    {d.entry?.afternoonOut
                      ? new Date(d.entry.afternoonOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : d.entry?.morningIn && !d.isFuture
                      ? <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />Active
                        </span>
                      : <span className="text-gray-300 dark:text-gray-700">—</span>}
                  </td>

                  {/* Regular */}
                  <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-gray-800 dark:text-gray-200">
                    {d.regular > 0 ? hhmm(d.regular) : <span className="text-gray-300 dark:text-gray-700">—</span>}
                  </td>

                  {/* OT */}
                  <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-amber-600">
                    {d.ot > 0 ? hhmm(d.ot) : <span className="text-gray-300 dark:text-gray-700">—</span>}
                  </td>

                  {/* vs Target */}
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {diff === null ? (
                      <span className="text-gray-300 dark:text-gray-700">—</span>
                    ) : diff >= 0 ? (
                      <span className="text-amber-500">+{diff.toFixed(2)} h</span>
                    ) : (
                      <span className="text-red-400">{diff.toFixed(2)} h</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t-2 border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
            <tr>
              <td colSpan={3} className="px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">
                Cutoff Total
                <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-600">({targetDays} workday{targetDays !== 1 ? "s" : ""} · {targetHours}h target)</span>
              </td>
              <td className="px-4 py-3 text-right text-sm font-bold text-indigo-700 tabular-nums">
                {hhmm(cutoffRegular)}
              </td>
              <td className="px-4 py-3 text-right text-sm font-bold text-amber-600 tabular-nums">
                {cutoffOT > 0 ? hhmm(cutoffOT) : "—"}
              </td>
              <td className="px-4 py-3 text-right text-sm font-semibold tabular-nums">
                {(cutoffRegular - targetHours) >= 0 ? (
                  <span className="text-amber-500">+{(cutoffRegular - targetHours).toFixed(2)} h</span>
                ) : (
                  <span className="text-red-400">{(cutoffRegular - targetHours).toFixed(2)} h</span>
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
