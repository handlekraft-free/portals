import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Check, Clock, Globe } from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────────

export const AVAIL_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const AVAIL_TIMES = ["morning", "afternoon", "evening"] as const;
export type TimeOfDay = typeof AVAIL_TIMES[number];
export const TIME_LABELS: Record<TimeOfDay, string> = {
  morning:   "Morning (9 – 12 pm)",
  afternoon: "Afternoon (12 – 5 pm)",
  evening:   "Evening (5 – 8 pm)",
};
export interface AvailSlot { day: number; timeOfDay: TimeOfDay }

// ── Helper ────────────────────────────────────────────────────────────────────

function parseSlots(raw: unknown): AvailSlot[] {
  if (!raw) return [];
  try {
    const arr = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  /** If true, loads existing availability from the API on mount */
  autoLoad?: boolean;
  /** Optional initial slots to populate (bypasses autoLoad) */
  initialSlots?: AvailSlot[];
  /** Optional initial notes */
  initialNotes?: string;
  /** Called with updated slots + notes after a successful save */
  onSaved?: (slots: AvailSlot[], notes: string) => void;
  /** Prefix for data-testid attributes — defaults to "avail" */
  testIdPrefix?: string;
  /** When true, show compact Save + Skip buttons (wizard mode) */
  wizardMode?: boolean;
  onNext?: () => void;
  onSkip?: () => void;
}

export default function AvailabilityGrid({
  autoLoad = false,
  initialSlots,
  initialNotes = "",
  onSaved,
  testIdPrefix = "avail",
  wizardMode = false,
  onNext,
  onSkip,
}: Props) {
  const { toast } = useToast();
  const [slots, setSlots] = useState<AvailSlot[]>(initialSlots ?? []);
  const [notes, setNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(autoLoad);

  useEffect(() => {
    if (!autoLoad) return;
    (async () => {
      setLoading(true);
      const r = await apiRequest<{ slots: unknown; notes: string }>("GET", "/api/board/scheduling/availability/me");
      if (r.success && r.data) {
        setSlots(parseSlots(r.data.slots));
        setNotes(r.data.notes ?? "");
      }
      setLoading(false);
    })();
  }, [autoLoad]);

  function toggle(day: number, time: TimeOfDay) {
    setSlots(prev => prev.some(s => s.day === day && s.timeOfDay === time)
      ? prev.filter(s => !(s.day === day && s.timeOfDay === time))
      : [...prev, { day, timeOfDay: time }]
    );
  }

  async function save() {
    setSaving(true);
    const r = await apiRequest("PUT", "/api/board/scheduling/availability/me", { slots, notes });
    if (r.success) {
      toast({ title: "Availability saved!" });
      onSaved?.(slots, notes);
      onNext?.();
    } else {
      toast({ title: "Error", description: "Failed to save.", variant: "destructive" });
    }
    setSaving(false);
  }

  if (loading) return (
    <div className="space-y-2">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* PST timezone notice — prominent */}
      <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <Globe className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800">All times are Pacific Standard Time (PST / UTC−8)</p>
          <p className="text-xs text-amber-700 mt-0.5">
            If you're in a different timezone, please convert before selecting — or add a note below.
          </p>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto -mx-1">
        <table className="w-full min-w-[480px]">
          <thead>
            <tr>
              <th className="w-40 text-left text-xs text-slate-400 font-normal pb-3 pl-1">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> PST Window</span>
              </th>
              {AVAIL_DAYS.map(d => (
                <th key={d} className="text-xs text-slate-500 font-semibold text-center pb-3">{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {AVAIL_TIMES.map(t => (
              <tr key={t}>
                <td className="text-xs text-slate-500 pr-3 py-1.5 font-medium pl-1 whitespace-nowrap">
                  {TIME_LABELS[t]}
                </td>
                {AVAIL_DAYS.map((_, d) => {
                  const checked = slots.some(s => s.day === d && s.timeOfDay === t);
                  return (
                    <td key={d} className="py-1 px-0.5">
                      <button
                        onClick={() => toggle(d, t)}
                        className={`w-full h-10 rounded-xl border-2 transition-all flex items-center justify-center ${
                          checked
                            ? "border-[#2563EB] bg-[#2563EB]/15 text-[#2563EB]"
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        }`}
                        data-testid={`${testIdPrefix}-${d}-${t}`}
                        title={`${checked ? "Remove" : "Mark"} ${AVAIL_DAYS[d]} ${TIME_LABELS[t]}`}
                      >
                        {checked && <Check className="w-4 h-4" />}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Notes */}
      <div>
        <label className="text-xs text-slate-500 font-medium mb-1 block">
          Timezone or scheduling notes <span className="font-normal">(optional)</span>
        </label>
        <input
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="e.g. I'm in EST (UTC−5) — add 3 hours. Unavailable school holidays."
          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
          data-testid={`${testIdPrefix}-notes`}
        />
      </div>

      {/* Actions */}
      {wizardMode ? (
        <div className="flex gap-2">
          <Button onClick={onSkip} variant="outline" className="flex-1" data-testid={`${testIdPrefix}-skip`}>
            Skip for now
          </Button>
          <Button
            onClick={save}
            disabled={saving}
            className="flex-1 bg-[#2563EB] hover:bg-[#0a5c60] text-white gap-2"
            data-testid={`${testIdPrefix}-save`}
          >
            {saving ? "Saving…" : <><Check className="w-4 h-4" /> Save Availability</>}
          </Button>
        </div>
      ) : (
        <Button
          onClick={save}
          disabled={saving}
          className="bg-[#2563EB] hover:bg-[#0a5c60] text-white gap-2"
          data-testid={`${testIdPrefix}-save`}
        >
          {saving ? "Saving…" : <><Check className="w-4 h-4" /> Save Availability</>}
        </Button>
      )}
    </div>
  );
}
