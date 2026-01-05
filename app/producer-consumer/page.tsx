"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Package,
  Play,
  RotateCcw,
  Home,
  Pause,
  ArrowRight,
  Inbox,
} from "lucide-react";
import Link from "next/link";

interface Item {
  id: number;
  color: string;
  producedBy: number;
  status: "producing" | "inQueue" | "consuming" | "consumed";
}

interface ThreadState {
  id: number;
  name: string;
  type: "producer" | "consumer";
  status: "idle" | "working" | "blocked" | "done";
  currentItem: number | null;
}

const BUFFER_SIZE = 5;
const COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

export default function ProducerConsumerDemo() {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [queue, setQueue] = useState<Item[]>([]);
  const [produced, setProduced] = useState(0);
  const [consumed, setConsumed] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [, setItemCounter] = useState(0);

  const [producers, setProducers] = useState<ThreadState[]>([
    {
      id: 1,
      name: "Producer 1",
      type: "producer",
      status: "idle",
      currentItem: null,
    },
    {
      id: 2,
      name: "Producer 2",
      type: "producer",
      status: "idle",
      currentItem: null,
    },
  ]);

  const [consumers, setConsumers] = useState<ThreadState[]>([
    {
      id: 1,
      name: "Consumer 1",
      type: "consumer",
      status: "idle",
      currentItem: null,
    },
    {
      id: 2,
      name: "Consumer 2",
      type: "consumer",
      status: "idle",
      currentItem: null,
    },
  ]);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const pauseRef = useRef(false);

  const addLog = (
    message: string,
    type: "produce" | "consume" | "blocked" | "info"
  ) => {
    const colors = {
      produce: "text-green-400",
      consume: "text-blue-400",
      blocked: "text-yellow-400",
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
    setQueue([]);
    setProduced(0);
    setConsumed(0);
    setLogs([]);
    setItemCounter(0);
    setProducers([
      {
        id: 1,
        name: "Producer 1",
        type: "producer",
        status: "idle",
        currentItem: null,
      },
      {
        id: 2,
        name: "Producer 2",
        type: "producer",
        status: "idle",
        currentItem: null,
      },
    ]);
    setConsumers([
      {
        id: 1,
        name: "Consumer 1",
        type: "consumer",
        status: "idle",
        currentItem: null,
      },
      {
        id: 2,
        name: "Consumer 2",
        type: "consumer",
        status: "idle",
        currentItem: null,
      },
    ]);
  };

  const runSimulation = () => {
    reset();
    setIsRunning(true);

    let localItemCounter = 0;
    let localQueue: Item[] = [];
    let localProduced = 0;
    let localConsumed = 0;

    intervalRef.current = setInterval(() => {
      if (pauseRef.current) return;

      // Random producer action
      if (Math.random() > 0.4) {
        const producerId = Math.random() > 0.5 ? 1 : 2;

        if (localQueue.length < BUFFER_SIZE) {
          localItemCounter++;
          const newItem: Item = {
            id: localItemCounter,
            color: COLORS[localItemCounter % COLORS.length],
            producedBy: producerId,
            status: "inQueue",
          };
          localQueue = [...localQueue, newItem];
          localProduced++;

          setQueue([...localQueue]);
          setProduced(localProduced);
          setItemCounter(localItemCounter);
          setProducers((prev) =>
            prev.map((p) =>
              p.id === producerId
                ? { ...p, status: "working", currentItem: localItemCounter }
                : p
            )
          );
          addLog(
            `Producer ${producerId}: Produced item #${localItemCounter}`,
            "produce"
          );

          setTimeout(() => {
            setProducers((prev) =>
              prev.map((p) =>
                p.id === producerId
                  ? { ...p, status: "idle", currentItem: null }
                  : p
              )
            );
          }, 400);
        } else {
          setProducers((prev) =>
            prev.map((p) =>
              p.id === producerId ? { ...p, status: "blocked" } : p
            )
          );
          addLog(`Producer ${producerId}: BLOCKED - Queue full!`, "blocked");

          setTimeout(() => {
            setProducers((prev) =>
              prev.map((p) =>
                p.id === producerId && p.status === "blocked"
                  ? { ...p, status: "idle" }
                  : p
              )
            );
          }, 600);
        }
      }

      // Random consumer action
      if (Math.random() > 0.3) {
        const consumerId = Math.random() > 0.5 ? 1 : 2;

        if (localQueue.length > 0) {
          const item = localQueue[0];
          localQueue = localQueue.slice(1);
          localConsumed++;

          setQueue([...localQueue]);
          setConsumed(localConsumed);
          setConsumers((prev) =>
            prev.map((c) =>
              c.id === consumerId
                ? { ...c, status: "working", currentItem: item.id }
                : c
            )
          );
          addLog(
            `Consumer ${consumerId}: Consumed item #${item.id}`,
            "consume"
          );

          setTimeout(() => {
            setConsumers((prev) =>
              prev.map((c) =>
                c.id === consumerId
                  ? { ...c, status: "idle", currentItem: null }
                  : c
              )
            );
          }, 400);
        } else {
          setConsumers((prev) =>
            prev.map((c) =>
              c.id === consumerId ? { ...c, status: "blocked" } : c
            )
          );
          addLog(`Consumer ${consumerId}: BLOCKED - Queue empty!`, "blocked");

          setTimeout(() => {
            setConsumers((prev) =>
              prev.map((c) =>
                c.id === consumerId && c.status === "blocked"
                  ? { ...c, status: "idle" }
                  : c
              )
            );
          }, 600);
        }
      }
    }, 800);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "working":
        return "bg-green-500";
      case "blocked":
        return "bg-yellow-500 animate-pulse";
      case "done":
        return "bg-blue-500";
      default:
        return "bg-slate-600";
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
              <Package className="w-10 h-10 text-orange-500" />
              Producer-Consumer Queue
            </h1>
            <p className="text-slate-400 mt-2">
              Watch producers fill a bounded buffer while consumers drain it
            </p>
          </div>
          <div className="flex gap-3">
            {!isRunning ? (
              <button
                onClick={runSimulation}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl transition-all"
              >
                <Play className="w-5 h-5" />
                Start Simulation
              </button>
            ) : (
              <button
                onClick={togglePause}
                className={`flex items-center gap-2 ${
                  isPaused
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-yellow-600 hover:bg-yellow-700"
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

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-green-500/20 rounded-xl p-4 border border-green-500/30">
            <div className="text-green-400 text-sm">Produced</div>
            <div className="text-3xl font-bold text-white">{produced}</div>
          </div>
          <div className="bg-blue-500/20 rounded-xl p-4 border border-blue-500/30">
            <div className="text-blue-400 text-sm">Consumed</div>
            <div className="text-3xl font-bold text-white">{consumed}</div>
          </div>
          <div className="bg-purple-500/20 rounded-xl p-4 border border-purple-500/30">
            <div className="text-purple-400 text-sm">In Queue</div>
            <div className="text-3xl font-bold text-white">
              {queue.length}/{BUFFER_SIZE}
            </div>
          </div>
          <div className="bg-slate-500/20 rounded-xl p-4 border border-slate-500/30">
            <div className="text-slate-400 text-sm">Throughput</div>
            <div className="text-3xl font-bold text-white">
              {produced > 0 ? Math.round((consumed / produced) * 100) : 0}%
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Main Visualization */}
          <div className="col-span-2 space-y-6">
            {/* Producer-Queue-Consumer Flow */}
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-white mb-6">
                Data Flow
              </h3>

              <div className="flex items-center justify-between">
                {/* Producers */}
                <div className="space-y-4">
                  <div className="text-center text-sm text-slate-400 mb-2">
                    Producers
                  </div>
                  {producers.map((producer) => (
                    <div key={producer.id} className="flex items-center gap-3">
                      <div
                        className={`w-16 h-16 rounded-xl ${getStatusColor(
                          producer.status
                        )} flex items-center justify-center transition-all duration-300`}
                      >
                        <Package className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <div className="text-white text-sm font-medium">
                          {producer.name}
                        </div>
                        <div className="text-xs text-slate-400">
                          {producer.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Arrow */}
                <ArrowRight className="w-8 h-8 text-green-500 animate-pulse" />

                {/* Queue */}
                <div className="flex-1 mx-4">
                  <div className="text-center text-sm text-slate-400 mb-2">
                    Bounded Buffer ({BUFFER_SIZE} slots)
                  </div>
                  <div className="flex gap-2 justify-center p-4 bg-slate-900 rounded-xl min-h-[80px] items-center">
                    {Array.from({ length: BUFFER_SIZE }).map((_, i) => {
                      const item = queue[i];
                      return (
                        <div
                          key={i}
                          className={`w-14 h-14 rounded-lg border-2 transition-all duration-300 flex items-center justify-center ${
                            item
                              ? "border-transparent scale-105"
                              : "border-dashed border-slate-600"
                          }`}
                          style={{
                            backgroundColor: item ? item.color : "transparent",
                          }}
                        >
                          {item && (
                            <span className="text-white text-xs font-bold">
                              #{item.id}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 mt-1 px-2">
                    <span>Front</span>
                    <span>Back</span>
                  </div>
                </div>

                {/* Arrow */}
                <ArrowRight className="w-8 h-8 text-blue-500 animate-pulse" />

                {/* Consumers */}
                <div className="space-y-4">
                  <div className="text-center text-sm text-slate-400 mb-2">
                    Consumers
                  </div>
                  {consumers.map((consumer) => (
                    <div key={consumer.id} className="flex items-center gap-3">
                      <div
                        className={`w-16 h-16 rounded-xl ${getStatusColor(
                          consumer.status
                        )} flex items-center justify-center transition-all duration-300`}
                      >
                        <Inbox className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <div className="text-white text-sm font-medium">
                          {consumer.name}
                        </div>
                        <div className="text-xs text-slate-400">
                          {consumer.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Blocking Explanation */}
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                ⚡ Key Concepts
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                  <h4 className="font-semibold text-yellow-400 mb-2">
                    Producer Blocking
                  </h4>
                  <p className="text-slate-400 text-sm">
                    When the queue is{" "}
                    <span className="text-yellow-400 font-bold">FULL</span>,
                    producers must wait (block) until a consumer removes an
                    item. This prevents memory overflow.
                  </p>
                </div>
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                  <h4 className="font-semibold text-yellow-400 mb-2">
                    Consumer Blocking
                  </h4>
                  <p className="text-slate-400 text-sm">
                    When the queue is{" "}
                    <span className="text-yellow-400 font-bold">EMPTY</span>,
                    consumers must wait (block) until a producer adds an item.
                    This prevents busy-waiting.
                  </p>
                </div>
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
              <div className="space-y-1 font-mono text-xs h-64 overflow-y-auto">
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
                Real-World Uses
              </h3>
              <ul className="space-y-2 text-sm text-slate-400">
                <li className="flex items-center gap-2">
                  <span className="text-green-400">•</span>
                  Message queues (RabbitMQ, Kafka)
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-blue-400">•</span>
                  Job processing (Bull, Sidekiq)
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-purple-400">•</span>
                  HTTP request handling
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-orange-400">•</span>
                  Print spoolers
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-pink-400">•</span>
                  Video encoding pipelines
                </li>
              </ul>
            </div>

            {/* Code Example */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
              <h3 className="text-lg font-semibold text-white mb-3">
                Implementation
              </h3>
              <pre className="text-xs text-slate-300 bg-slate-900 p-3 rounded-lg overflow-x-auto">
                {`// Bounded buffer with blocking
class BoundedQueue<T> {
  private queue: T[] = [];
  private maxSize: number;

  async put(item: T) {
    while (queue.length >= maxSize) {
      await this.waitForSpace();
    }
    this.queue.push(item);
    this.notifyConsumers();
  }

  async take(): Promise<T> {
    while (queue.length === 0) {
      await this.waitForItem();
    }
    const item = this.queue.shift()!;
    this.notifyProducers();
    return item;
  }
}`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
