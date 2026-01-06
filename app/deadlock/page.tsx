"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  //   Lock,
  //   Unlock,
  AlertTriangle,
  Play,
  RotateCcw,
  Home,
  Skull,
} from "lucide-react";
import Link from "next/link";

interface ThreadState {
  id: number;
  name: string;
  color: string;
  holdsLock: string | null;
  wantsLock: string | null;
  status: "idle" | "acquired" | "waiting" | "deadlocked";
  x: number;
  y: number;
}

interface LockState {
  id: string;
  name: string;
  heldBy: number | null;
  x: number;
  y: number;
}

export default function DeadlockDemo() {
  const [showExplanation, setShowExplanation] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [isDeadlocked, setIsDeadlocked] = useState(false);
  const [step, setStep] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [threads, setThreads] = useState<ThreadState[]>([
    {
      id: 1,
      name: "Thread A",
      color: "blue",
      holdsLock: null,
      wantsLock: null,
      status: "idle",
      x: 100,
      y: 150,
    },
    {
      id: 2,
      name: "Thread B",
      color: "green",
      holdsLock: null,
      wantsLock: null,
      status: "idle",
      x: 400,
      y: 150,
    },
  ]);
  const [locks, setLocks] = useState<LockState[]>([
    { id: "lock1", name: "Lock 1", heldBy: null, x: 180, y: 80 },
    { id: "lock2", name: "Lock 2", heldBy: null, x: 320, y: 80 },
  ]);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const addLog = (message: string) => {
    setLogs((prev) => [
      ...prev.slice(-8),
      `[${new Date().toLocaleTimeString()}] ${message}`,
    ]);
  };

  const reset = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRunning(false);
    setIsDeadlocked(false);
    setStep(0);
    setLogs([]);
    setThreads([
      {
        id: 1,
        name: "Thread A",
        color: "blue",
        holdsLock: null,
        wantsLock: null,
        status: "idle",
        x: 100,
        y: 150,
      },
      {
        id: 2,
        name: "Thread B",
        color: "green",
        holdsLock: null,
        wantsLock: null,
        status: "idle",
        x: 400,
        y: 150,
      },
    ]);
    setLocks([
      { id: "lock1", name: "Lock 1", heldBy: null, x: 180, y: 80 },
      { id: "lock2", name: "Lock 2", heldBy: null, x: 320, y: 80 },
    ]);
  };

  const runDeadlockScenario = () => {
    reset();
    setIsRunning(true);
    let currentStep = 0;

    const steps = [
      // Step 1: Thread A acquires Lock 1
      () => {
        addLog("Thread A: Acquiring Lock 1...");
        setThreads((prev) =>
          prev.map((t) =>
            t.id === 1 ? { ...t, wantsLock: "lock1", status: "waiting" } : t
          )
        );
      },
      // Step 2: Thread A successfully acquires Lock 1
      () => {
        addLog("Thread A: ✓ Acquired Lock 1");
        setThreads((prev) =>
          prev.map((t) =>
            t.id === 1
              ? {
                  ...t,
                  holdsLock: "lock1",
                  wantsLock: null,
                  status: "acquired",
                }
              : t
          )
        );
        setLocks((prev) =>
          prev.map((l) => (l.id === "lock1" ? { ...l, heldBy: 1 } : l))
        );
      },
      // Step 3: Thread B acquires Lock 2
      () => {
        addLog("Thread B: Acquiring Lock 2...");
        setThreads((prev) =>
          prev.map((t) =>
            t.id === 2 ? { ...t, wantsLock: "lock2", status: "waiting" } : t
          )
        );
      },
      // Step 4: Thread B successfully acquires Lock 2
      () => {
        addLog("Thread B: ✓ Acquired Lock 2");
        setThreads((prev) =>
          prev.map((t) =>
            t.id === 2
              ? {
                  ...t,
                  holdsLock: "lock2",
                  wantsLock: null,
                  status: "acquired",
                }
              : t
          )
        );
        setLocks((prev) =>
          prev.map((l) => (l.id === "lock2" ? { ...l, heldBy: 2 } : l))
        );
      },
      // Step 5: Thread A tries to acquire Lock 2 (held by B)
      () => {
        addLog("Thread A: Now I need Lock 2... (held by Thread B!)");
        setThreads((prev) =>
          prev.map((t) =>
            t.id === 1 ? { ...t, wantsLock: "lock2", status: "waiting" } : t
          )
        );
      },
      // Step 6: Thread B tries to acquire Lock 1 (held by A)
      () => {
        addLog("Thread B: Now I need Lock 1... (held by Thread A!)");
        setThreads((prev) =>
          prev.map((t) =>
            t.id === 2 ? { ...t, wantsLock: "lock1", status: "waiting" } : t
          )
        );
      },
      // Step 7: DEADLOCK!
      () => {
        addLog("💀 DEADLOCK DETECTED! Both threads waiting forever!");
        setIsDeadlocked(true);
        setThreads((prev) => prev.map((t) => ({ ...t, status: "deadlocked" })));
        setIsRunning(false);
      },
    ];

    intervalRef.current = setInterval(() => {
      if (currentStep < steps.length) {
        steps[currentStep]();
        setStep(currentStep + 1);
        currentStep++;
      } else {
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    }, 1500);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  //   const getThreadColor = (thread: ThreadState) => {
  //     if (thread.status === "deadlocked") return "bg-red-500";
  //     if (thread.status === "acquired")
  //       return thread.color === "blue" ? "bg-blue-500" : "bg-green-500";
  //     if (thread.status === "waiting")
  //       return thread.color === "blue" ? "bg-blue-400" : "bg-green-400";
  //     return "bg-slate-600";
  //   };

  const getLockColor = (lock: LockState) => {
    if (lock.heldBy === 1) return "border-blue-500 bg-blue-500/20";
    if (lock.heldBy === 2) return "border-green-500 bg-green-500/20";
    return "border-slate-500 bg-slate-800";
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
              <Skull className="w-10 h-10 text-red-500" />
              Deadlock Visualizer
            </h1>
            <p className="text-slate-400 mt-2">
              Watch two threads lock each other in an eternal embrace of death
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={runDeadlockScenario}
              disabled={isRunning}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-700 text-white px-6 py-3 rounded-xl transition-all"
            >
              <Play className="w-5 h-5" />
              {isRunning ? "Running..." : "Create Deadlock"}
            </button>
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
        <div className="mb-8">
          <button
            onClick={() => setShowExplanation(!showExplanation)}
            className="mb-4 flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
          >
            <span className="text-lg font-semibold">
              {showExplanation ? "▼" : "▶"} Understanding Deadlocks
            </span>
          </button>

          {showExplanation && (
            <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6 space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <span className="text-2xl">💀</span> What is a Deadlock?
                </h3>
                <p className="text-slate-300 leading-relaxed">
                  A <span className="text-red-400 font-semibold">deadlock</span>{" "}
                  occurs when two or more threads are blocked forever, each
                  waiting for the other to release a resource. It&apos;s like
                  two people meeting in a narrow hallway — each waits for the
                  other to move first, and nobody goes anywhere!
                </p>
                <div className="mt-3 p-4 bg-slate-900/50 rounded-lg border-l-4 border-red-500">
                  <p className="text-slate-400 text-sm">
                    <strong className="text-red-400">
                      Four Conditions for Deadlock:
                    </strong>{" "}
                    Mutual exclusion, hold and wait, no preemption, and circular
                    wait. All four must be present for deadlock to occur.
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <h4 className="text-red-400 font-semibold mb-2">
                    ⚠️ The Dangers
                  </h4>
                  <ul className="text-slate-400 text-sm space-y-1">
                    <li>• Application hangs completely</li>
                    <li>• No error is thrown - silent failure</li>
                    <li>• Hard to reproduce in testing</li>
                    <li>• Can cascade to system-wide failures</li>
                  </ul>
                </div>
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <h4 className="text-green-400 font-semibold mb-2">
                    ✓ Prevention Strategies
                  </h4>
                  <ul className="text-slate-400 text-sm space-y-1">
                    <li>• Always acquire locks in same order</li>
                    <li>• Use lock timeouts (tryLock)</li>
                    <li>• Deadlock detection algorithms</li>
                    <li>• Lock-free programming</li>
                  </ul>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg p-4 border border-blue-500/30">
                <h4 className="text-blue-400 font-semibold mb-2">
                  🎬 What to Watch
                </h4>
                <p className="text-slate-400 text-sm">
                  Thread A acquires Lock 1 and needs Lock 2. Thread B acquires
                  Lock 2 and needs Lock 1. Neither can proceed —{" "}
                  <span className="text-red-400">
                    classic circular wait deadlock!
                  </span>
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Main Visualization */}
          <div className="col-span-2 bg-slate-800/50 rounded-2xl border border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Visualization
            </h3>

            {/* SVG Visualization */}
            <div className="relative h-80 bg-slate-900 rounded-xl overflow-hidden">
              <svg className="w-full h-full" viewBox="0 0 500 250">
                {/* Draw connection lines */}
                {threads.map((thread) => {
                  if (thread.holdsLock) {
                    const lock = locks.find((l) => l.id === thread.holdsLock);
                    if (lock) {
                      return (
                        <line
                          key={`holds-${thread.id}`}
                          x1={thread.x + 40}
                          y1={thread.y}
                          x2={lock.x + 30}
                          y2={lock.y + 30}
                          stroke={
                            thread.color === "blue" ? "#3b82f6" : "#22c55e"
                          }
                          strokeWidth="3"
                          strokeDasharray={isDeadlocked ? "5,5" : "0"}
                          className={isDeadlocked ? "animate-pulse" : ""}
                        />
                      );
                    }
                  }
                  return null;
                })}

                {threads.map((thread) => {
                  if (thread.wantsLock) {
                    const lock = locks.find((l) => l.id === thread.wantsLock);
                    if (lock) {
                      return (
                        <line
                          key={`wants-${thread.id}`}
                          x1={thread.x + 40}
                          y1={thread.y}
                          x2={lock.x + 30}
                          y2={lock.y + 30}
                          stroke={isDeadlocked ? "#ef4444" : "#fbbf24"}
                          strokeWidth="2"
                          strokeDasharray="8,4"
                          className="animate-pulse"
                        />
                      );
                    }
                  }
                  return null;
                })}

                {/* Locks */}
                {locks.map((lock) => (
                  <g key={lock.id}>
                    <rect
                      x={lock.x}
                      y={lock.y}
                      width="60"
                      height="60"
                      rx="8"
                      className={`${getLockColor(
                        lock
                      )} transition-all duration-300`}
                      fill={
                        lock.heldBy === 1
                          ? "#1e3a5f"
                          : lock.heldBy === 2
                          ? "#14532d"
                          : "#1e293b"
                      }
                      stroke={
                        lock.heldBy === 1
                          ? "#3b82f6"
                          : lock.heldBy === 2
                          ? "#22c55e"
                          : "#475569"
                      }
                      strokeWidth="2"
                    />
                    <text
                      x={lock.x + 30}
                      y={lock.y + 35}
                      textAnchor="middle"
                      fill="white"
                      fontSize="12"
                      fontWeight="bold"
                    >
                      {lock.name}
                    </text>
                    {lock.heldBy && (
                      <text
                        x={lock.x + 30}
                        y={lock.y + 52}
                        textAnchor="middle"
                        fill="#94a3b8"
                        fontSize="10"
                      >
                        (held)
                      </text>
                    )}
                  </g>
                ))}

                {/* Threads */}
                {threads.map((thread) => (
                  <g key={thread.id}>
                    <circle
                      cx={thread.x + 40}
                      cy={thread.y + 40}
                      r="35"
                      fill={
                        thread.status === "deadlocked"
                          ? "#dc2626"
                          : thread.color === "blue"
                          ? "#3b82f6"
                          : "#22c55e"
                      }
                      className={`transition-all duration-300 ${
                        thread.status === "deadlocked" ? "animate-pulse" : ""
                      } ${thread.status === "waiting" ? "animate-bounce" : ""}`}
                      opacity={thread.status === "idle" ? 0.5 : 1}
                    />
                    <text
                      x={thread.x + 40}
                      y={thread.y + 35}
                      textAnchor="middle"
                      fill="white"
                      fontSize="11"
                      fontWeight="bold"
                    >
                      {thread.name}
                    </text>
                    <text
                      x={thread.x + 40}
                      y={thread.y + 50}
                      textAnchor="middle"
                      fill="white"
                      fontSize="9"
                      opacity="0.8"
                    >
                      {thread.status}
                    </text>
                    {thread.status === "deadlocked" && (
                      <text
                        x={thread.x + 40}
                        y={thread.y + 85}
                        textAnchor="middle"
                        fill="#ef4444"
                        fontSize="20"
                      >
                        💀
                      </text>
                    )}
                  </g>
                ))}

                {/* Deadlock indicator */}
                {isDeadlocked && (
                  <g>
                    <rect
                      x="150"
                      y="180"
                      width="200"
                      height="40"
                      rx="8"
                      fill="#dc2626"
                      className="animate-pulse"
                    />
                    <text
                      x="250"
                      y="205"
                      textAnchor="middle"
                      fill="white"
                      fontSize="14"
                      fontWeight="bold"
                    >
                      ⚠️ DEADLOCK DETECTED!
                    </text>
                  </g>
                )}
              </svg>
            </div>

            {/* Legend */}
            <div className="flex gap-6 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-blue-500"></div>
                <span className="text-slate-400">Thread A holds lock</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-green-500"></div>
                <span className="text-slate-400">Thread B holds lock</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-1 bg-yellow-500"
                  style={{ borderStyle: "dashed" }}
                ></div>
                <span className="text-slate-400">Waiting for lock</span>
              </div>
            </div>
          </div>

          {/* Right Panel: Logs & Explanation */}
          <div className="space-y-6">
            {/* Step Indicator */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
              <h3 className="text-lg font-semibold text-white mb-3">
                Progress
              </h3>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5, 6, 7].map((s) => (
                  <div
                    key={s}
                    className={`flex-1 h-2 rounded ${
                      s <= step
                        ? s === 7
                          ? "bg-red-500"
                          : "bg-blue-500"
                        : "bg-slate-700"
                    }`}
                  />
                ))}
              </div>
              <p className="text-slate-400 text-sm mt-2">Step {step} of 7</p>
            </div>

            {/* Event Log */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
              <h3 className="text-lg font-semibold text-white mb-3">
                Event Log
              </h3>
              <div className="space-y-2 font-mono text-xs h-48 overflow-y-auto">
                {logs.length === 0 ? (
                  <p className="text-slate-500">
                    Click &quot;Create Deadlock&quot; to start...
                  </p>
                ) : (
                  logs.map((log, i) => (
                    <div
                      key={i}
                      className={`p-2 rounded ${
                        log.includes("DEADLOCK")
                          ? "bg-red-500/20 text-red-400"
                          : log.includes("✓")
                          ? "bg-green-500/20 text-green-400"
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
                How It Happens
              </h3>
              <div className="space-y-3 text-sm text-slate-400">
                <div className="p-3 bg-slate-900 rounded-lg">
                  <p className="font-semibold text-blue-400">Thread A:</p>
                  <code className="text-xs">
                    acquire(Lock1) → acquire(Lock2)
                  </code>
                </div>
                <div className="p-3 bg-slate-900 rounded-lg">
                  <p className="font-semibold text-green-400">Thread B:</p>
                  <code className="text-xs">
                    acquire(Lock2) → acquire(Lock1)
                  </code>
                </div>
                <p className="text-yellow-400">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  Opposite order = deadlock risk!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Solutions Section */}
        <div className="mt-8 bg-slate-800/50 rounded-2xl border border-slate-700 p-6">
          <h3 className="text-xl font-bold text-white mb-4">
            💡 How to Prevent Deadlocks
          </h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-slate-900 rounded-xl p-4">
              <h4 className="font-semibold text-green-400 mb-2">
                1. Lock Ordering
              </h4>
              <p className="text-slate-400 text-sm">
                Always acquire locks in the same order. If everyone acquires
                Lock1 before Lock2, no circular wait can occur.
              </p>
            </div>
            <div className="bg-slate-900 rounded-xl p-4">
              <h4 className="font-semibold text-blue-400 mb-2">
                2. Lock Timeout
              </h4>
              <p className="text-slate-400 text-sm">
                Use tryLock with a timeout. If you can&apos;t get the lock in
                time, release what you have and retry.
              </p>
            </div>
            <div className="bg-slate-900 rounded-xl p-4">
              <h4 className="font-semibold text-purple-400 mb-2">
                3. Deadlock Detection
              </h4>
              <p className="text-slate-400 text-sm">
                Monitor for cycles in the wait-for graph. If detected, kill one
                thread to break the cycle.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
