"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  Lock,
  Unlock,
  RefreshCw,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  Users,
  Shield,
  AlertTriangle,
} from "lucide-react";

interface LockDemo {
  active: boolean;
  waiting: number[];
  currentHolder: number | null;
  completedThreads: number[];
  phase: "idle" | "acquiring" | "holding" | "releasing";
  executionLog: string[];
}

interface CASAttempt {
  expected: number;
  actual: number;
  newValue: number;
  success: boolean;
  id: number;
  threadId: number;
  timestamp: number;
}

interface CASDemo {
  attempts: CASAttempt[];
  value: number;
  isRunning: boolean;
  phase: "idle" | "reading" | "comparing" | "swapping" | "retrying";
  currentThread: number | null;
}

const ConcurrencySolutions: React.FC = () => {
  const [showExplanation, setShowExplanation] = useState(true);

  // Lock Demo State
  const [lockDemo, setLockDemo] = useState<LockDemo>({
    active: false,
    waiting: [],
    currentHolder: null,
    completedThreads: [],
    phase: "idle",
    executionLog: [],
  });

  // CAS Demo State
  const [casDemo, setCasDemo] = useState<CASDemo>({
    attempts: [],
    value: 100,
    isRunning: false,
    phase: "idle",
    currentThread: null,
  });

  // Refs for intervals
  const lockInterval = useRef<NodeJS.Timeout | null>(null);
  const casInterval = useRef<NodeJS.Timeout | null>(null);

  // ---- Enhanced Lock Demo ----
  const startLockDemo = () => {
    const initialThreads = [1, 2, 3, 4];
    setLockDemo({
      active: true,
      waiting: initialThreads.slice(1),
      currentHolder: initialThreads[0],
      completedThreads: [],
      phase: "acquiring",
      executionLog: [`Thread 1 acquired the lock`],
    });

    let step = 0;
    const phases = ["holding", "releasing", "acquiring"] as const;

    lockInterval.current = setInterval(() => {
      setLockDemo((prev) => {
        // Complete when all threads are done
        if (prev.completedThreads.length >= 4) {
          clearInterval(lockInterval.current as NodeJS.Timeout);
          return {
            ...prev,
            active: false,
            phase: "idle",
            currentHolder: null,
            executionLog: [
              ...prev.executionLog,
              "✅ All threads completed successfully!",
            ],
          };
        }

        const currentPhase = phases[step % 3];
        step++;

        if (currentPhase === "holding") {
          return {
            ...prev,
            phase: "holding",
            executionLog: [
              ...prev.executionLog,
              `Thread ${prev.currentHolder} is doing critical work...`,
            ],
          };
        } else if (currentPhase === "releasing") {
          const completed = prev.currentHolder;
          return {
            ...prev,
            phase: "releasing",
            completedThreads: completed
              ? [...prev.completedThreads, completed]
              : prev.completedThreads,
            executionLog: [
              ...prev.executionLog,
              `Thread ${completed} released the lock`,
            ],
          };
        } else {
          // acquiring
          const nextThread = prev.waiting[0];
          if (!nextThread) {
            clearInterval(lockInterval.current as NodeJS.Timeout);
            return {
              ...prev,
              active: false,
              phase: "idle",
              currentHolder: null,
            };
          }
          return {
            ...prev,
            phase: "acquiring",
            currentHolder: nextThread,
            waiting: prev.waiting.slice(1),
            executionLog: [
              ...prev.executionLog,
              `Thread ${nextThread} acquired the lock`,
            ],
          };
        }
      });
    }, 1200);
  };

  // ---- Enhanced CAS Demo ----
  const startCASDemo = () => {
    setCasDemo({
      attempts: [],
      value: 100,
      isRunning: true,
      phase: "idle",
      currentThread: null,
    });

    // Simulate concurrent threads trying to increment
    const threads = [
      { id: 1, delay: 0 },
      { id: 2, delay: 300 },
      { id: 3, delay: 600 },
      { id: 1, delay: 1500 }, // Thread 1 retries
      { id: 2, delay: 2100 }, // Thread 2 retries
    ];

    let attemptIndex = 0;
    let currentValue = 100;

    casInterval.current = setInterval(() => {
      if (attemptIndex >= threads.length) {
        clearInterval(casInterval.current as NodeJS.Timeout);
        setCasDemo((prev) => ({
          ...prev,
          isRunning: false,
          phase: "idle",
          currentThread: null,
        }));
        return;
      }

      const thread = threads[attemptIndex];
      const expectedValue = currentValue;
      // Simulate race condition - sometimes the actual value has changed
      const actualValue =
        attemptIndex > 0 && attemptIndex < 3 ? currentValue + 1 : currentValue;
      const success = expectedValue === actualValue;
      const newValue = actualValue + 1;

      if (success) {
        currentValue = newValue;
      }

      setCasDemo((prev) => ({
        ...prev,
        value: success ? newValue : prev.value,
        phase: success ? "swapping" : "retrying",
        currentThread: thread.id,
        attempts: [
          ...prev.attempts,
          {
            expected: expectedValue,
            actual: actualValue,
            newValue,
            success,
            id: attemptIndex,
            threadId: thread.id,
            timestamp: Date.now(),
          },
        ],
      }));

      attemptIndex++;
    }, 900);
  };

  // Cleanup intervals
  useEffect(() => {
    return () => {
      if (lockInterval.current) clearInterval(lockInterval.current);
      if (casInterval.current) clearInterval(casInterval.current);
    };
  }, []);

  const resetLockDemo = () => {
    if (lockInterval.current) clearInterval(lockInterval.current);
    setLockDemo({
      active: false,
      waiting: [],
      currentHolder: null,
      completedThreads: [],
      phase: "idle",
      executionLog: [],
    });
  };

  const resetCASDemo = () => {
    if (casInterval.current) clearInterval(casInterval.current);
    setCasDemo({
      attempts: [],
      value: 100,
      isRunning: false,
      phase: "idle",
      currentThread: null,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-amber-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent mb-4">
            Locks & Compare-and-Swap (CAS)
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Two fundamental approaches to preventing race conditions in
            concurrent systems.
          </p>
        </div>

        {/* Educational Explanation Section */}
        <div className="mb-8">
          <button
            onClick={() => setShowExplanation(!showExplanation)}
            className="mb-4 flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
          >
            <span className="text-lg font-semibold">
              {showExplanation ? "▼" : "▶"} Understanding Synchronization
              Primitives
            </span>
          </button>

          {showExplanation && (
            <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6 space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <span className="text-2xl">🔐</span> Two Approaches to Thread
                  Safety
                </h3>
                <p className="text-slate-300 leading-relaxed">
                  When multiple threads need to modify shared data, we need
                  mechanisms to prevent corruption. &nbsp;
                  <span className="text-amber-400 font-semibold">
                    Locks
                  </span>{" "}
                  use blocking—threads wait in line. &nbsp;
                  <span className="text-purple-400 font-semibold">CAS</span> is
                  non-blocking—threads retry until they succeed.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                  <h4 className="text-amber-400 font-semibold mb-2">
                    🔒 Locks (Mutexes)
                  </h4>
                  <ul className="text-slate-400 text-sm space-y-1">
                    <li>✓ Simple mental model</li>
                    <li>✓ Works for complex critical sections</li>
                    <li>✗ Can cause deadlock if misused</li>
                    <li>✗ Blocking reduces throughput</li>
                  </ul>
                </div>
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                  <h4 className="text-purple-400 font-semibold mb-2">
                    ⚡ CAS (Lock-Free)
                  </h4>
                  <ul className="text-slate-400 text-sm space-y-1">
                    <li>✓ No blocking—always making progress</li>
                    <li>✓ Better performance under contention</li>
                    <li>✗ Only works for simple operations</li>
                    <li>✗ May retry many times (spinning)</li>
                  </ul>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg p-4 border border-blue-500/30">
                <h4 className="text-blue-400 font-semibold mb-2">
                  🎬 What to Watch
                </h4>
                <p className="text-slate-400 text-sm">
                  In the <span className="text-amber-400">Lock demo</span>,
                  watch threads queue up and enter one at a time. In the{" "}
                  <span className="text-purple-400">CAS demo</span>, see how
                  threads can fail and retry when their expected value
                  doesn&apos;t match.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ---- Locks Section ---- */}
        <section className="mb-12 bg-gradient-to-br from-slate-800 to-slate-800/50 rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-600/20 to-orange-600/20 px-8 py-6 border-b border-slate-700/50">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <Lock className="w-6 h-6 text-amber-400" />
              </div>
              Locks / Mutexes
              <span className="ml-auto text-sm font-normal bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full">
                Blocking
              </span>
            </h2>
          </div>

          <div className="p-8">
            {/* Explanation Cards */}
            <div className="grid md:grid-cols-3 gap-4 mb-8">
              <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/30">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-amber-400" />
                  <span className="font-semibold text-white">
                    Mutual Exclusion
                  </span>
                </div>
                <p className="text-slate-400 text-sm">
                  Only one thread can hold the lock at any time, preventing
                  simultaneous access.
                </p>
              </div>
              <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/30">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-amber-400" />
                  <span className="font-semibold text-white">
                    Wait in Queue
                  </span>
                </div>
                <p className="text-slate-400 text-sm">
                  Other threads block and wait until the lock becomes available.
                </p>
              </div>
              <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/30">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  <span className="font-semibold text-white">Trade-off</span>
                </div>
                <p className="text-slate-400 text-sm">
                  Simple but can cause contention and potential deadlocks if
                  misused.
                </p>
              </div>
            </div>

            {/* Visual Demo */}
            <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-700/50 mb-6">
              <div className="flex flex-col lg:flex-row gap-8">
                {/* Critical Section (Lock) */}
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
                    Critical Section
                  </h4>
                  <div
                    className={`relative h-48 rounded-xl border-4 flex flex-col items-center justify-center transition-all duration-500 ${
                      lockDemo.currentHolder
                        ? "border-red-500/70 bg-gradient-to-br from-red-500/10 to-orange-500/10"
                        : "border-green-500/70 bg-gradient-to-br from-green-500/10 to-emerald-500/10"
                    }`}
                  >
                    {/* Lock Icon with Animation */}
                    <div
                      className={`transition-all duration-500 ${
                        lockDemo.phase === "holding" ? "animate-pulse" : ""
                      }`}
                    >
                      {lockDemo.currentHolder ? (
                        <Lock className="w-16 h-16 text-red-400" />
                      ) : (
                        <Unlock className="w-16 h-16 text-green-400" />
                      )}
                    </div>

                    {/* Current Thread Inside */}
                    {lockDemo.currentHolder && (
                      <div className="mt-4 flex items-center gap-2 bg-blue-500 px-4 py-2 rounded-full animate-bounce">
                        <Users className="w-4 h-4 text-white" />
                        <span className="text-white font-bold">
                          Thread {lockDemo.currentHolder}
                        </span>
                      </div>
                    )}

                    {/* Phase Badge */}
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2">
                      <span
                        className={`px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          lockDemo.phase === "holding"
                            ? "bg-yellow-500 text-yellow-900"
                            : lockDemo.phase === "acquiring"
                            ? "bg-blue-500 text-white"
                            : lockDemo.phase === "releasing"
                            ? "bg-green-500 text-white"
                            : "bg-slate-600 text-slate-300"
                        }`}
                      >
                        {lockDemo.phase === "idle"
                          ? "Available"
                          : lockDemo.phase}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Queue */}
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
                    Waiting Queue
                  </h4>
                  <div className="space-y-3">
                    {lockDemo.waiting.length > 0 ? (
                      lockDemo.waiting.map((thread, index) => (
                        <div
                          key={thread}
                          className="flex items-center gap-3 bg-slate-700/50 px-4 py-3 rounded-lg border border-slate-600/50 transition-all duration-300"
                          style={{
                            transform: `translateX(${index * 5}px)`,
                            opacity: 1 - index * 0.15,
                          }}
                        >
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                            {thread}
                          </div>
                          <div>
                            <div className="text-white font-semibold">
                              Thread {thread}
                            </div>
                            <div className="text-slate-400 text-xs flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {index === 0
                                ? "Next in line"
                                : `Position ${index + 1}`}
                            </div>
                          </div>
                          {index === 0 && (
                            <ArrowRight className="ml-auto w-5 h-5 text-amber-400 animate-pulse" />
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-500 text-center py-8 border-2 border-dashed border-slate-700 rounded-lg">
                        {lockDemo.active
                          ? "Queue empty - all threads processed"
                          : "Click start to see threads queue up"}
                      </div>
                    )}
                  </div>

                  {/* Completed Threads */}
                  {lockDemo.completedThreads.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-700">
                      <h5 className="text-xs font-semibold text-slate-500 uppercase mb-2">
                        Completed
                      </h5>
                      <div className="flex gap-2">
                        {lockDemo.completedThreads.map((thread) => (
                          <div
                            key={thread}
                            className="w-8 h-8 bg-green-500/20 border border-green-500/50 rounded-full flex items-center justify-center text-green-400 font-bold text-sm"
                          >
                            {thread}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Execution Log */}
              {lockDemo.executionLog.length > 0 && (
                <div className="mt-6 pt-4 border-t border-slate-700">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">
                    Execution Log
                  </h4>
                  <div className="bg-slate-950 rounded-lg p-3 max-h-32 overflow-y-auto font-mono text-sm">
                    {lockDemo.executionLog.map((log, i) => (
                      <div
                        key={i}
                        className={`py-1 ${
                          log.includes("✅")
                            ? "text-green-400"
                            : "text-slate-400"
                        }`}
                      >
                        <span className="text-slate-600 mr-2">[{i + 1}]</span>
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex gap-3">
              <button
                onClick={startLockDemo}
                disabled={lockDemo.active}
                className="flex-1 cursor-pointer bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:from-slate-600 disabled:to-slate-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-amber-500/25 disabled:shadow-none"
              >
                {lockDemo.active ? "Demo Running..." : "▶ Start Lock Demo"}
              </button>
              <button
                onClick={resetLockDemo}
                className="cursor-pointer bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 px-6 rounded-xl transition-all"
              >
                Reset
              </button>
            </div>
          </div>
        </section>

        {/* ---- CAS / Atomic Section ---- */}
        <section className="bg-gradient-to-br from-slate-800 to-slate-800/50 rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600/20 to-indigo-600/20 px-8 py-6 border-b border-slate-700/50">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Zap className="w-6 h-6 text-purple-400" />
              </div>
              Compare-And-Swap (CAS)
              <span className="ml-auto text-sm font-normal bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full">
                Lock-Free
              </span>
            </h2>
          </div>

          <div className="p-8">
            {/* Explanation Cards */}
            <div className="grid md:grid-cols-3 gap-4 mb-8">
              <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/30">
                <div className="flex items-center gap-2 mb-2">
                  <RefreshCw className="w-5 h-5 text-purple-400" />
                  <span className="font-semibold text-white">Optimistic</span>
                </div>
                <p className="text-slate-400 text-sm">
                  Assume no conflict, read value, compute new value, then
                  attempt swap.
                </p>
              </div>
              <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/30">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-purple-400" />
                  <span className="font-semibold text-white">Atomic Check</span>
                </div>
                <p className="text-slate-400 text-sm">
                  Hardware ensures compare and swap happen as one
                  uninterruptible operation.
                </p>
              </div>
              <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/30">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="w-5 h-5 text-purple-400" />
                  <span className="font-semibold text-white">
                    Retry on Fail
                  </span>
                </div>
                <p className="text-slate-400 text-sm">
                  If value changed, re-read and retry. No blocking, just spin.
                </p>
              </div>
            </div>

            {/* CAS Algorithm Visualization */}
            <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-700/50 mb-6">
              <div className="flex flex-col lg:flex-row gap-8">
                {/* Current Value Display */}
                <div className="lg:w-1/3">
                  <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
                    Shared Memory
                  </h4>
                  <div className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 rounded-xl p-6 border border-purple-500/30 text-center">
                    <div className="text-slate-400 text-sm mb-2">counter =</div>
                    <div
                      className={`text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 transition-all duration-300 ${
                        casDemo.phase === "swapping" ? "scale-110" : "scale-100"
                      }`}
                    >
                      {casDemo.value}
                    </div>
                    {casDemo.currentThread && (
                      <div className="mt-4 text-sm">
                        <span
                          className={`px-3 py-1 rounded-full ${
                            casDemo.phase === "swapping"
                              ? "bg-green-500/20 text-green-400"
                              : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {casDemo.phase === "swapping"
                            ? "✓ Updated"
                            : "⟳ Conflict detected"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* CAS Pseudocode */}
                  <div className="mt-4 bg-slate-950 rounded-lg p-4 font-mono text-xs">
                    {/* eslint-disable-next-line react/jsx-no-comment-textnodes */}
                    <div className="text-slate-500">// CAS Operation</div>
                    <div className="text-purple-400">do {"{"}</div>
                    <div className="text-slate-300 pl-4">
                      old = <span className="text-blue-400">read</span>(counter)
                    </div>
                    <div className="text-slate-300 pl-4">new = old + 1</div>
                    <div className="text-purple-400">
                      {"}"} while (!<span className="text-green-400">CAS</span>
                      (counter, old, new))
                    </div>
                  </div>
                </div>

                {/* CAS Attempts Timeline */}
                <div className="lg:w-2/3">
                  <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
                    CAS Attempts Timeline
                  </h4>
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                    {casDemo.attempts.length > 0 ? (
                      casDemo.attempts.map((attempt) => (
                        <div
                          key={attempt.id}
                          className={`p-4 rounded-xl border-2 transition-all duration-500 ${
                            attempt.success
                              ? "bg-green-500/10 border-green-500/50"
                              : "bg-red-500/10 border-red-500/50"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                                  attempt.success
                                    ? "bg-green-500 text-white"
                                    : "bg-red-500 text-white"
                                }`}
                              >
                                T{attempt.threadId}
                              </div>
                              <div>
                                <div className="text-white font-semibold">
                                  Thread {attempt.threadId}
                                </div>
                                <div className="font-mono text-sm text-slate-400">
                                  CAS({attempt.expected}, {attempt.newValue})
                                </div>
                              </div>
                            </div>
                            <div>
                              {attempt.success ? (
                                <CheckCircle className="w-6 h-6 text-green-400" />
                              ) : (
                                <XCircle className="w-6 h-6 text-red-400" />
                              )}
                            </div>
                          </div>

                          {/* Detailed explanation */}
                          <div className="mt-3 pl-13 text-sm">
                            {attempt.success ? (
                              <div className="text-green-400">
                                ✓ Expected {attempt.expected} matched actual{" "}
                                {attempt.actual} → Updated to {attempt.newValue}
                              </div>
                            ) : (
                              <div className="text-red-400">
                                ✗ Expected {attempt.expected} but found{" "}
                                {attempt.actual} → Value was modified by another
                                thread, must retry
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-500 text-center py-12 border-2 border-dashed border-slate-700 rounded-lg">
                        <Zap className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                        Click start to see multiple threads competing with CAS
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Stats */}
            {casDemo.attempts.length > 0 && (
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-slate-700/30 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-white">
                    {casDemo.attempts.length}
                  </div>
                  <div className="text-slate-400 text-sm">Total Attempts</div>
                </div>
                <div className="bg-green-500/10 rounded-lg p-4 text-center border border-green-500/30">
                  <div className="text-2xl font-bold text-green-400">
                    {casDemo.attempts.filter((a) => a.success).length}
                  </div>
                  <div className="text-slate-400 text-sm">Successful</div>
                </div>
                <div className="bg-red-500/10 rounded-lg p-4 text-center border border-red-500/30">
                  <div className="text-2xl font-bold text-red-400">
                    {casDemo.attempts.filter((a) => !a.success).length}
                  </div>
                  <div className="text-slate-400 text-sm">Retries Needed</div>
                </div>
              </div>
            )}

            {/* Controls */}
            <div className="flex gap-3">
              <button
                onClick={startCASDemo}
                disabled={casDemo.isRunning}
                className="flex-1 cursor-pointer bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-slate-600 disabled:to-slate-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-purple-500/25 disabled:shadow-none"
              >
                {casDemo.isRunning ? "Demo Running..." : "▶ Start CAS Demo"}
              </button>
              <button
                onClick={resetCASDemo}
                className="cursor-pointer bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 px-6 rounded-xl transition-all"
              >
                Reset
              </button>
            </div>
          </div>
        </section>

        {/* Comparison Footer */}
        <div className="mt-8 bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
          <h3 className="text-lg font-bold text-white mb-4 text-center">
            When to Use Each Approach?
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="text-center">
              <Lock className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <h4 className="font-semibold text-white mb-2">Use Locks When</h4>
              <ul className="text-slate-400 text-sm space-y-1">
                <li>• Critical section has complex operations</li>
                <li>• Low contention expected</li>
                <li>• Simplicity is prioritized</li>
              </ul>
            </div>
            <div className="text-center">
              <Zap className="w-8 h-8 text-purple-400 mx-auto mb-2" />
              <h4 className="font-semibold text-white mb-2">Use CAS When</h4>
              <ul className="text-slate-400 text-sm space-y-1">
                <li>• Operations are simple (counters, flags)</li>
                <li>• High contention expected</li>
                <li>• Maximum throughput needed</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConcurrencySolutions;
