"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  TrafficCone,
  Play,
  RotateCcw,
  Home,
  Pause,
  Plus,
  Minus,
  ArrowRight,
  Car,
} from "lucide-react";
import Link from "next/link";

interface Request {
  id: number;
  status: "waiting" | "processing" | "completed" | "rejected";
  color: string;
  progress: number;
}

const COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

export default function SemaphoreDemo() {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  //   const [permits, setPermits] = useState(3);
  const [maxPermits, setMaxPermits] = useState(3);
  const [availablePermits, setAvailablePermits] = useState(3);
  const [waitingRequests, setWaitingRequests] = useState<Request[]>([]);
  const [activeRequests, setActiveRequests] = useState<Request[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [requestCounter, setRequestCounter] = useState(0);
  const [autoSpawn, setAutoSpawn] = useState(true);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const pauseRef = useRef(false);

  const addLog = (
    message: string,
    type: "acquired" | "released" | "rejected" | "info"
  ) => {
    const colors: Record<string, string> = {
      acquired: "text-green-400",
      released: "text-blue-400",
      rejected: "text-red-400",
      info: "text-slate-400",
    };
    setLogs((prev) => [
      ...prev.slice(-12),
      `<span class="${
        colors[type]
      }">[${new Date().toLocaleTimeString()}] ${message}</span>`,
    ]);
  };

  const reset = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRunning(false);
    setIsPaused(false);
    pauseRef.current = false;
    setAvailablePermits(maxPermits);
    setWaitingRequests([]);
    setActiveRequests([]);
    setCompletedCount(0);
    setRejectedCount(0);
    setLogs([]);
    setRequestCounter(0);
  };

  const spawnRequest = () => {
    const newRequest: Request = {
      id: requestCounter + 1,
      status: "waiting",
      color: COLORS[requestCounter % COLORS.length],
      progress: 0,
    };
    setRequestCounter((prev) => prev + 1);

    if (availablePermits > 0) {
      setAvailablePermits((prev) => prev - 1);
      setActiveRequests((prev) => [
        ...prev,
        { ...newRequest, status: "processing" },
      ]);
      addLog(
        `Request #${newRequest.id}: Acquired permit (${
          availablePermits - 1
        } left)`,
        "acquired"
      );
    } else if (waitingRequests.length < 10) {
      setWaitingRequests((prev) => [...prev, newRequest]);
      addLog(`Request #${newRequest.id}: Waiting for permit...`, "info");
    } else {
      setRejectedCount((prev) => prev + 1);
      addLog(`Request #${newRequest.id}: REJECTED - Queue full!`, "rejected");
    }
  };

  const runSimulation = () => {
    reset();
    setIsRunning(true);

    intervalRef.current = setInterval(() => {
      if (pauseRef.current) return;

      // Progress active requests
      setActiveRequests((prev) => {
        const stillActive: Request[] = [];
        const completed: Request[] = [];

        prev.forEach((r) => {
          const newProgress = r.progress + 100 / (Math.random() * 3 + 2);
          if (newProgress >= 100) {
            completed.push({ ...r, status: "completed", progress: 100 });
          } else {
            stillActive.push({ ...r, progress: newProgress });
          }
        });

        // Release permits for completed
        completed.forEach((r) => {
          setAvailablePermits((p) => Math.min(p + 1, maxPermits));
          setCompletedCount((c) => c + 1);
          addLog(`Request #${r.id}: ✓ Completed, released permit`, "released");
        });

        return stillActive;
      });

      // Promote waiting requests if permits available
      setWaitingRequests((prev) => {
        if (prev.length === 0) return prev;

        const promoting: Request[] = [];
        let tempPermits = availablePermits;

        const remaining = prev.filter((r) => {
          if (tempPermits > 0) {
            promoting.push({ ...r, status: "processing" });
            tempPermits--;
            addLog(`Request #${r.id}: Acquired permit`, "acquired");
            return false;
          }
          return true;
        });

        if (promoting.length > 0) {
          setAvailablePermits(tempPermits);
          setActiveRequests((active) => [...active, ...promoting]);
        }

        return remaining;
      });

      // Auto-spawn new requests
      if (autoSpawn && Math.random() > 0.6) {
        spawnRequest();
      }
    }, 400);
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
    pauseRef.current = !pauseRef.current;
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const updateMaxPermits = (delta: number) => {
    if (!isRunning) {
      const newMax = Math.max(1, Math.min(8, maxPermits + delta));
      setMaxPermits(newMax);
      setAvailablePermits(newMax);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors"
            >
              <Home className="w-4 h-4" />
              <span>Back to Home</span>
            </Link>
            <h1 className="text-4xl font-bold text-white flex items-center gap-3">
              <TrafficCone className="w-10 h-10 text-yellow-500" />
              Semaphore / Rate Limiting
            </h1>
            <p className="text-slate-400 mt-2">
              Control access to a limited pool of resources
            </p>
          </div>
          <div className="flex gap-3">
            {!isRunning ? (
              <button
                onClick={runSimulation}
                className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3 rounded-xl transition-all"
              >
                <Play className="w-5 h-5" />
                Start Demo
              </button>
            ) : (
              <button
                onClick={togglePause}
                className={`flex items-center gap-2 ${
                  isPaused ? "bg-green-600" : "bg-yellow-600"
                } text-white px-6 py-3 rounded-xl transition-all`}
              >
                {isPaused ? (
                  <Play className="w-5 h-5" />
                ) : (
                  <Pause className="w-5 h-5" />
                )}
                {isPaused ? "Resume" : "Pause"}
              </button>
            )}
            <button
              onClick={reset}
              className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-xl transition-all"
            >
              <RotateCcw className="w-5 h-5" />
              Reset
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 flex items-center gap-4">
            <span className="text-slate-400">Max Permits:</span>
            <button
              onClick={() => updateMaxPermits(-1)}
              disabled={isRunning || maxPermits <= 1}
              className="w-8 h-8 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded-lg flex items-center justify-center text-white"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="text-2xl font-bold text-yellow-400 w-8 text-center">
              {maxPermits}
            </span>
            <button
              onClick={() => updateMaxPermits(1)}
              disabled={isRunning || maxPermits >= 8}
              className="w-8 h-8 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded-lg flex items-center justify-center text-white"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={spawnRequest}
            disabled={!isRunning || isPaused}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white px-6 py-3 rounded-xl transition-all"
          >
            <Plus className="w-5 h-5" />
            Add Request
          </button>

          <label className="flex items-center gap-3 bg-slate-800/50 rounded-xl px-4 border border-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={autoSpawn}
              onChange={(e) => setAutoSpawn(e.target.checked)}
              className="w-4 h-4 accent-yellow-500"
            />
            <span className="text-slate-400">Auto-spawn requests</span>
          </label>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-yellow-500/20 rounded-xl p-4 border border-yellow-500/30">
            <div className="text-yellow-400 text-sm">Available Permits</div>
            <div className="text-3xl font-bold text-white">
              {availablePermits}/{maxPermits}
            </div>
          </div>
          <div className="bg-blue-500/20 rounded-xl p-4 border border-blue-500/30">
            <div className="text-blue-400 text-sm">Processing</div>
            <div className="text-3xl font-bold text-white">
              {activeRequests.length}
            </div>
          </div>
          <div className="bg-orange-500/20 rounded-xl p-4 border border-orange-500/30">
            <div className="text-orange-400 text-sm">Waiting</div>
            <div className="text-3xl font-bold text-white">
              {waitingRequests.length}
            </div>
          </div>
          <div className="bg-green-500/20 rounded-xl p-4 border border-green-500/30">
            <div className="text-green-400 text-sm">Completed</div>
            <div className="text-3xl font-bold text-white">
              {completedCount}
            </div>
          </div>
          <div className="bg-red-500/20 rounded-xl p-4 border border-red-500/30">
            <div className="text-red-400 text-sm">Rejected</div>
            <div className="text-3xl font-bold text-white">{rejectedCount}</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Main Visualization */}
          <div className="col-span-2 space-y-6">
            {/* Tollbooth Visualization */}
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                🚗 Resource Access (Tollbooth Analogy)
              </h3>

              <div className="flex items-center gap-4">
                {/* Waiting Queue */}
                <div className="flex-1">
                  <div className="text-sm text-slate-400 mb-2">
                    Waiting Queue
                  </div>
                  <div className="flex gap-2 flex-wrap p-4 bg-slate-900 rounded-xl min-h-[80px]">
                    {waitingRequests.length === 0 ? (
                      <span className="text-slate-500 text-sm">
                        No waiting requests
                      </span>
                    ) : (
                      waitingRequests.map((r) => (
                        <div
                          key={r.id}
                          className="flex items-center gap-1 px-3 py-2 rounded-lg text-white text-sm font-medium"
                          style={{ backgroundColor: r.color }}
                        >
                          <Car className="w-4 h-4" />#{r.id}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <ArrowRight className="w-8 h-8 text-yellow-500" />

                {/* Tollbooth Gates */}
                <div className="flex-1">
                  <div className="text-sm text-slate-400 mb-2">
                    Gates ({maxPermits} slots)
                  </div>
                  <div className="grid grid-cols-4 gap-2 p-4 bg-slate-900 rounded-xl min-h-[80px]">
                    {Array.from({ length: maxPermits }).map((_, i) => {
                      const request = activeRequests[i];
                      return (
                        <div
                          key={i}
                          className={`h-16 rounded-lg border-2 flex flex-col items-center justify-center transition-all ${
                            request
                              ? "border-green-500 bg-green-500/20"
                              : "border-dashed border-slate-600"
                          }`}
                        >
                          {request ? (
                            <>
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold mb-1"
                                style={{ backgroundColor: request.color }}
                              >
                                #{request.id}
                              </div>
                              <div className="w-full px-2">
                                <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-green-500 transition-all"
                                    style={{ width: `${request.progress}%` }}
                                  />
                                </div>
                              </div>
                            </>
                          ) : (
                            <span className="text-slate-500 text-xs">
                              Empty
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <ArrowRight className="w-8 h-8 text-green-500" />

                {/* Exit */}
                <div className="w-24 text-center">
                  <div className="text-sm text-slate-400 mb-2">Exit</div>
                  <div className="p-4 bg-green-500/20 rounded-xl border border-green-500/30">
                    <div className="text-2xl font-bold text-green-400">
                      {completedCount}
                    </div>
                    <div className="text-xs text-green-400/70">done</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Permit Counter */}
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Semaphore State
              </h3>
              <div className="flex gap-2 justify-center">
                {Array.from({ length: maxPermits }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-16 h-16 rounded-xl border-2 flex items-center justify-center text-2xl transition-all duration-300 ${
                      i < availablePermits
                        ? "border-green-500 bg-green-500/20 text-green-400"
                        : "border-red-500 bg-red-500/20 text-red-400"
                    }`}
                  >
                    {i < availablePermits ? "✓" : "✗"}
                  </div>
                ))}
              </div>
              <div className="text-center mt-4 text-slate-400">
                <span className="text-green-400 font-bold">
                  {availablePermits}
                </span>{" "}
                permits available,{" "}
                <span className="text-red-400 font-bold">
                  {maxPermits - availablePermits}
                </span>{" "}
                in use
              </div>
            </div>
          </div>

          {/* Right Panel */}
          <div className="space-y-6">
            {/* Event Log */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
              <h3 className="text-lg font-semibold text-white mb-3">
                Event Log
              </h3>
              <div className="space-y-1 font-mono text-xs h-48 overflow-y-auto">
                {logs.length === 0 ? (
                  <p className="text-slate-500">Start demo to see events...</p>
                ) : (
                  logs.map((log, i) => (
                    <div
                      key={i}
                      className="p-2 rounded bg-slate-700/50"
                      dangerouslySetInnerHTML={{ __html: log }}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Explanation */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
              <h3 className="text-lg font-semibold text-white mb-3">
                How It Works
              </h3>
              <div className="space-y-3 text-sm text-slate-400">
                <p>
                  A{" "}
                  <span className="text-yellow-400 font-semibold">
                    semaphore
                  </span>{" "}
                  is a counter that controls access to shared resources.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-green-400">•</span>
                    <span>
                      <code className="text-green-400">acquire()</code>:
                      Decrement counter (blocks if 0)
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400">•</span>
                    <span>
                      <code className="text-blue-400">release()</code>:
                      Increment counter (wake waiters)
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Use Cases */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
              <h3 className="text-lg font-semibold text-white mb-3">
                Use Cases
              </h3>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>• Connection pool limits</li>
                <li>• API rate limiting</li>
                <li>• Worker thread limits</li>
                <li>• Resource quotas</li>
                <li>• Bounded parallelism</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
