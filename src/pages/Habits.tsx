import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { Check, Plus, X, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type HabitView = "tonight" | "history" | "manage";

// Accent colours reuse the existing journal palette
const ACCENT_CYCLE = [
  "--j-brain",
  "--j-gratitude",
  "--j-expressive",
  "--j-intention",
  "--j-retrieval",
  "--j-affirmation",
];

function accentColor(accentVar: string) {
  return `hsl(var(${accentVar}))`;
}

function todayIso() {
  return format(new Date(), "yyyy-MM-dd");
}

// ─── Manage ──────────────────────────────────────────────────────────────────

function HabitsManage({
  habits,
  onSaved,
}: {
  habits: HabitRow[];
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);

  const addMutation = useMutation({
    mutationFn: async (title: string) => {
      const accentVar = ACCENT_CYCLE[habits.length % ACCENT_CYCLE.length];
      const { error } = await supabase.from("habits").insert({
        user_id: user!.id,
        title,
        emoji: "✦",
        accent_var: accentVar,
        position: habits.length,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["habits"] });
      setDraft("");
      setAdding(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("habits").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["habits"] }),
  });

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="px-5 pt-4 pb-2 shrink-0">
        <div className="flex items-baseline gap-2.5 mb-3">
          <span className="font-mono text-[11px] tracking-[0.18em] text-ink-3 uppercase">Habits · Manage</span>
          <div className="flex-1 h-px bg-ink/10" />
          <span className="font-mono text-[11px] text-ink-3">{habits.length} ACTIVE</span>
        </div>
        <h1 className="font-display text-[28px] leading-[1.05] font-light">
          Define your{" "}
          <em className="font-serif not-italic font-normal italic">practice</em>.
        </h1>
        <p className="mt-2.5 text-[13px] text-ink-2 leading-relaxed">
          Add the small daily things you want to track. You'll check them off each night.
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-4">
        <div className="flex flex-col gap-2">
          {habits.map((h) => (
            <div
              key={h.id}
              className="flex items-center gap-3 px-3.5 py-3 border border-line-strong rounded bg-white/60"
            >
              <span className="text-xl">{h.emoji}</span>
              <div className="flex-1">
                <div className="font-serif text-[16px] font-medium">{h.title}</div>
                <div className="font-mono text-[9px] tracking-[0.1em] text-ink-3 mt-0.5">
                  EVERY EVENING
                </div>
              </div>
              <button
                onClick={() => deleteMutation.mutate(h.id)}
                className="text-ink-3 hover:text-ink transition-colors p-1"
              >
                <X size={15} />
              </button>
            </div>
          ))}

          {adding ? (
            <div className="flex items-center gap-3 px-3.5 py-3 border border-ink rounded bg-white/90">
              <span className="text-xl">✦</span>
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && draft.trim()) addMutation.mutate(draft.trim());
                  if (e.key === "Escape") { setAdding(false); setDraft(""); }
                }}
                placeholder="meditate 10 min, journal 1 page…"
                className="font-serif text-[16px] font-medium flex-1 outline-none bg-transparent placeholder:text-ink-3"
              />
              <button
                onClick={() => { if (draft.trim()) addMutation.mutate(draft.trim()); else { setAdding(false); setDraft(""); } }}
                className="font-mono text-[11px] tracking-[0.08em] text-ink-2 hover:text-ink transition-colors"
              >
                SAVE
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="flex items-center justify-center gap-2 py-3.5 border border-dashed border-line-strong rounded text-ink-2 hover:text-ink hover:border-ink/30 transition-colors"
            >
              <Plus size={13} />
              <span className="font-mono text-[11px] tracking-[0.12em]">ADD A HABIT</span>
            </button>
          )}
        </div>

        <p className="mt-5 font-serif italic text-[13px] text-ink-3 leading-relaxed">
          Edit any time. The trick is keeping the list short enough to actually finish.
        </p>
      </div>

      <div className="px-5 pb-6 shrink-0">
        <button
          onClick={onSaved}
          className="w-full h-14 rounded bg-ink text-paper flex items-center justify-between px-5 text-[15px] font-medium"
        >
          <span>Done</span>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

// ─── Tonight ─────────────────────────────────────────────────────────────────

