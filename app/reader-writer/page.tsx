"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  BookOpen,
  //   Edit,
  Play,
  RotateCcw,
  Home,
  Pause,
  Eye,
  PenTool,
} from "lucide-react";
import Link from "next/link";

interface Thread {
  id: number;
  type: "reader" | "writer";
  status: "idle" | "waiting" | "active" | "done";
  startTime: number;
}

export default function ReaderWriterDemo() {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activeReaders, setActiveReaders] = useState<Thread[]>([]);
  const [activeWriter, setActiveWriter] = useState<Thread | null>(null);
  const [waitingReaders, setWaitingReaders] = useState<Thread[]>([]);
  const [waitingWriters, setWaitingWriters] = useState<Thread[]>([]);
  const [completedReads, setCompletedReads] = useState(0);
  const [completedWrites, setCompletedWrites] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [threadCounter, setThreadCounter] = useState(0);
  const [sharedData, setSharedData] = useState("Initial Value");
  const [dataVersion, setDataVersion] = useState(1);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const pauseRef = useRef(false);

  const addLog = (
    message: string,
    type: "read" | "write" | "wait" | "info"
  ) => {
    const colors: Record<string, string> = {
      read: "text-blue-400",
      write: "text-orange-400",
      wait: "text-yellow-400",
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
    setActiveReaders([]);
    setActiveWriter(null);
    setWaitingReaders([]);
    setWaitingWriters([]);
    setCompletedReads(0);
    setCompletedWrites(0);
    setLogs([]);
    setThreadCounter(0);
    setSharedData("Initial Value");
    setDataVersion(1);
  };

  const addReader = () => {
    const newThread: Thread = {
      id: threadCounter + 1,
      type: "reader",
      status: "waiting",
      startTime: Date.now(),
    };
    setThreadCounter((prev) => prev + 1);

    if (activeWriter) {
      setWaitingReaders((prev) => [...prev, newThread]);
      addLog(`Reader #${newThread.id}: Waiting (writer active)`, "wait");
    } else {
      setActiveReaders((prev) => [...prev, { ...newThread, status: "active" }]);
      addLog(`Reader #${newThread.id}: Started reading`, "read");
    }
  };

  const addWriter = () => {
    const newThread: Thread = {
      id: threadCounter + 1,
      type: "writer",
      status: "waiting",
      startTime: Date.now(),
    };
    setThreadCounter((prev) => prev + 1);

    if (activeWriter || activeReaders.length > 0) {
      setWaitingWriters((prev) => [...prev, newThread]);
      addLog(
        `Writer #${newThread.id}: Waiting (${
          activeWriter ? "writer" : "readers"
        } active)`,
        "wait"
      );
    } else {
      setActiveWriter({ ...newThread, status: "active" });
      addLog(`Writer #${newThread.id}: Started writing`, "write");
    }
  };

  const runSimulation = () => {
    setIsRunning(true);

    intervalRef.current = setInterval(() => {
      if (pauseRef.current) return;

      // Process active readers (randomly complete some)
      setActiveReaders((prev) => {
        const completed = prev.filter(() => Math.random() > 0.7);
        const remaining = prev.filter((r) => !completed.includes(r));

        completed.forEach((r) => {
          addLog(`Reader #${r.id}: ✓ Finished reading`, "read");
          setCompletedReads((c) => c + 1);
        });

        return remaining;
      });

      // Process active writer
      if (activeWriter && Math.random() > 0.6) {
        addLog(`Writer #${activeWriter.id}: ✓ Finished writing`, "write");
        setDataVersion((v) => v + 1);
        setSharedData(`Modified v${dataVersion + 1}`);
        setCompletedWrites((c) => c + 1);
        setActiveWriter(null);
      }

      // Promote waiting threads
      setActiveWriter((prev) => {
        if (prev) return prev;

        // Check if we can promote a writer
        if (waitingWriters.length > 0) {
          setActiveReaders((readers) => {
            if (readers.length === 0) {
              setWaitingWriters((ww) => {
                const [next, ...rest] = ww;
                if (next) {
                  addLog(`Writer #${next.id}: Started writing`, "write");
                  setActiveWriter({ ...next, status: "active" });
                }
                return rest;
              });
            }
            return readers;
          });
        }
        return null;
      });

      // Promote waiting readers if no active/waiting writers
      setWaitingReaders((prev) => {
        if (prev.length === 0) return prev;
        if (activeWriter) return prev;
        if (waitingWriters.length > 0) return prev; // Writer priority

        const promoted = prev.slice(0, 3); // Promote up to 3 readers
        promoted.forEach((r) => {
          addLog(`Reader #${r.id}: Started reading`, "read");
          setActiveReaders((ar) => [...ar, { ...r, status: "active" }]);
        });

        return prev.slice(3);
      });

      // Randomly add new threads
      if (Math.random() > 0.85) {
        if (Math.random() > 0.3) {
          addReader();
        } else {
          addWriter();
        }
      }
    }, 600);
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
              <BookOpen className="w-10 h-10 text-indigo-500" />
              Reader-Writer Lock
            </h1>
            <p className="text-slate-400 mt-2">
              Multiple readers OR one exclusive writer - never both
            </p>
          </div>
          <div className="flex gap-3">
            {!isRunning ? (
              <button
                onClick={runSimulation}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl transition-all"
              >
                <Play className="w-5 h-5" />
                Start Simulation
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

        {/* Manual Controls */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={addReader}
            disabled={!isRunning || isPaused}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white px-6 py-3 rounded-xl transition-all"
          >
            <Eye className="w-5 h-5" />
            Add Reader
          </button>
          <button
            onClick={addWriter}
            disabled={!isRunning || isPaused}
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-700 text-white px-6 py-3 rounded-xl transition-all"
          >
            <PenTool className="w-5 h-5" />
            Add Writer
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-blue-500/20 rounded-xl p-4 border border-blue-500/30">
            <div className="text-blue-400 text-sm">Active Readers</div>
            <div className="text-3xl font-bold text-white">
              {activeReaders.length}
            </div>
          </div>
          <div
            className={`rounded-xl p-4 border ${
              activeWriter
                ? "bg-orange-500/20 border-orange-500/30"
                : "bg-slate-500/20 border-slate-500/30"
            }`}
          >
            <div
              className={
                activeWriter
                  ? "text-orange-400 text-sm"
                  : "text-slate-400 text-sm"
              }
            >
              Active Writer
            </div>
            <div className="text-3xl font-bold text-white">
              {activeWriter ? "1" : "0"}
            </div>
          </div>
          <div className="bg-yellow-500/20 rounded-xl p-4 border border-yellow-500/30">
            <div className="text-yellow-400 text-sm">Waiting</div>
            <div className="text-3xl font-bold text-white">
              {waitingReaders.length + waitingWriters.length}
            </div>
          </div>
          <div className="bg-green-500/20 rounded-xl p-4 border border-green-500/30">
            <div className="text-green-400 text-sm">Reads Done</div>
            <div className="text-3xl font-bold text-white">
              {completedReads}
            </div>
          </div>
          <div className="bg-purple-500/20 rounded-xl p-4 border border-purple-500/30">
            <div className="text-purple-400 text-sm">Writes Done</div>
            <div className="text-3xl font-bold text-white">
              {completedWrites}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Main Visualization */}
          <div className="col-span-2 space-y-6">
            {/* Shared Resource */}
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Shared Resource
              </h3>

              <div
                className={`p-6 rounded-xl border-4 transition-all duration-300 ${
                  activeWriter
                    ? "border-orange-500 bg-orange-500/10 animate-pulse"
                    : activeReaders.length > 0
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-slate-600 bg-slate-800"
                }`}
              >
                <div className="text-center">
                  <div className="text-2xl font-bold text-white mb-2">
                    {sharedData}
                  </div>
                  <div className="text-sm text-slate-400">
                    Version: {dataVersion}
                  </div>
                </div>

                {activeWriter && (
                  <div className="mt-4 text-center text-orange-400 font-semibold animate-pulse">
                    🔒 EXCLUSIVE WRITE MODE - Writer #{activeWriter.id}
                  </div>
                )}

                {!activeWriter && activeReaders.length > 0 && (
                  <div className="mt-4 text-center text-blue-400">
                    📖 {activeReaders.length} readers accessing simultaneously
                  </div>
                )}
              </div>
            </div>

            {/* Thread Visualization */}
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Threads</h3>

              <div className="grid grid-cols-2 gap-6">
                {/* Active */}
                <div>
                  <h4 className="text-sm font-medium text-slate-400 mb-3">
                    Active
                  </h4>
                  <div className="space-y-2 min-h-[100px]">
                    {activeReaders.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center gap-2 bg-blue-500/20 border border-blue-500/40 rounded-lg px-4 py-2"
                      >
                        <Eye className="w-4 h-4 text-blue-400" />
                        <span className="text-blue-400">Reader #{r.id}</span>
                        <span className="ml-auto text-xs text-blue-300 animate-pulse">
                          reading...
                        </span>
                      </div>
                    ))}
                    {activeWriter && (
                      <div className="flex items-center gap-2 bg-orange-500/20 border border-orange-500/40 rounded-lg px-4 py-2 animate-pulse">
                        <PenTool className="w-4 h-4 text-orange-400" />
                        <span className="text-orange-400">
                          Writer #{activeWriter.id}
                        </span>
                        <span className="ml-auto text-xs text-orange-300">
                          writing...
                        </span>
                      </div>
                    )}
                    {!activeWriter && activeReaders.length === 0 && (
                      <div className="text-slate-500 text-sm italic">
                        No active threads
                      </div>
                    )}
                  </div>
                </div>

                {/* Waiting */}
                <div>
                  <h4 className="text-sm font-medium text-slate-400 mb-3">
                    Waiting Queue
                  </h4>
                  <div className="space-y-2 min-h-[100px]">
                    {waitingWriters.map((w) => (
                      <div
                        key={w.id}
                        className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-2"
                      >
                        <PenTool className="w-4 h-4 text-yellow-400" />
                        <span className="text-yellow-400">Writer #{w.id}</span>
                        <span className="ml-auto text-xs text-yellow-300">
                          waiting
                        </span>
                      </div>
                    ))}
                    {waitingReaders.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-2"
                      >
                        <Eye className="w-4 h-4 text-yellow-400" />
                        <span className="text-yellow-400">Reader #{r.id}</span>
                        <span className="ml-auto text-xs text-yellow-300">
                          waiting
                        </span>
                      </div>
                    ))}
                    {waitingReaders.length === 0 &&
                      waitingWriters.length === 0 && (
                        <div className="text-slate-500 text-sm italic">
                          No waiting threads
                        </div>
                      )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel */}
          <div className="space-y-6">
            {/* Rules */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
              <h3 className="text-lg font-semibold text-white mb-3">
                Lock Rules
              </h3>
              <div className="space-y-3 text-sm">
                <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <span className="text-blue-400 font-semibold">Readers:</span>
                  <p className="text-slate-400 mt-1">
                    Multiple can read simultaneously
                  </p>
                </div>
                <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                  <span className="text-orange-400 font-semibold">
                    Writers:
                  </span>
                  <p className="text-slate-400 mt-1">
                    Need exclusive access (no other readers or writers)
                  </p>
                </div>
                <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                  <span className="text-purple-400 font-semibold">
                    Priority:
                  </span>
                  <p className="text-slate-400 mt-1">
                    Writers wait for readers, but get priority to prevent
                    starvation
                  </p>
                </div>
              </div>
            </div>

            {/* Event Log */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
              <h3 className="text-lg font-semibold text-white mb-3">
                Event Log
              </h3>
              <div className="space-y-1 font-mono text-xs h-48 overflow-y-auto">
                {logs.length === 0 ? (
                  <p className="text-slate-500">
                    Start simulation to see events...
                  </p>
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

            {/* Use Cases */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
              <h3 className="text-lg font-semibold text-white mb-3">
                Use Cases
              </h3>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>• Database read replicas</li>
                <li>• Configuration caches</li>
                <li>• In-memory data stores</li>
                <li>• File system access</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
