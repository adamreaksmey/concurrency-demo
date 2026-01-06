"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  AlertCircle,
  Play,
  RotateCcw,
  Home,
  Pause,
  ArrowUp,
  ArrowDown,
  Users,
} from "lucide-react";
import Link from "next/link";

interface Thread {
  id: number;
  name: string;
  priority: "high" | "medium" | "low";
  status: "running" | "waiting" | "starving";
  waitTime: number;
  executionTime: number;
  color: string;
}

export default function StarvationDemo() {
  const [showExplanation, setShowExplanation] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [scenario, setScenario] = useState<"unfair" | "fair">("unfair");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [currentThread, setCurrentThread] = useState<Thread | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [lockHolder, setLockHolder] = useState<number | null>(null);
  const [tick, setTick] = useState(0);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const pauseRef = useRef(false);

  const initThreads = (): Thread[] => [
    {
      id: 1,
      name: "High Priority 1",
      priority: "high",
      status: "waiting",
      waitTime: 0,
      executionTime: 0,
      color: "#ef4444",
    },
    {
      id: 2,
      name: "High Priority 2",
      priority: "high",
      status: "waiting",
      waitTime: 0,
      executionTime: 0,
      color: "#f97316",
    },
    {
      id: 3,
      name: "Medium Priority",
      priority: "medium",
      status: "waiting",
      waitTime: 0,
      executionTime: 0,
      color: "#eab308",
    },
    {
      id: 4,
      name: "Low Priority 1",
      priority: "low",
      status: "waiting",
      waitTime: 0,
      executionTime: 0,
      color: "#22c55e",
    },
    {
      id: 5,
      name: "Low Priority 2",
      priority: "low",
      status: "waiting",
      waitTime: 0,
      executionTime: 0,
      color: "#3b82f6",
    },
  ];

  const addLog = (message: string) => {
    setLogs((prev) => [...prev.slice(-12), `[${tick}] ${message}`]);
  };

  const reset = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRunning(false);
    setIsPaused(false);
    pauseRef.current = false;
    setThreads(initThreads());
    setCurrentThread(null);
    setLogs([]);
    setLockHolder(null);
    setTick(0);
  };

  const runSimulation = () => {
    reset();
    setIsRunning(true);
    setThreads(initThreads());

    let localTick = 0;

    intervalRef.current = setInterval(() => {
      if (pauseRef.current) return;

      localTick++;
      setTick(localTick);

      setThreads((prev) => {
        const threads = prev.map((t) => ({
          ...t,
          waitTime:
            t.status === "waiting" || t.status === "starving"
              ? t.waitTime + 1
              : t.waitTime,
          status:
            t.status === "waiting" && t.waitTime > 20
              ? ("starving" as const)
              : t.status,
        }));

        // Select next thread
        const waiting = threads.filter((t) => t.status !== "running");
        let selected: Thread | null = null;

        if (scenario === "unfair") {
          // Always pick highest priority
          selected =
            waiting.sort((a, b) => {
              const priorityOrder = { high: 0, medium: 1, low: 2 };
              return priorityOrder[a.priority] - priorityOrder[b.priority];
            })[0] || null;
        } else {
          // Fair: Consider wait time (longest waiting gets priority boost)
          selected =
            waiting.sort((a, b) => {
              const priorityOrder = { high: 0, medium: 1, low: 2 };
              const priorityDiff =
                priorityOrder[a.priority] - priorityOrder[b.priority];
              const waitBonus = Math.floor((b.waitTime - a.waitTime) / 10);
              return priorityDiff - waitBonus;
            })[0] || null;
        }

        // Randomly release current thread
        const running = threads.find((t) => t.status === "running");
        if (running && Math.random() > 0.7) {
          running.status = "waiting";
          running.waitTime = 0;
          addLog(`${running.name}: Released lock`);
          setCurrentThread(null);
          setLockHolder(null);
        }

        // Assign lock to selected
        if (!lockHolder && selected) {
          selected.status = "running";
          selected.executionTime++;
          setCurrentThread(selected);
          setLockHolder(selected.id);
          addLog(
            `${selected.name}: Acquired lock${
              selected.waitTime > 20 ? " (was starving!)" : ""
            }`
          );
        }

        return threads;
      });
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-red-400";
      case "medium":
        return "text-yellow-400";
      case "low":
        return "text-green-400";
      default:
        return "text-slate-400";
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case "running":
        return "bg-green-500";
      case "starving":
        return "bg-red-500 animate-pulse";
      default:
        return "bg-slate-600";
    }
  };

  const starvingCount = threads.filter((t) => t.status === "starving").length;

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
              <AlertCircle className="w-10 h-10 text-red-500" />
              Starvation & Priority Inversion
            </h1>
            <p className="text-slate-400 mt-2">
              Watch low-priority threads wait forever while high-priority ones
              dominate
            </p>
          </div>
          <div className="flex gap-3">
            {!isRunning ? (
              <button
                onClick={runSimulation}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl transition-all"
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

        {/* Educational Explanation Section */}
        <div className="mb-6">
          <button
            onClick={() => setShowExplanation(!showExplanation)}
            className="mb-4 flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
          >
            <span className="text-lg font-semibold">
              {showExplanation ? "▼" : "▶"} Understanding Starvation
            </span>
          </button>

          {showExplanation && (
            <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6 space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <span className="text-2xl">😫</span> What is Starvation?
                </h3>
                <p className="text-slate-300 leading-relaxed">
                  <span className="text-red-400 font-semibold">Starvation</span>{" "}
                  occurs when a thread is perpetually denied access to resources
                  because higher-priority threads keep cutting in line. The
                  thread is technically ready to run but never gets a chance.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <h4 className="text-red-400 font-semibold mb-2">⚠️ Causes</h4>
                  <ul className="text-slate-400 text-sm space-y-1">
                    <li>• Unfair scheduling policies</li>
                    <li>• Priority inversion</li>
                    <li>• High-priority threads hogging resources</li>
                    <li>• Writers always yielding to readers</li>
                  </ul>
                </div>
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <h4 className="text-green-400 font-semibold mb-2">
                    ✓ Solutions
                  </h4>
                  <ul className="text-slate-400 text-sm space-y-1">
                    <li>
                      • <span className="text-white">Aging</span>: Boost
                      priority over time
                    </li>
                    <li>
                      • <span className="text-white">Fair locks</span>: FIFO
                      ordering
                    </li>
                    <li>
                      • <span className="text-white">Priority inheritance</span>
                    </li>
                    <li>
                      • <span className="text-white">Time slicing</span>: Limit
                      hold time
                    </li>
                  </ul>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg p-4 border border-blue-500/30">
                <h4 className="text-blue-400 font-semibold mb-2">
                  🎬 What to Watch
                </h4>
                <p className="text-slate-400 text-sm">
                  In <span className="text-red-400">unfair mode</span>,
                  low-priority threads starve and turn red. In{" "}
                  <span className="text-green-400">fair mode</span>, wait-time
                  boosts priority so everyone gets a turn!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Scenario Selector */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => !isRunning && setScenario("unfair")}
            disabled={isRunning}
            className={`flex-1 p-4 rounded-xl border-2 transition-all ${
              scenario === "unfair"
                ? "border-red-500 bg-red-500/20"
                : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
            } ${isRunning ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <div className="font-semibold text-white mb-1">
              Unfair Scheduling
            </div>
            <div className="text-sm text-slate-400">
              High priority always wins → starvation
            </div>
          </button>
          <button
            onClick={() => !isRunning && setScenario("fair")}
            disabled={isRunning}
            className={`flex-1 p-4 rounded-xl border-2 transition-all ${
              scenario === "fair"
                ? "border-green-500 bg-green-500/20"
                : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
            } ${isRunning ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <div className="font-semibold text-white mb-1">Fair Scheduling</div>
            <div className="text-sm text-slate-400">
              Wait time boosts priority → no starvation
            </div>
          </button>
        </div>

        {/* Warning Banner */}
        {starvingCount > 0 && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/20 border border-red-500/50 animate-pulse">
            <div className="text-lg font-bold text-red-400 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              ⚠️ {starvingCount} thread(s) STARVING! Low priority threads
              can&apos;t get the lock!
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="text-slate-400 text-sm">Tick</div>
            <div className="text-3xl font-bold text-white">{tick}</div>
          </div>
          <div
            className={`rounded-xl p-4 border ${
              lockHolder
                ? "bg-green-500/20 border-green-500/30"
                : "bg-slate-800/50 border-slate-700"
            }`}
          >
            <div className="text-slate-400 text-sm">Lock Holder</div>
            <div className="text-xl font-bold text-white truncate">
              {currentThread?.name || "None"}
            </div>
          </div>
          <div
            className={`rounded-xl p-4 border ${
              starvingCount > 0
                ? "bg-red-500/20 border-red-500/30"
                : "bg-slate-800/50 border-slate-700"
            }`}
          >
            <div
              className={starvingCount > 0 ? "text-red-400" : "text-slate-400"}
            >
              Starving
            </div>
            <div
              className={`text-3xl font-bold ${
                starvingCount > 0 ? "text-red-400" : "text-white"
              }`}
            >
              {starvingCount}
            </div>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="text-slate-400 text-sm">Scheduling</div>
            <div
              className={`text-xl font-bold ${
                scenario === "fair" ? "text-green-400" : "text-red-400"
              }`}
            >
              {scenario === "fair" ? "Fair" : "Unfair"}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Thread Visualization */}
          <div className="col-span-2 bg-slate-800/50 rounded-2xl border border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Thread Queue
            </h3>

            <div className="space-y-3">
              {threads.map((thread) => (
                <div
                  key={thread.id}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    thread.status === "running"
                      ? "border-green-500 bg-green-500/10"
                      : thread.status === "starving"
                      ? "border-red-500 bg-red-500/10 animate-pulse"
                      : "border-slate-700 bg-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full ${getStatusBg(
                          thread.status
                        )}`}
                      />
                      <span className="font-semibold text-white">
                        {thread.name}
                      </span>
                      <span
                        className={`text-sm font-medium ${getPriorityColor(
                          thread.priority
                        )}`}
                      >
                        {thread.priority === "high" && (
                          <ArrowUp className="w-4 h-4 inline" />
                        )}
                        {thread.priority === "low" && (
                          <ArrowDown className="w-4 h-4 inline" />
                        )}
                        {thread.priority}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-slate-400">
                        Wait:{" "}
                        <span
                          className={
                            thread.waitTime > 20
                              ? "text-red-400 font-bold"
                              : "text-white"
                          }
                        >
                          {thread.waitTime}
                        </span>
                      </div>
                      <div className="text-slate-400">
                        Runs:{" "}
                        <span className="text-green-400">
                          {thread.executionTime}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Wait time bar */}
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        thread.waitTime > 20
                          ? "bg-red-500"
                          : thread.waitTime > 10
                          ? "bg-yellow-500"
                          : "bg-green-500"
                      }`}
                      style={{
                        width: `${Math.min(thread.waitTime * 3, 100)}%`,
                      }}
                    />
                  </div>

                  {thread.status === "starving" && (
                    <div className="mt-2 text-xs text-red-400 animate-pulse">
                      ⚠️ Thread has been waiting too long!
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right Panel */}
          <div className="space-y-6">
            {/* Log */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
              <h3 className="text-lg font-semibold text-white mb-3">
                Event Log
              </h3>
              <div className="space-y-1 font-mono text-xs h-40 overflow-y-auto">
                {logs.length === 0 ? (
                  <p className="text-slate-500">Start demo to see events...</p>
                ) : (
                  logs.map((log, i) => (
                    <div
                      key={i}
                      className={`p-2 rounded ${
                        log.includes("starving")
                          ? "bg-red-500/20 text-red-400"
                          : "bg-slate-700/50 text-slate-300"
                      }`}
                    >
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Explanation */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
              <h3 className="text-lg font-semibold text-white mb-3">
                What&apos;s Happening
              </h3>
              <div className="space-y-3 text-sm text-slate-400">
                {scenario === "unfair" ? (
                  <>
                    <p>
                      <span className="text-red-400 font-semibold">
                        Unfair:
                      </span>{" "}
                      High priority threads always get the lock first.
                    </p>
                    <p>
                      Low priority threads keep waiting... and waiting... never
                      getting a chance.
                    </p>
                    <p className="text-red-400">
                      This is <strong>starvation</strong>!
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      <span className="text-green-400 font-semibold">
                        Fair:
                      </span>{" "}
                      Wait time gives priority boosts.
                    </p>
                    <p>
                      Threads that wait long enough eventually get promoted.
                    </p>
                    <p className="text-green-400">No thread starves forever!</p>
                  </>
                )}
              </div>
            </div>

            {/* Solutions */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
              <h3 className="text-lg font-semibold text-white mb-3">
                Solutions
              </h3>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>
                  • <span className="text-white">Aging:</span> Boost priority
                  over time
                </li>
                <li>
                  • <span className="text-white">Fair locks:</span> FIFO
                  ordering
                </li>
                <li>
                  • <span className="text-white">Priority inheritance:</span>{" "}
                  Prevent inversion
                </li>
                <li>
                  • <span className="text-white">Time slicing:</span> Limit
                  execution time
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