function HabitsTonight({
  habits,
  logs,
}: {
  habits: HabitRow[];
  logs: LogRow[];
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const today = todayIso();

  const doneSet = useMemo(
    () => new Set(logs.filter((l) => l.logged_date === today).map((l) => l.habit_id)),
    [logs, today],
  );

  const toggleMutation = useMutation({
    mutationFn: async ({ habitId, done }: { habitId: string; done: boolean }) => {
      if (done) {
        const { error } = await supabase.from("habit_logs").delete()
          .eq("habit_id", habitId)
          .eq("logged_date", today)
          .eq("user_id", user!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("habit_logs").insert({
          user_id: user!.id,
          habit_id: habitId,
          logged_date: today,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["habit-logs"] }),
  });

  const count = doneSet.size;
  const total = habits.length;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="px-5 pt-4 pb-2 shrink-0">
        <div className="flex items-baseline gap-2.5 mb-3">
          <span className="font-mono text-[11px] tracking-[0.18em] text-ink-3 uppercase">Habits · Tonight</span>
          <div className="flex-1 h-px bg-ink/10" />
          <span className="font-mono text-[11px] text-ink-3">{count} / {total}</span>
        </div>
        <h1 className="font-display text-[28px] leading-[1.05] font-light">
          What did today{" "}
          <em className="font-serif not-italic font-normal italic">actually</em>{" "}
          hold?
        </h1>
        {total > 0 && (
          <div className="mt-4 h-[3px] bg-ink/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-ink rounded-full transition-all duration-300"
              style={{ width: `${total ? (count / total) * 100 : 0}%` }}
            />
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-4">
        {habits.length === 0 ? (
          <p className="font-serif italic text-[14px] text-ink-3 leading-relaxed mt-4">
            No habits yet. Add some in the Manage tab.
          </p>
        ) : (
          <div className="flex flex-col gap-2.5 mt-1">
            {habits.map((h) => {
              const isDone = doneSet.has(h.id);
              return (
                <button
                  key={h.id}
                  onClick={() => toggleMutation.mutate({ habitId: h.id, done: isDone })}
                  className="flex items-center gap-3.5 px-4 py-3.5 rounded text-left transition-colors"
                  style={{
                    border: `1px solid ${isDone ? accentColor(h.accent_var) : "hsl(var(--ink) / 0.18)"}`,
                    background: isDone ? `hsl(var(${h.accent_var}) / 0.08)` : "#fffdf7",
                  }}
                >
                  <div
                    className="flex-shrink-0 flex items-center justify-center rounded-full transition-colors"
                    style={{
                      width: 28,
                      height: 28,
                      border: `1.5px solid ${isDone ? accentColor(h.accent_var) : "hsl(var(--ink) / 0.18)"}`,
                      background: isDone ? accentColor(h.accent_var) : "transparent",
                      color: "hsl(var(--paper))",
                    }}
                  >
                    {isDone && <Check size={13} strokeWidth={2.8} />}
                  </div>
                  <span className="text-xl">{h.emoji}</span>
                  <span
                    className="font-serif text-[16px] font-medium flex-1 transition-colors"
                    style={{
                      textDecoration: isDone ? "line-through" : "none",
                      color: isDone ? "hsl(var(--ink-3))" : "hsl(var(--ink))",
                    }}
                  >
                    {h.title}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {count === total && total > 0 && (
          <div className="mt-5 px-4 py-3.5 border border-ink rounded bg-white/60">
            <p className="font-serif italic text-[14px] leading-relaxed">
              All {total}, today. A small day, well kept.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── History — Heatmap Grid (Option A) ───────────────────────────────────────

const HEATMAP_DAYS = 28;

function HabitsHistory({
  habits,
  logs,
}: {
  habits: HabitRow[];
  logs: LogRow[];
}) {
  const days = useMemo(
    () =>
      Array.from({ length: HEATMAP_DAYS }, (_, i) => {
        const d = subDays(new Date(), HEATMAP_DAYS - 1 - i);
        return format(d, "yyyy-MM-dd");
      }),
    [],
  );

  const logSet = useMemo(
    () => new Set(logs.map((l) => `${l.habit_id}|${l.logged_date}`)),
    [logs],
  );

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="px-5 pt-4 pb-2 shrink-0">
        <div className="flex items-baseline gap-2.5 mb-3">
          <span className="font-mono text-[11px] tracking-[0.18em] text-ink-3 uppercase">Habits · Log</span>
          <div className="flex-1 h-px bg-ink/10" />
          <span className="font-mono text-[11px] text-ink-3">{HEATMAP_DAYS} D</span>
        </div>
        <h1 className="font-display text-[28px] leading-[1.05] font-light">
          A month of{" "}
          <em className="font-serif not-italic font-normal italic">small</em>{" "}
          things.
        </h1>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-6">
        {habits.length === 0 ? (
          <p className="font-serif italic text-[14px] text-ink-3 leading-relaxed mt-4">
            No habits yet. Add some in the Manage tab.
          </p>
        ) : (
          <div className="flex flex-col gap-5 mt-2">
            {habits.map((h) => {
              const completed = days.filter((d) =>
                logSet.has(`${h.id}|${d}`),
              ).length;
              const pct = Math.round((completed / HEATMAP_DAYS) * 100);

              return (
                <div key={h.id}>
                  <div className="flex items-baseline gap-2 mb-1.5">
                    <span className="text-base">{h.emoji}</span>
                    <span className="font-serif text-[15px] font-medium">
                      {h.title}
                    </span>
                    <div className="flex-1" />
                    <span className="font-mono text-[10px] text-ink-3 tracking-[0.08em]">
                      {completed}/{HEATMAP_DAYS} · {pct}%
                    </span>
                  </div>

                  {/* 28-cell heatmap row */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: `repeat(${HEATMAP_DAYS}, 1fr)`,
                      gap: 2,
                    }}
                  >
                    {days.map((d) => {
                      const done = logSet.has(`${h.id}|${d}`);
                      return (
                        <div
                          key={d}
                          title={d}
                          style={{
                            aspectRatio: "1",
                            borderRadius: 1,
                            background: done
                              ? accentColor(h.accent_var)
                              : "transparent",
                            border: `1px solid ${
                              done
                                ? accentColor(h.accent_var)
                                : "hsl(var(--ink) / 0.10)"
                            }`,
                            opacity: done ? 0.85 : 0.4,
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {habits.length > 0 && (
          <p className="mt-6 pt-4 border-t border-line font-serif italic text-[13px] text-ink-2 leading-relaxed">
            Each square is one day. Darker = done.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Tab bar ─────────────────────────────────────────────────────────────────

function HabitsTabBar({
  view,
  onSelect,
}: {
  view: HabitView;
  onSelect: (v: HabitView) => void;
}) {
  const tabs: { id: HabitView; label: string }[] = [
    { id: "tonight", label: "Tonight" },
    { id: "history", label: "History" },
    { id: "manage", label: "Manage" },
  ];
  return (
    <div className="flex shrink-0 mx-5 mb-1 border-b border-line">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onSelect(t.id)}
          className={`flex-1 py-2.5 font-mono text-[10px] tracking-[0.14em] uppercase transition-colors relative ${
            view === t.id ? "text-ink" : "text-ink-3 hover:text-ink-2"
          }`}
        >
          {t.label}
          {view === t.id && (
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-ink" />
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Types ───────────────────────────────────────────────────────────────────

type HabitRow = {
  id: string;
  title: string;
  emoji: string;
  accent_var: string;
  position: number;
};

type LogRow = {
  id: string;
  habit_id: string;
  logged_date: string;
};

// ─── Root ────────────────────────────────────────────────────────────────────

export default function Habits() {
  const { user } = useAuth();
  const [view, setView] = useState<HabitView>("tonight");

  const { data: habits = [] } = useQuery<HabitRow[]>({
    queryKey: ["habits", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("habits")
        .select("id, title, emoji, accent_var, position")
        .eq("user_id", user!.id)
        .order("position", { ascending: true });
      if (error) throw error;
      return (data ?? []) as HabitRow[];
    },
  });

  const { data: logs = [] } = useQuery<LogRow[]>({
    queryKey: ["habit-logs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const cutoff = format(subDays(new Date(), HEATMAP_DAYS), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("habit_logs")
        .select("id, habit_id, logged_date")
        .eq("user_id", user!.id)
        .gte("logged_date", cutoff);
      if (error) throw error;
      return (data ?? []) as LogRow[];
    },
  });

  return (
    <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
      <div className="safe-top" />

      <div className="px-5 pt-2 pb-1 shrink-0">
        <h1 className="font-display text-[24px] leading-[1.05]">
          Your <em className="font-serif not-italic font-normal italic">habits</em>.
        </h1>
      </div>

      <HabitsTabBar view={view} onSelect={setView} />

      {view === "manage" && (
        <HabitsManage habits={habits} onSaved={() => setView("tonight")} />
      )}
      {view === "tonight" && (
        <HabitsTonight habits={habits} logs={logs} />
      )}
      {view === "history" && (
        <HabitsHistory habits={habits} logs={logs} />
      )}
    </div>
  );
}
