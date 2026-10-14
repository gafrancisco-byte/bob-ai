import { useState } from "react";
import { useTimekeeping, isLatePunch, regularHours, overtimeHours } from "../TimekeepingContext";
import type { TimeEntry } from "../types";

function toLocalDate(iso: string) {
  return new Date(iso).toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtTime(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

function PunchCell({ iso }: { iso: string | null }) {
  const t = fmtTime(iso);
  if (t) return <span className="font-mono text-gray-700 dark:text-gray-300">{t}</span>;
  return <span className="text-gray-300 dark:text-gray-700 text-xs italic">—</span>;
}

function ActivePill({ label = "Active" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-green-600">
      <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
      {label}
    </span>
  );
}

function PendingPill() {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-amber-600">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
      Pending
    </span>
  );
}

function hhmm(hours: number) {
  const hh = Math.floor(hours);
  const mm = Math.round((hours - hh) * 60);
  return `${hh}h ${mm}m`;
}

export default function DailyTimesheet() {
  const { entries } = useTimekeeping();
  const [selectedDate, setSelectedDate] = useState(isoToday);

  const dayEntries = entries.filter((e) => e.date === selectedDate);

  const totalRegular  = dayEntries.reduce((s, e) => s + regularHours(e),  0);
  const totalOvertime = dayEntries.reduce((s, e) => s + overtimeHours(e), 0);
  const grandTotal    = totalRegular + totalOvertime;

  return (
    <div className="space-y-6">
      {/* Date picker */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-600">Date</label>
        <input
          type="date"
          value={selectedDate}
          max={isoToday()}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
        />
        <span className="text-sm text-gray-400">{toLocalDate(selectedDate + "T12:00:00")}</span>
      </div>

      {/* Entries table */}
      {dayEntries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 py-12 text-center text-sm text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-600">
          No entries for this day.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500 dark:bg-gray-900 dark:text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">Morning In</th>
                  <th className="px-4 py-3 text-left">Morning Out</th>
                  <th className="px-4 py-3 text-left">Afternoon In</th>
                  <th className="px-4 py-3 text-left">Afternoon Out</th>
                  <th className="px-4 py-3 text-left border-l border-amber-200 bg-amber-50">OT In</th>
                  <th className="px-4 py-3 text-left border-amber-200 bg-amber-50">OT Out</th>
                  <th className="px-4 py-3 text-right">Regular</th>
                  <th className="px-4 py-3 text-right text-amber-600">OT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {dayEntries.map((entry: TimeEntry) => {
                  const reg  = regularHours(entry);
                  const ot   = overtimeHours(entry);
                  const late = entry.morningIn ? isLatePunch(entry.morningIn) : false;
                  const regularActive = !!entry.afternoonIn && !entry.afternoonOut;
                  const otActive      = !!entry.overtimeIn  && !entry.overtimeOut;

                  return (
                    <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      {/* Morning In */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <PunchCell iso={entry.morningIn} />
                          {late && (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">
                              Late
                            </span>
                          )}
                          {entry.morningIn && !entry.morningOut && <ActivePill />}
                        </div>
                      </td>

                      {/* Morning Out */}
                      <td className="px-4 py-3">
                        {entry.morningOut
                          ? <PunchCell iso={entry.morningOut} />
                          : entry.morningIn
                          ? <PendingPill />
                          : <PunchCell iso={null} />}
                      </td>

                      {/* Afternoon In */}
                      <td className="px-4 py-3">
                        <PunchCell iso={entry.afternoonIn} />
                      </td>

                      {/* Afternoon Out */}
                      <td className="px-4 py-3">
                        {entry.afternoonOut
                          ? <PunchCell iso={entry.afternoonOut} />
                          : regularActive
                          ? <ActivePill />
                          : <PunchCell iso={null} />}
                      </td>

                      {/* OT In */}
                      <td className="px-4 py-3 border-l border-amber-100 bg-amber-50/30">
                        {entry.overtimeIn
                          ? <PunchCell iso={entry.overtimeIn} />
                          : entry.afternoonOut
                          ? <span className="text-xs text-gray-300 italic">Optional</span>
                          : <PunchCell iso={null} />}
                      </td>

                      {/* OT Out */}
                      <td className="px-4 py-3 bg-amber-50/30">
                        {entry.overtimeOut
                          ? <PunchCell iso={entry.overtimeOut} />
                          : otActive
                          ? <ActivePill label="OT Active" />
                          : <PunchCell iso={null} />}
                      </td>

                      {/* Regular hours */}
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-gray-800">
                        {entry.afternoonOut ? hhmm(reg) : "—"}
                      </td>

                      {/* OT hours */}
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-amber-600">
                        {entry.overtimeOut ? hhmm(ot) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
                <tr>
                  <td colSpan={6} className="px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">
                    Totals
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-indigo-700 tabular-nums">
                    {hhmm(totalRegular)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-amber-600 tabular-nums">
                    {totalOvertime > 0 ? hhmm(totalOvertime) : "—"}
                  </td>
                </tr>
                {totalOvertime > 0 && (
                  <tr className="border-t border-gray-100">
                    <td colSpan={6} className="px-4 py-2 text-xs text-gray-400">
                      Grand Total (incl. OT)
                    </td>
                    <td colSpan={2} className="px-4 py-2 text-right text-sm font-bold text-gray-700 tabular-nums">
                      {hhmm(grandTotal)}
                    </td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
