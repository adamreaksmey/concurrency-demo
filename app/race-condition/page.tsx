"use client";
import React, { useState, useRef, useEffect } from "react";
import {
  Play,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  Zap,
  Users,
  TrendingDown,
} from "lucide-react";

interface ThreadState {
  id: number;
  step: "idle" | "reading" | "computing" | "writing" | "done";
  localValue: number | null;
  color: string;
}

interface LogEntry {
  threadId: number;
  action: string;
  value: number;
  timestamp: number;
  isLostUpdate?: boolean;
}

const RaceConditionDemo: React.FC = () => {
  // Unsafe counter state
  const [unsafeCounter, setUnsafeCounter] = useState(0);
  const [unsafeThreads, setUnsafeThreads] = useState<ThreadState[]>([
    { id: 1, step: "idle", localValue: null, color: "blue" },
    { id: 2, step: "idle", localValue: null, color: "purple" },
    { id: 3, step: "idle", localValue: null, color: "green" },
  ]);
  const [unsafeLog, setUnsafeLog] = useState<LogEntry[]>([]);
  const [unsafeRunning, setUnsafeRunning] = useState(false);
  const [lostUpdates, setLostUpdates] = useState(0);

  // Atomic counter state
  const [atomicCounter, setAtomicCounter] = useState(0);
  const [atomicThreads, setAtomicThreads] = useState<ThreadState[]>([
    { id: 1, step: "idle", localValue: null, color: "blue" },
    { id: 2, step: "idle", localValue: null, color: "purple" },
    { id: 3, step: "idle", localValue: null, color: "green" },
  ]);
  const [atomicLog, setAtomicLog] = useState<LogEntry[]>([]);
  const [atomicRunning, setAtomicRunning] = useState(false);

  const unsafeInterval = useRef<NodeJS.Timeout | null>(null);
  const atomicInterval = useRef<NodeJS.Timeout | null>(null);

  // Cleanup
  useEffect(() => {
    return () => {
      if (unsafeInterval.current) clearInterval(unsafeInterval.current);
      if (atomicInterval.current) clearInterval(atomicInterval.current);
    };
  }, []);

  // Run unsafe demo - shows race condition
  const runUnsafeDemo = () => {
    setUnsafeCounter(0);
    setUnsafeLog([]);
    setLostUpdates(0);
    setUnsafeRunning(true);

    const threads = [
      {
        id: 1,
        step: "idle" as const,
        localValue: null as number | null,
        color: "blue",
      },
      {
        id: 2,
        step: "idle" as const,
        localValue: null as number | null,
        color: "purple",
      },
      {
        id: 3,
        step: "idle" as const,
        localValue: null as number | null,
        color: "green",
      },
    ];
    setUnsafeThreads(threads);

    let counter = 0;
    let step = 0;
    let lost = 0;

    // Simulate interleaved execution showing race condition
    const sequence = [
      // All threads read the same value (0)
      { threadId: 1, action: "read", desc: "Read counter" },
      { threadId: 2, action: "read", desc: "Read counter" },
      { threadId: 3, action: "read", desc: "Read counter" },
      // All threads compute locally
      { threadId: 1, action: "compute", desc: "Compute +1" },
      { threadId: 2, action: "compute", desc: "Compute +1" },
      { threadId: 3, action: "compute", desc: "Compute +1" },
      // All threads write - each overwrites the previous!
      { threadId: 1, action: "write", desc: "Write result" },
      { threadId: 2, action: "write", desc: "Write result" },
      { threadId: 3, action: "write", desc: "Write result" },
    ];

    const threadLocalValues: Record<number, number> = {};

    unsafeInterval.current = setInterval(() => {
      if (step >= sequence.length) {
        clearInterval(unsafeInterval.current as NodeJS.Timeout);
        setUnsafeThreads((prev) =>
          prev.map((t) => ({ ...t, step: "done" as const }))
        );
        setUnsafeRunning(false);
        return;
      }

      const action = sequence[step];

      setUnsafeThreads((prev) =>
        prev.map((t) => {
          if (t.id === action.threadId) {
            if (action.action === "read") {
              threadLocalValues[t.id] = counter;
              return { ...t, step: "reading", localValue: counter };
            } else if (action.action === "compute") {
              const computed = threadLocalValues[t.id] + 1;
              threadLocalValues[t.id] = computed;
              return { ...t, step: "computing", localValue: computed };
            } else if (action.action === "write") {
              return { ...t, step: "writing" };
            }
          }
          return t;
        })
      );

      if (action.action === "write") {
        const valueToWrite = threadLocalValues[action.threadId];
        const isLost = counter >= valueToWrite;
        if (isLost) {
          lost++;
          setLostUpdates(lost);
        }
        counter = valueToWrite;
        setUnsafeCounter(counter);

        setUnsafeLog((prev) => [
          ...prev,
          {
            threadId: action.threadId,
            action: `Wrote ${valueToWrite}`,
            value: counter,
            timestamp: Date.now(),
            isLostUpdate: isLost,
          },
        ]);
      } else {
        setUnsafeLog((prev) => [
          ...prev,
          {
            threadId: action.threadId,
            action:
              action.desc +
              ` (${
                action.action === "read"
                  ? counter
                  : threadLocalValues[action.threadId]
              })`,
            value: counter,
            timestamp: Date.now(),
          },
        ]);
      }

      step++;
    }, 600);
  };

  // Run atomic demo - shows correct behavior
  const runAtomicDemo = () => {
    setAtomicCounter(0);
    setAtomicLog([]);
    setAtomicRunning(true);

    const threads = [
      {
        id: 1,
        step: "idle" as const,
        localValue: null as number | null,
        color: "blue",
      },
      {
        id: 2,
        step: "idle" as const,
        localValue: null as number | null,
        color: "purple",
      },
      {
        id: 3,
        step: "idle" as const,
        localValue: null as number | null,
        color: "green",
      },
    ];
    setAtomicThreads(threads);

    let counter = 0;
    let threadIndex = 0;
    const threadOrder = [1, 2, 3];

    atomicInterval.current = setInterval(() => {
      if (threadIndex >= threadOrder.length) {
        clearInterval(atomicInterval.current as NodeJS.Timeout);
        setAtomicThreads((prev) =>
          prev.map((t) => ({ ...t, step: "done" as const }))
        );
        setAtomicRunning(false);
        return;
      }

      const currentThread = threadOrder[threadIndex];

      // Atomic operation - read, increment, write all at once
      setAtomicThreads((prev) =>
        prev.map((t) =>
          t.id === currentThread
            ? { ...t, step: "writing", localValue: counter + 1 }
            : t
        )
      );

      counter++;
      setAtomicCounter(counter);

      setAtomicLog((prev) => [
        ...prev,
        {
          threadId: currentThread,
          action: `Atomic increment → ${counter}`,
          value: counter,
          timestamp: Date.now(),
        },
      ]);

      threadIndex++;
    }, 800);
  };

  const resetAll = () => {
    if (unsafeInterval.current) clearInterval(unsafeInterval.current);
    if (atomicInterval.current) clearInterval(atomicInterval.current);

    setUnsafeCounter(0);
    setAtomicCounter(0);
    setUnsafeLog([]);
    setAtomicLog([]);
    setLostUpdates(0);
    setUnsafeRunning(false);
    setAtomicRunning(false);
    setUnsafeThreads([
      { id: 1, step: "idle", localValue: null, color: "blue" },
      { id: 2, step: "idle", localValue: null, color: "purple" },
      { id: 3, step: "idle", localValue: null, color: "green" },
    ]);
    setAtomicThreads([
      { id: 1, step: "idle", localValue: null, color: "blue" },
      { id: 2, step: "idle", localValue: null, color: "purple" },
      { id: 3, step: "idle", localValue: null, color: "green" },
    ]);
  };

  const getStepColor = (step: string) => {
    switch (step) {
      case "reading":
        return "bg-yellow-500";
      case "computing":
        return "bg-orange-500";
      case "writing":
        return "bg-red-500";
      case "done":
        return "bg-green-500";
      default:
        return "bg-slate-600";
    }
  };

  const getThreadColor = (color: string) => {
    switch (color) {
      case "blue":
        return "from-blue-500 to-blue-600";
      case "purple":
        return "from-purple-500 to-purple-600";
      case "green":
        return "from-emerald-500 to-emerald-600";
      default:
        return "from-slate-500 to-slate-600";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent mb-4">
            Race Condition
          </h1>
          <p className="text-slate-400 text-lg max-w-3xl mx-auto">
            Watch how concurrent threads can corrupt shared data when operations
            aren&apos;t atomic. Compare unsafe vs atomic operations side by
            side.
          </p>
        </div>

        {/* Main Demo Grid */}
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Unsafe Demo */}
          <div className="bg-gradient-to-br from-red-900/20 to-slate-800 rounded-2xl border border-red-500/30 overflow-hidden">
            <div className="bg-red-500/10 px-6 py-4 border-b border-red-500/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-red-400" />
                <h2 className="text-xl font-bold text-white">
                  Unsafe (Race Condition)
                </h2>
              </div>
              <code className="text-sm bg-slate-900/50 px-3 py-1 rounded text-red-300">
                counter += 1
              </code>
            </div>

            <div className="p-6">
              {/* Counter Display */}
              <div className="text-center mb-6">
                <div className="text-slate-400 text-sm mb-2">Counter Value</div>
                <div
                  className={`inline-block text-6xl font-bold px-8 py-4 rounded-xl transition-all duration-300 ${
                    lostUpdates > 0
                      ? "bg-red-500/20 text-red-400 border-2 border-red-500/50"
                      : "bg-slate-800 text-white"
                  }`}
                >
                  {unsafeCounter}
                </div>
                <div className="text-slate-500 text-sm mt-2">
                  Expected: 3 | Actual: {unsafeCounter}
                </div>
              </div>

              {/* Thread Visualization */}
              <div className="space-y-3 mb-6">
                {unsafeThreads.map((thread) => (
                  <div
                    key={thread.id}
                    className="flex items-center gap-4 bg-slate-800/50 rounded-lg p-3"
                  >
                    <div
                      className={`w-12 h-12 rounded-full bg-gradient-to-br ${getThreadColor(
                        thread.color
                      )} flex items-center justify-center text-white font-bold shadow-lg`}
                    >
                      T{thread.id}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">
                          Thread {thread.id}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium text-white ${getStepColor(
                            thread.step
                          )}`}
                        >
                          {thread.step}
                        </span>
                      </div>
                      {thread.localValue !== null && (
                        <div className="text-slate-400 text-sm">
                          Local value: {thread.localValue}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Lost Updates Warning */}
              {lostUpdates > 0 && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 text-red-400">
                    <TrendingDown className="w-5 h-5" />
                    <span className="font-semibold">
                      {lostUpdates} update(s) lost!
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm mt-1">
                    Threads overwrote each other&apos;s work because they all
                    read the same initial value.
                  </p>
                </div>
              )}

              {/* Log */}
              <div className="bg-slate-900/50 rounded-lg p-3 h-40 overflow-y-auto text-sm font-mono">
                {unsafeLog.length === 0 ? (
                  <div className="text-slate-500 text-center py-8">
                    Click &quot;Run Demo&quot; to see race condition
                  </div>
                ) : (
                  unsafeLog.map((entry, i) => (
                    <div
                      key={i}
                      className={`py-1 ${
                        entry.isLostUpdate ? "text-red-400" : "text-slate-400"
                      }`}
                    >
                      <span
                        className={`inline-block w-8 text-center rounded mr-2 ${
                          entry.threadId === 1
                            ? "bg-blue-500/30 text-blue-300"
                            : entry.threadId === 2
                            ? "bg-purple-500/30 text-purple-300"
                            : "bg-emerald-500/30 text-emerald-300"
                        }`}
                      >
                        T{entry.threadId}
                      </span>
                      {entry.action}
                      {entry.isLostUpdate && " ⚠️ LOST!"}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Atomic Demo */}
          <div className="bg-gradient-to-br from-green-900/20 to-slate-800 rounded-2xl border border-green-500/30 overflow-hidden">
            <div className="bg-green-500/10 px-6 py-4 border-b border-green-500/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-400" />
                <h2 className="text-xl font-bold text-white">Atomic (Safe)</h2>
              </div>
              <code className="text-sm bg-slate-900/50 px-3 py-1 rounded text-green-300">
                atomicIncrement()
              </code>
            </div>

            <div className="p-6">
              {/* Counter Display */}
              <div className="text-center mb-6">
                <div className="text-slate-400 text-sm mb-2">Counter Value</div>
                <div className="inline-block text-6xl font-bold px-8 py-4 rounded-xl bg-green-500/20 text-green-400 border-2 border-green-500/50 transition-all duration-300">
                  {atomicCounter}
                </div>
                <div className="text-slate-500 text-sm mt-2">
                  Expected: 3 | Actual: {atomicCounter}
                </div>
              </div>

              {/* Thread Visualization */}
              <div className="space-y-3 mb-6">
                {atomicThreads.map((thread) => (
                  <div
                    key={thread.id}
                    className="flex items-center gap-4 bg-slate-800/50 rounded-lg p-3"
                  >
                    <div
                      className={`w-12 h-12 rounded-full bg-gradient-to-br ${getThreadColor(
                        thread.color
                      )} flex items-center justify-center text-white font-bold shadow-lg`}
                    >
                      T{thread.id}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">
                          Thread {thread.id}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium text-white ${getStepColor(
                            thread.step
                          )}`}
                        >
                          {thread.step}
                        </span>
                      </div>
                      {thread.localValue !== null && (
                        <div className="text-slate-400 text-sm">
                          Result: {thread.localValue}
                        </div>
                      )}
                    </div>
                    {thread.step === "done" && (
                      <Zap className="w-5 h-5 text-green-400" />
                    )}
                  </div>
                ))}
              </div>

              {/* Success Message */}
              {atomicCounter === 3 &&
                !atomicRunning &&
                atomicLog.length > 0 && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 text-green-400">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-semibold">
                        All updates preserved!
                      </span>
                    </div>
                    <p className="text-slate-400 text-sm mt-1">
                      Each atomic operation completes fully before the next
                      begins.
                    </p>
                  </div>
                )}

              {/* Log */}
              <div className="bg-slate-900/50 rounded-lg p-3 h-40 overflow-y-auto text-sm font-mono">
                {atomicLog.length === 0 ? (
                  <div className="text-slate-500 text-center py-8">
                    Click &quot;Run Demo&quot; to see atomic operations
                  </div>
                ) : (
                  atomicLog.map((entry, i) => (
                    <div key={i} className="py-1 text-green-400">
                      <span
                        className={`inline-block w-8 text-center rounded mr-2 ${
                          entry.threadId === 1
                            ? "bg-blue-500/30 text-blue-300"
                            : entry.threadId === 2
                            ? "bg-purple-500/30 text-purple-300"
                            : "bg-emerald-500/30 text-emerald-300"
                        }`}
                      >
                        T{entry.threadId}
                      </span>
                      {entry.action} ✓
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-4 mb-12">
          <button
            onClick={() => {
              runUnsafeDemo();
              runAtomicDemo();
            }}
            disabled={unsafeRunning || atomicRunning}
            className="flex items-center gap-2 cursor-pointer bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-slate-600 disabled:to-slate-600 text-white font-semibold py-3 px-8 rounded-xl transition-all shadow-lg hover:shadow-blue-500/25"
          >
            <Play className="w-5 h-5" />
            Run Both Demos
          </button>
          <button
            onClick={resetAll}
            className="flex items-center gap-2 cursor-pointer bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 px-8 rounded-xl transition-all"
          >
            <RotateCcw className="w-5 h-5" />
            Reset
          </button>
        </div>

        {/* Explanation */}
        <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700/50">
          <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <Users className="w-7 h-7 text-blue-400" />
            What&apos;s Happening?
          </h3>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h4 className="text-lg font-semibold text-red-400 mb-3">
                Why Unsafe Fails
              </h4>
              <div className="text-slate-400 space-y-2">
                <p>
                  The operation{" "}
                  <code className="text-red-300">counter += 1</code> is actually
                  3 steps:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Read current value</li>
                  <li>Add 1 to it locally</li>
                  <li>Write new value back</li>
                </ol>
                <p className="text-sm mt-3">
                  When threads interleave, they all read the <em>same</em>{" "}
                  initial value (0), each computes 1, and each writes 1. Two
                  updates are lost!
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-green-400 mb-3">
                Why Atomic Works
              </h4>
              <div className="text-slate-400 space-y-2">
                <p>
                  Atomic operations are{" "}
                  <span className="text-green-300">indivisible</span> - the
                  entire read-modify-write happens as one unit.
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Hardware guarantees no interleaving</li>
                  <li>Each thread sees the latest value</li>
                  <li>No updates can be lost</li>
                </ul>
                <p className="text-sm mt-3">
                  The counter correctly reaches 3 because each increment builds
                  on the previous result.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-8 text-center">
          <a
            href="/lock-and-cas"
            className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
          >
            Learn about Locks & CAS solutions →
          </a>
        </div>
      </div>
    </div>
  );
};

export default RaceConditionDemo;
