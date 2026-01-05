"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Eye,
  Play,
  RotateCcw,
  Home,
  Cpu,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";

interface CacheState {
  value: number;
  dirty: boolean;
  version: number;
}

export default function MemoryOrderingDemo() {
  const [isRunning, setIsRunning] = useState(false);
  const [step, setStep] = useState(0);
  const [mainMemory, setMainMemory] = useState({ data: 0, ready: false });
  const [core1Cache, setCore1Cache] = useState<CacheState>({
    value: 0,
    dirty: false,
    version: 0,
  });
  const [core2Cache, setCore2Cache] = useState<CacheState>({
    value: 0,
    dirty: false,
    version: 0,
  });
  const [core1Action, setCore1Action] = useState("");
  const [core2Action, setCore2Action] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [scenario, setScenario] = useState<"broken" | "fixed">("broken");
  const [result, setResult] = useState<"success" | "failure" | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const addLog = (
    message: string,
    type: "core1" | "core2" | "memory" | "error"
  ) => {
    const colors: Record<string, string> = {
      core1: "text-blue-400",
      core2: "text-green-400",
      memory: "text-purple-400",
      error: "text-red-400",
    };
    setLogs((prev) => [
      ...prev.slice(-12),
      `<span class="${colors[type]}">${message}</span>`,
    ]);
  };

  const reset = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRunning(false);
    setStep(0);
    setMainMemory({ data: 0, ready: false });
    setCore1Cache({ value: 0, dirty: false, version: 0 });
    setCore2Cache({ value: 0, dirty: false, version: 0 });
    setCore1Action("");
    setCore2Action("");
    setLogs([]);
    setResult(null);
  };

  const runBrokenScenario = () => {
    reset();
    setScenario("broken");
    setIsRunning(true);

    const steps = [
      // Step 1: Core 1 writes data=42 to its cache
      () => {
        setCore1Action("Writing data=42 to cache");
        setCore1Cache({ value: 42, dirty: true, version: 1 });
        addLog("[Core 1] Write data=42 to local cache", "core1");
      },
      // Step 2: Core 1 writes ready=true to its cache
      () => {
        setCore1Action("Writing ready=true");
        setMainMemory((prev) => ({ ...prev, ready: true })); // This gets flushed first due to reorder!
        addLog(
          "[Core 1] Write ready=true (CPU reordered! flushed before data)",
          "core1"
        );
        addLog("⚠️ CPU optimized by reordering writes!", "error");
      },
      // Step 3: Core 2 sees ready=true
      () => {
        setCore2Action("Checking ready flag...");
        addLog("[Core 2] Read ready=true from memory", "core2");
      },
      // Step 4: Core 2 reads data - but gets stale value!
      () => {
        setCore2Action("Reading data...");
        setCore2Cache({ value: 0, dirty: false, version: 0 }); // Stale!
        addLog("[Core 2] Read data=0 from memory (STALE!)", "core2");
        addLog("💥 RACE CONDITION: Core 2 saw ready=true but data=0!", "error");
        setResult("failure");
      },
      // Step 5: Core 1's data finally flushes
      () => {
        setCore1Action("Cache flush");
        setMainMemory({ data: 42, ready: true });
        addLog(
          "[Memory] Core 1's data=42 finally visible... too late!",
          "memory"
        );
        setIsRunning(false);
      },
    ];

    let currentStep = 0;
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

  const runFixedScenario = () => {
    reset();
    setScenario("fixed");
    setIsRunning(true);

    const steps = [
      // Step 1: Core 1 writes data=42
      () => {
        setCore1Action("Writing data=42");
        setCore1Cache({ value: 42, dirty: true, version: 1 });
        addLog("[Core 1] Write data=42 to local cache", "core1");
      },
      // Step 2: Memory barrier - flush data before proceeding
      () => {
        setCore1Action("🔒 RELEASE BARRIER");
        setMainMemory((prev) => ({ ...prev, data: 42 }));
        addLog(
          "[Core 1] 🔒 RELEASE barrier - flush all writes before ready",
          "core1"
        );
        addLog("[Memory] data=42 now visible to all cores", "memory");
      },
      // Step 3: Core 1 writes ready=true (after barrier)
      () => {
        setCore1Action("Writing ready=true");
        setMainMemory((prev) => ({ ...prev, ready: true }));
        addLog("[Core 1] Write ready=true (AFTER barrier)", "core1");
      },
      // Step 4: Core 2 sees ready=true with acquire barrier
      () => {
        setCore2Action("🔒 ACQUIRE + check ready");
        addLog("[Core 2] 🔒 ACQUIRE barrier - sync cache before read", "core2");
        addLog("[Core 2] Read ready=true", "core2");
      },
      // Step 5: Core 2 reads data - gets correct value!
      () => {
        setCore2Action("Reading data...");
        setCore2Cache({ value: 42, dirty: false, version: 1 });
        addLog("[Core 2] Read data=42 ✓", "core2");
        addLog("✅ SUCCESS: Acquire-Release guarantees order!", "core2");
        setResult("success");
        setIsRunning(false);
      },
    ];

    let currentStep = 0;
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
              <Eye className="w-10 h-10 text-pink-500" />
              Memory Ordering & Visibility
            </h1>
            <p className="text-slate-400 mt-2">
              See why CPU caches can cause threads to see stale values
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={runBrokenScenario}
              disabled={isRunning}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-700 text-white px-6 py-3 rounded-xl transition-all"
            >
              <AlertTriangle className="w-5 h-5" />
              Run Broken
            </button>
            <button
              onClick={runFixedScenario}
              disabled={isRunning}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 text-white px-6 py-3 rounded-xl transition-all"
            >
              <Play className="w-5 h-5" />
              Run Fixed
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

        {/* Result Banner */}
        {result && (
          <div
            className={`mb-6 p-4 rounded-xl ${
              result === "success"
                ? "bg-green-500/20 border border-green-500/50"
                : "bg-red-500/20 border border-red-500/50"
            }`}
          >
            <div
              className={`text-lg font-bold ${
                result === "success" ? "text-green-400" : "text-red-400"
              }`}
            >
              {result === "success"
                ? "✅ Memory barriers guarantee correct ordering!"
                : "❌ Without barriers, CPU reordering causes data corruption!"}
            </div>
          </div>
        )}

        {/* Code Example */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">
            The Classic Pattern
          </h3>
          <pre className="text-sm text-slate-300 bg-slate-900 p-4 rounded-lg overflow-x-auto">
            {`// Thread 1 (Producer)              // Thread 2 (Consumer)
data = 42;                          while (!ready) { }
ready = true;                       console.log(data); // ???

// Without memory barriers, Thread 2 might see:
// ready=true but data=0 (stale!)`}
          </pre>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* CPU Visualization */}
          <div className="col-span-2 bg-slate-800/50 rounded-2xl border border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-6">
              CPU & Memory Architecture
            </h3>

            <div className="flex items-center justify-between gap-8">
              {/* Core 1 */}
              <div className="flex-1">
                <div
                  className={`p-4 rounded-xl border-2 transition-all ${
                    core1Action
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-slate-600 bg-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Cpu className="w-6 h-6 text-blue-400" />
                    <span className="font-semibold text-white">
                      Core 1 (Writer)
                    </span>
                  </div>
                  <div className="bg-slate-900 rounded-lg p-3 mb-3">
                    <div className="text-xs text-slate-400 mb-1">
                      Local Cache:
                    </div>
                    <div className="text-lg font-mono text-blue-400">
                      data = {core1Cache.value}{" "}
                      {core1Cache.dirty && (
                        <span className="text-yellow-400">(dirty)</span>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-blue-400 animate-pulse min-h-[20px]">
                    {core1Action}
                  </div>
                </div>
              </div>

              {/* Arrows */}
              <div className="flex flex-col items-center gap-2">
                <ArrowRight className="w-8 h-8 text-slate-500 transform rotate-90" />
                <div className="text-xs text-slate-500 text-center">
                  Cache
                  <br />
                  Coherence
                </div>
                <ArrowRight className="w-8 h-8 text-slate-500 transform -rotate-90" />
              </div>

              {/* Main Memory */}
              <div
                className={`p-4 rounded-xl border-2 transition-all ${
                  step > 0
                    ? "border-purple-500 bg-purple-500/10"
                    : "border-slate-600 bg-slate-800"
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded bg-purple-500 flex items-center justify-center text-white text-xs">
                    M
                  </div>
                  <span className="font-semibold text-white">Main Memory</span>
                </div>
                <div className="bg-slate-900 rounded-lg p-3">
                  <div className="space-y-2 font-mono text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">data:</span>
                      <span className="text-purple-400">{mainMemory.data}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">ready:</span>
                      <span
                        className={
                          mainMemory.ready ? "text-green-400" : "text-red-400"
                        }
                      >
                        {mainMemory.ready ? "true" : "false"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Arrows */}
              <div className="flex flex-col items-center gap-2">
                <ArrowRight className="w-8 h-8 text-slate-500 transform rotate-90" />
                <div className="text-xs text-slate-500 text-center">
                  Cache
                  <br />
                  Coherence
                </div>
                <ArrowRight className="w-8 h-8 text-slate-500 transform -rotate-90" />
              </div>

              {/* Core 2 */}
              <div className="flex-1">
                <div
                  className={`p-4 rounded-xl border-2 transition-all ${
                    core2Action
                      ? "border-green-500 bg-green-500/10"
                      : "border-slate-600 bg-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Cpu className="w-6 h-6 text-green-400" />
                    <span className="font-semibold text-white">
                      Core 2 (Reader)
                    </span>
                  </div>
                  <div className="bg-slate-900 rounded-lg p-3 mb-3">
                    <div className="text-xs text-slate-400 mb-1">
                      Local Cache:
                    </div>
                    <div
                      className={`text-lg font-mono ${
                        result === "failure" && core2Cache.value === 0
                          ? "text-red-400"
                          : "text-green-400"
                      }`}
                    >
                      data = {core2Cache.value}
                      {result === "failure" && core2Cache.value === 0 && " ⚠️"}
                    </div>
                  </div>
                  <div className="text-sm text-green-400 animate-pulse min-h-[20px]">
                    {core2Action}
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="mt-6">
              <div className="text-sm text-slate-400 mb-2">
                Progress: Step {step}/5
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <div
                    key={s}
                    className={`flex-1 h-2 rounded ${
                      s <= step
                        ? result === "failure" && s >= 4
                          ? "bg-red-500"
                          : scenario === "fixed"
                          ? "bg-green-500"
                          : "bg-blue-500"
                        : "bg-slate-700"
                    }`}
                  />
                ))}
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
                  <p className="text-slate-500">Click a scenario to start...</p>
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

            {/* Memory Barrier Types */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
              <h3 className="text-lg font-semibold text-white mb-3">
                Memory Barriers
              </h3>
              <div className="space-y-3 text-sm">
                <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/30">
                  <span className="text-blue-400 font-semibold">Release:</span>
                  <p className="text-slate-400">
                    Flush all writes before this point
                  </p>
                </div>
                <div className="p-2 bg-green-500/10 rounded-lg border border-green-500/30">
                  <span className="text-green-400 font-semibold">Acquire:</span>
                  <p className="text-slate-400">Sync cache before reading</p>
                </div>
                <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/30">
                  <span className="text-purple-400 font-semibold">SeqCst:</span>
                  <p className="text-slate-400">Both + total ordering</p>
                </div>
              </div>
            </div>

            {/* Why It Happens */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
              <h3 className="text-lg font-semibold text-white mb-3">
                Why CPUs Reorder
              </h3>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>• Store buffers delay writes</li>
                <li>• Out-of-order execution</li>
                <li>• Cache coherence latency</li>
                <li>• Compiler optimizations</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
