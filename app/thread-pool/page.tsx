"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Users,
  Play,
  RotateCcw,
  Home,
  Pause,
  CheckCircle,
  Clock,
  Loader,
} from "lucide-react";
import Link from "next/link";

interface Task {
  id: number;
  duration: number;
  status: "queued" | "processing" | "completed";
  assignedTo: number | null;
  progress: number;
  color: string;
}

interface Worker {
  id: number;
  name: string;
  status: "idle" | "busy";
  currentTask: number | null;
  completedTasks: number;
}

const COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
];

export default function ThreadPoolDemo() {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [workerCount, setWorkerCount] = useState(4);
  const [taskQueue, setTaskQueue] = useState<Task[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [taskCounter, setTaskCounter] = useState(0);
  const [totalProcessed, setTotalProcessed] = useState(0);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const pauseRef = useRef(false);

  // Initialize workers when count changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWorkers(
      Array.from({ length: workerCount }, (_, i) => ({
        id: i + 1,
        name: `Worker ${i + 1}`,
        status: "idle",
        currentTask: null,
        completedTasks: 0,
      }))
    );
  }, [workerCount]);

  const addLog = (message: string) => {
    setLogs((prev) => [
      ...prev.slice(-15),
      `[${new Date().toLocaleTimeString()}] ${message}`,
    ]);
  };

  const reset = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRunning(false);
    setIsPaused(false);
    pauseRef.current = false;
    setTaskQueue([]);
    setCompletedTasks([]);
    setLogs([]);
    setTaskCounter(0);
    setTotalProcessed(0);
    setWorkers(
      Array.from({ length: workerCount }, (_, i) => ({
        id: i + 1,
        name: `Worker ${i + 1}`,
        status: "idle",
        currentTask: null,
        completedTasks: 0,
      }))
    );
  };

  const addTask = () => {
    const newTask: Task = {
      id: taskCounter + 1,
      duration: Math.floor(Math.random() * 3) + 2, // 2-4 seconds
      status: "queued",
      assignedTo: null,
      progress: 0,
      color: COLORS[taskCounter % COLORS.length],
    };
    setTaskQueue((prev) => [...prev, newTask]);
    setTaskCounter((prev) => prev + 1);
    addLog(`Task #${newTask.id} added to queue (${newTask.duration}s)`);
  };

  const addBatchTasks = () => {
    const batch: Task[] = [];
    for (let i = 0; i < 10; i++) {
      batch.push({
        id: taskCounter + i + 1,
        duration: Math.floor(Math.random() * 3) + 2,
        status: "queued",
        assignedTo: null,
        progress: 0,
        color: COLORS[(taskCounter + i) % COLORS.length],
      });
    }
    setTaskQueue((prev) => [...prev, ...batch]);
    setTaskCounter((prev) => prev + 10);
    addLog(`Added batch of 10 tasks to queue`);
  };

  const runSimulation = () => {
    setIsRunning(true);

    intervalRef.current = setInterval(() => {
      if (pauseRef.current) return;

      setWorkers((prevWorkers) => {
        const newWorkers = [...prevWorkers]; // Move this declaration here

        setTaskQueue((prevQueue) => {
          let newQueue = [...prevQueue];
          const newCompleted: Task[] = [];

          // Process each worker
          newWorkers.forEach((worker) => {
            if (worker.status === "busy" && worker.currentTask) {
              // Find the task being processed
              const taskIndex = newQueue.findIndex(
                (t) => t.id === worker.currentTask
              );
              if (taskIndex !== -1) {
                const task = newQueue[taskIndex];
                task.progress += 100 / task.duration / 4; // Progress based on duration

                if (task.progress >= 100) {
                  // Task completed
                  task.status = "completed";
                  task.progress = 100;
                  newCompleted.push(task);
                  newQueue = newQueue.filter((t) => t.id !== task.id);
                  worker.status = "idle";
                  worker.currentTask = null;
                  worker.completedTasks++;
                  addLog(`Worker ${worker.id}: ✓ Completed task #${task.id}`);
                  setTotalProcessed((prev) => prev + 1);
                }
              }
            }

            // Assign new task to idle worker
            if (worker.status === "idle") {
              const nextTask = newQueue.find((t) => t.status === "queued");
              if (nextTask) {
                nextTask.status = "processing";
                nextTask.assignedTo = worker.id;
                worker.status = "busy";
                worker.currentTask = nextTask.id;
                addLog(`Worker ${worker.id}: Started task #${nextTask.id}`);
              }
            }
          });

          if (newCompleted.length > 0) {
            setCompletedTasks((prev) => [...prev, ...newCompleted].slice(-20));
          }

          return newQueue;
        });

        return newWorkers;
      });
    }, 250);
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
      <div className="max-w-7xl mx-auto">
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
              <Users className="w-10 h-10 text-cyan-500" />
              Thread Pool Demo
            </h1>
            <p className="text-slate-400 mt-2">
              See how a fixed pool of workers processes a queue of tasks
              efficiently
            </p>
          </div>
          <div className="flex gap-3">
            {!isRunning ? (
              <button
                onClick={runSimulation}
                className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-3 rounded-xl transition-all"
              >
                <Play className="w-5 h-5" />
                Start Pool
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
            <span className="text-slate-400">Workers:</span>
            <div className="flex gap-2">
              {[2, 4, 6, 8].map((count) => (
                <button
                  key={count}
                  onClick={() => !isRunning && setWorkerCount(count)}
                  disabled={isRunning}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    workerCount === count
                      ? "bg-cyan-600 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  } ${isRunning ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={addTask}
            disabled={!isRunning || isPaused}
            className="bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:text-slate-500 text-white px-6 py-3 rounded-xl transition-all"
          >
            + Add Task
          </button>
          <button
            onClick={addBatchTasks}
            disabled={!isRunning || isPaused}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:text-slate-500 text-white px-6 py-3 rounded-xl transition-all"
          >
            + Add 10 Tasks
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-orange-500/20 rounded-xl p-4 border border-orange-500/30">
            <div className="text-orange-400 text-sm flex items-center gap-2">
              <Clock className="w-4 h-4" /> Queued
            </div>
            <div className="text-3xl font-bold text-white">
              {taskQueue.filter((t) => t.status === "queued").length}
            </div>
          </div>
          <div className="bg-cyan-500/20 rounded-xl p-4 border border-cyan-500/30">
            <div className="text-cyan-400 text-sm flex items-center gap-2">
              <Loader className="w-4 h-4" /> Processing
            </div>
            <div className="text-3xl font-bold text-white">
              {taskQueue.filter((t) => t.status === "processing").length}
            </div>
          </div>
          <div className="bg-green-500/20 rounded-xl p-4 border border-green-500/30">
            <div className="text-green-400 text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> Completed
            </div>
            <div className="text-3xl font-bold text-white">
              {totalProcessed}
            </div>
          </div>
          <div className="bg-purple-500/20 rounded-xl p-4 border border-purple-500/30">
            <div className="text-purple-400 text-sm">Active Workers</div>
            <div className="text-3xl font-bold text-white">
              {workers.filter((w) => w.status === "busy").length}/{workerCount}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Workers Visualization */}
          <div className="col-span-2 bg-slate-800/50 rounded-2xl border border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Worker Pool
            </h3>

            <div className="grid grid-cols-2 gap-4">
              {workers.map((worker) => {
                const currentTask = taskQueue.find(
                  (t) => t.id === worker.currentTask
                );
                return (
                  <div
                    key={worker.id}
                    className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                      worker.status === "busy"
                        ? "border-cyan-500 bg-cyan-500/10"
                        : "border-slate-600 bg-slate-800"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            worker.status === "busy"
                              ? "bg-green-500 animate-pulse"
                              : "bg-slate-500"
                          }`}
                        />
                        <span className="font-semibold text-white">
                          {worker.name}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400">
                        {worker.completedTasks} completed
                      </span>
                    </div>

                    {currentTask ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-400">
                            Task #{currentTask.id}
                          </span>
                          <span className="text-cyan-400">
                            {Math.round(currentTask.progress)}%
                          </span>
                        </div>
                        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full transition-all duration-200 rounded-full"
                            style={{
                              width: `${currentTask.progress}%`,
                              backgroundColor: currentTask.color,
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="text-slate-500 text-sm italic">
                        Waiting for task...
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Task Queue Visualization */}
            <div className="mt-6">
              <h4 className="text-md font-semibold text-white mb-3">
                Task Queue
              </h4>
              <div className="flex gap-2 flex-wrap p-4 bg-slate-900 rounded-xl min-h-[60px]">
                {taskQueue.filter((t) => t.status === "queued").length === 0 ? (
                  <span className="text-slate-500 text-sm">
                    Queue empty - add tasks!
                  </span>
                ) : (
                  taskQueue
                    .filter((t) => t.status === "queued")
                    .map((task) => (
                      <div
                        key={task.id}
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-bold transition-all"
                        style={{ backgroundColor: task.color }}
                      >
                        #{task.id}
                      </div>
                    ))
                )}
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
                  <p className="text-slate-500">Start pool and add tasks...</p>
                ) : (
                  logs.map((log, i) => (
                    <div
                      key={i}
                      className={`p-2 rounded ${
                        log.includes("✓")
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

            {/* Benefits */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
              <h3 className="text-lg font-semibold text-white mb-3">
                Why Thread Pools?
              </h3>
              <ul className="space-y-2 text-sm text-slate-400">
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓</span>
                  <span>
                    <span className="text-white font-medium">
                      Reuse threads
                    </span>{" "}
                    - no creation overhead per task
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓</span>
                  <span>
                    <span className="text-white font-medium">
                      Bounded concurrency
                    </span>{" "}
                    - prevent resource exhaustion
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓</span>
                  <span>
                    <span className="text-white font-medium">
                      Queue management
                    </span>{" "}
                    - handle bursts of work
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓</span>
                  <span>
                    <span className="text-white font-medium">
                      Load balancing
                    </span>{" "}
                    - distribute work evenly
                  </span>
                </li>
              </ul>
            </div>

            {/* Completed */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
              <h3 className="text-lg font-semibold text-white mb-3">
                Recently Completed
              </h3>
              <div className="flex gap-2 flex-wrap">
                {completedTasks.slice(-12).map((task) => (
                  <div
                    key={task.id}
                    className="w-8 h-8 rounded flex items-center justify-center text-white text-xs font-bold opacity-60"
                    style={{ backgroundColor: task.color }}
                  >
                    ✓
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
