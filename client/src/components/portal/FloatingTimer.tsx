import { useState, useEffect, useRef } from "react";
import { Play, Square, Clock } from "lucide-react";
import { apiRequest } from "@/lib/auth";

export function FloatingTimer() {
  const [runningTimer, setRunningTimer] = useState<any>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerTask, setTimerTask] = useState("");
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    apiRequest("GET", "/api/time/timer/running").then((res) => {
      if (res.success && res.data) {
        setRunningTimer(res.data);
        setTimerSeconds(Math.floor((Date.now() - new Date(res.data.startTime).getTime()) / 1000));
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (runningTimer) {
      const startMs = new Date(runningTimer.startTime).getTime();
      intervalRef.current = setInterval(() => {
        setTimerSeconds(Math.floor((Date.now() - startMs) / 1000));
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [runningTimer]);

  async function startTimer() {
    if (!timerTask.trim()) return;
    const res = await apiRequest("POST", "/api/time/timer/start", { taskDescription: timerTask });
    if (res.success) { setRunningTimer(res.data); setTimerSeconds(0); setTimerTask(""); }
  }

  async function stopTimer() {
    await apiRequest("POST", "/api/time/timer/stop");
    setRunningTimer(null);
    setTimerSeconds(0);
  }

  const fmt = (s: number) =>
    `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  if (loading) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 md:left-56">
      <div className="bg-[#1A1F2B]/95 backdrop-blur border-t border-white/10 px-4 py-2.5 flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-white/40 shrink-0">
          <Clock className="w-3.5 h-3.5" />
          <span className="text-[10px] font-semibold uppercase tracking-wider hidden sm:block">Timer</span>
        </div>

        {runningTimer ? (
          <>
            <p className="text-[#0D7377] font-mono font-bold text-base tabular-nums shrink-0" data-testid="text-timer-running">
              {fmt(timerSeconds)}
            </p>
            <p className="text-white/60 text-xs truncate flex-1">{runningTimer.taskDescription}</p>
            <button
              onClick={stopTimer}
              data-testid="button-stop-timer"
              className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shrink-0"
            >
              <Square className="w-3 h-3 fill-white" /> Stop
            </button>
          </>
        ) : (
          <>
            <input
              value={timerTask}
              onChange={(e) => setTimerTask(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && startTimer()}
              placeholder="What are you working on?"
              data-testid="input-timer-task"
              className="flex-1 bg-white/10 text-white placeholder-white/30 text-sm px-3 py-1.5 rounded-lg border border-white/10 focus:outline-none focus:border-[#0D7377]/60 focus:bg-white/15 transition min-w-0"
            />
            <button
              onClick={startTimer}
              disabled={!timerTask.trim()}
              data-testid="button-start-timer"
              className="flex items-center gap-1.5 bg-[#0D7377] hover:bg-[#0D7377]/80 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shrink-0"
            >
              <Play className="w-3 h-3 fill-white" /> Start
            </button>
          </>
        )}
      </div>
    </div>
  );
}
