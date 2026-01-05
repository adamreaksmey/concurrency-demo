"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Zap,
  Play,
  RotateCcw,
  Home,
  Cpu,
  Clock,
  //   ArrowRight,
} from "lucide-react";
import Link from "next/link";

interface Task {
  id: number;
  type: "io" | "cpu";
  duration: number;
  status: "pending" | "running" | "waiting" | "completed";
  startTime: number;
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
];

export default function AsyncVsThreadsDemo() {
  const [asyncTasks, setAsyncTasks] = useState<Task[]>([]);
  const [threadTasks, setThreadTasks] = useState<Task[]>([]);
  const [parallelTasks, setParallelTasks] = useState<Task[]>([]);
  const [asyncTime, setAsyncTime] = useState(0);
  const [threadTime, setThreadTime] = useState(0);
  const [parallelTime, setParallelTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [, setLogs] = useState<string[]>([]);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const addLog = (message: string) => {
    setLogs((prev) => [...prev.slice(-10), message]);
  };

  const reset = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setAsyncTasks([]);
    setThreadTasks([]);
    setParallelTasks([]);
    setAsyncTime(0);
    setThreadTime(0);
    setParallelTime(0);
    setIsRunning(false);
    setLogs([]);
  };

  const createDemoTasks = (): Task[] => {
    return [
      {
        id: 1,
        type: "io",
        duration: 3,
        status: "pending",
        startTime: 0,
        color: COLORS[0],
        progress: 0,
      },
      {
        id: 2,
        type: "io",
        duration: 2,
        status: "pending",
        startTime: 0,
        color: COLORS[1],
        progress: 0,
      },
      {
        id: 3,
        type: "io",
        duration: 4,
        status: "pending",
        startTime: 0,
        color: COLORS[2],
        progress: 0,
      },
      {
        id: 4,
        type: "cpu",
        duration: 2,
        status: "pending",
        startTime: 0,
        color: COLORS[3],
        progress: 0,
      },
    ];
  };

  const runDemo = () => {
    reset();
    setIsRunning(true);

    // Initialize all three scenarios
    setAsyncTasks(createDemoTasks());
    setThreadTasks(createDemoTasks());
    setParallelTasks(createDemoTasks());

    let tick = 0;

    // Async simulation state
    let asyncCurrentTask = 0;
    let asyncWaitingFor: number[] = [];

    intervalRef.current = setInterval(() => {
      tick++;

      // === ASYNC/AWAIT Simulation (Single Thread, Cooperative) ===
      setAsyncTasks((prev) => {
        const tasks = [...prev];
        const allDone = tasks.every((t) => t.status === "completed");
        if (allDone) {
          setAsyncTime(tick);
          return tasks;
        }

        // Process I/O waits in background
        asyncWaitingFor = asyncWaitingFor.filter((id) => {
          const task = tasks.find((t) => t.id === id);
          if (task && task.status === "waiting") {
            task.progress += 100 / task.duration / 4;
            if (task.progress >= 100) {
              task.status = "completed";
              addLog(`[Async] Task ${id} completed (I/O returned)`);
              return false;
            }
          }
          return true;
        });

        // Find current task
        while (asyncCurrentTask < tasks.length) {
          const current = tasks[asyncCurrentTask];

          if (current.status === "pending") {
            current.status = "running";
            current.startTime = tick;
            addLog(`[Async] Started task ${current.id}`);
          }

          if (current.status === "running") {
            if (current.type === "io") {
              // I/O task yields control
              current.status = "waiting";
              asyncWaitingFor.push(current.id);
              addLog(`[Async] Task ${current.id} awaiting I/O (yields)`);
              asyncCurrentTask++;
              continue;
            } else {
              // CPU task blocks
              current.progress += 100 / current.duration / 4;
              if (current.progress >= 100) {
                current.status = "completed";
                addLog(`[Async] Task ${current.id} completed (CPU done)`);
                asyncCurrentTask++;
              }
              break; // CPU blocks - can't do anything else
            }
          }

          if (current.status === "completed" || current.status === "waiting") {
            asyncCurrentTask++;
          } else {
            break;
          }
        }

        return tasks;
      });

      // === THREADS Simulation (Multiple threads, preemptive on single core) ===
      setThreadTasks((prev) => {
        const tasks = [...prev];
        const allDone = tasks.every((t) => t.status === "completed");
        if (allDone) {
          setThreadTime(tick);
          return tasks;
        }

        // Round-robin between all non-completed tasks
        const activeTask = tasks.find((t) => t.status !== "completed");
        if (activeTask) {
          if (activeTask.status === "pending") {
            activeTask.status = "running";
            addLog(`[Thread] Started task ${activeTask.id}`);
          }
          activeTask.progress += 100 / activeTask.duration / 4;
          if (activeTask.progress >= 100) {
            activeTask.status = "completed";
            addLog(`[Thread] Task ${activeTask.id} completed`);
          }
        }

        return tasks;
      });

      // === PARALLEL Simulation (True parallelism - all run together) ===
      setParallelTasks((prev) => {
        const tasks = [...prev];
        const allDone = tasks.every((t) => t.status === "completed");
        if (allDone) {
          setParallelTime(tick);
          return tasks;
        }

        // All tasks run in parallel
        tasks.forEach((task) => {
          if (task.status === "pending") {
            task.status = "running";
          }
          if (task.status === "running") {
            task.progress += 100 / task.duration / 4;
            if (task.progress >= 100) {
              task.status = "completed";
            }
          }
        });

        return tasks;
      });

      // Stop after all complete
      const allAsyncDone = asyncTasks.every((t) => t.status === "completed");
      const allThreadDone = threadTasks.every((t) => t.status === "completed");
      const allParallelDone = parallelTasks.every(
        (t) => t.status === "completed"
      );

      if (tick > 100 || (allAsyncDone && allThreadDone && allParallelDone)) {
        setIsRunning(false);
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    }, 200);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const TaskBar = ({ task }: { task: Task }) => (
    <div className="relative h-8 rounded-lg overflow-hidden bg-slate-700">
      <div
        className="absolute inset-y-0 left-0 transition-all duration-200"
        style={{
          width: `${task.progress}%`,
          backgroundColor: task.color,
          opacity: task.status === "waiting" ? 0.5 : 1,
        }}
      />
      <div className="absolute inset-0 flex items-center justify-between px-2 text-xs text-white">
        <span>
          Task {task.id} ({task.type.toUpperCase()})
        </span>
        <span>{Math.round(task.progress)}%</span>
      </div>
      {task.status === "waiting" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-yellow-400 text-xs animate-pulse">
            ⏳ waiting
          </span>
        </div>
      )}
    </div>
  );

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
              <Zap className="w-10 h-10 text-purple-500" />
              Async vs Threads vs Parallelism
            </h1>
            <p className="text-slate-400 mt-2">
              See the fundamental differences in how they execute tasks
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={runDemo}
              disabled={isRunning}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 text-white px-6 py-3 rounded-xl transition-all"
            >
              <Play className="w-5 h-5" />
              {isRunning ? "Running..." : "Run Comparison"}
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

        {/* Results Banner */}
        {(asyncTime > 0 || threadTime > 0 || parallelTime > 0) && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div
              className={`rounded-xl p-4 border ${
                asyncTime > 0
                  ? "bg-green-500/20 border-green-500/30"
                  : "bg-slate-800/50 border-slate-700"
              }`}
            >
              <div className="text-green-400 text-sm">Async/Await</div>
              <div className="text-2xl font-bold text-white">
                {asyncTime > 0 ? `${asyncTime * 50}ms` : "..."}
              </div>
            </div>
            <div
              className={`rounded-xl p-4 border ${
                threadTime > 0
                  ? "bg-blue-500/20 border-blue-500/30"
                  : "bg-slate-800/50 border-slate-700"
              }`}
            >
              <div className="text-blue-400 text-sm">Threads (Single Core)</div>
              <div className="text-2xl font-bold text-white">
                {threadTime > 0 ? `${threadTime * 50}ms` : "..."}
              </div>
            </div>
            <div
              className={`rounded-xl p-4 border ${
                parallelTime > 0
                  ? "bg-purple-500/20 border-purple-500/30"
                  : "bg-slate-800/50 border-slate-700"
              }`}
            >
              <div className="text-purple-400 text-sm">
                Parallel (Multi-Core)
              </div>
              <div className="text-2xl font-bold text-white">
                {parallelTime > 0 ? `${parallelTime * 50}ms` : "..."}
              </div>
            </div>
          </div>
        )}

        {/* Three Columns */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          {/* Async/Await */}
          <div className="bg-slate-800/50 rounded-2xl border border-green-500/30 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-green-400" />
              <h3 className="text-lg font-semibold text-white">Async/Await</h3>
            </div>
            <div className="mb-4 p-3 bg-green-500/10 rounded-lg text-sm text-green-400">
              <strong>Single thread</strong> - yields during I/O, blocks during
              CPU
            </div>
            <div className="space-y-2">
              {asyncTasks.map((task) => (
                <TaskBar key={task.id} task={task} />
              ))}
            </div>
            <div className="mt-4 text-xs text-slate-400">
              • I/O tasks run &quot;concurrently&ldquo; (cooperative)
              <br />
              • CPU tasks block everything
              <br />• Great for I/O-bound work
            </div>
          </div>

          {/* Threads */}
          <div className="bg-slate-800/50 rounded-2xl border border-blue-500/30 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Cpu className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-semibold text-white">
                Threads (1 Core)
              </h3>
            </div>
            <div className="mb-4 p-3 bg-blue-500/10 rounded-lg text-sm text-blue-400">
              <strong>Multiple threads</strong> - preemptive scheduling, one at
              a time
            </div>
            <div className="space-y-2">
              {threadTasks.map((task) => (
                <TaskBar key={task.id} task={task} />
              ))}
            </div>
            <div className="mt-4 text-xs text-slate-400">
              • OS switches between threads
              <br />
              • Context switch overhead
              <br />• No parallelism on single core
            </div>
          </div>

          {/* Parallel */}
          <div className="bg-slate-800/50 rounded-2xl border border-purple-500/30 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-semibold text-white">
                Parallel (Multi-Core)
              </h3>
            </div>
            <div className="mb-4 p-3 bg-purple-500/10 rounded-lg text-sm text-purple-400">
              <strong>True parallelism</strong> - all tasks run simultaneously
            </div>
            <div className="space-y-2">
              {parallelTasks.map((task) => (
                <TaskBar key={task.id} task={task} />
              ))}
            </div>
            <div className="mt-4 text-xs text-slate-400">
              • Each task on separate core
              <br />
              • Fastest for CPU-bound work
              <br />• Limited by core count
            </div>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6">
          <h3 className="text-xl font-bold text-white mb-4">
            When to Use Each
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400">
                  <th className="p-3">Aspect</th>
                  <th className="p-3 text-green-400">Async/Await</th>
                  <th className="p-3 text-blue-400">Threads</th>
                  <th className="p-3 text-purple-400">Parallel</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                <tr className="border-t border-slate-700">
                  <td className="p-3 font-medium">Best for</td>
                  <td className="p-3">I/O-bound (network, files)</td>
                  <td className="p-3">Mixed workloads</td>
                  <td className="p-3">CPU-bound computation</td>
                </tr>
                <tr className="border-t border-slate-700">
                  <td className="p-3 font-medium">Concurrency</td>
                  <td className="p-3">Cooperative (yields)</td>
                  <td className="p-3">Preemptive (OS decides)</td>
                  <td className="p-3">True simultaneous</td>
                </tr>
                <tr className="border-t border-slate-700">
                  <td className="p-3 font-medium">Overhead</td>
                  <td className="p-3 text-green-400">Very low</td>
                  <td className="p-3 text-yellow-400">Medium</td>
                  <td className="p-3 text-orange-400">Higher</td>
                </tr>
                <tr className="border-t border-slate-700">
                  <td className="p-3 font-medium">Scale</td>
                  <td className="p-3">10,000+ tasks</td>
                  <td className="p-3">100s of threads</td>
                  <td className="p-3"># of CPU cores</td>
                </tr>
                <tr className="border-t border-slate-700">
                  <td className="p-3 font-medium">Race conditions</td>
                  <td className="p-3 text-yellow-400">Between awaits</td>
                  <td className="p-3 text-red-400">Everywhere</td>
                  <td className="p-3 text-red-400">Everywhere</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
