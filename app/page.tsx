import Link from "next/link";
import {
  Lock,
  Zap,
  AlertTriangle,
  ArrowRight,
  Github,
  Skull,
  Package,
  Users,
  BookOpen,
  TrafficCone,
  Eye,
  AlertCircle,
} from "lucide-react";

const demos = [
  // Beginner Level
  {
    href: "/race-condition",
    title: "Race Conditions",
    description:
      "Watch multiple threads corrupt shared data in real-time. See why counter++ isn't actually atomic.",
    icon: AlertTriangle,
    color: "red",
    tags: ["Lost Updates", "Thread Interleaving"],
    level: "Beginner",
    order: 1,
  },
  {
    href: "/async-vs-threads",
    title: "Async vs Threads",
    description:
      "Side-by-side comparison of async/await, threading, and true parallelism. Clear the confusion!",
    icon: Zap,
    color: "purple",
    tags: ["I/O vs CPU", "Concurrency Models"],
    level: "Beginner",
    order: 2,
  },
  {
    href: "/lock-and-cas",
    title: "Locks & CAS",
    description:
      "Explore how Mutex and Compare-And-Swap solve race conditions with different trade-offs.",
    icon: Lock,
    color: "amber",
    tags: ["Mutual Exclusion", "Atomic Operations"],
    level: "Beginner",
    order: 3,
  },
  // Intermediate Level
  {
    href: "/deadlock",
    title: "Deadlock",
    description:
      "Visualize two threads lock each other in an eternal embrace of death. See the circular wait condition.",
    icon: Skull,
    color: "rose",
    tags: ["Circular Wait", "Lock Ordering"],
    level: "Intermediate",
    order: 4,
  },
  {
    href: "/producer-consumer",
    title: "Producer-Consumer",
    description:
      "Watch producers fill a bounded buffer while consumers drain it. See blocking in action.",
    icon: Package,
    color: "orange",
    tags: ["Bounded Buffer", "Blocking Queue"],
    level: "Intermediate",
    order: 5,
  },
  {
    href: "/semaphore",
    title: "Semaphore",
    description:
      "Control access to a limited pool of resources. The tollbooth analogy for rate limiting.",
    icon: TrafficCone,
    color: "yellow",
    tags: ["Rate Limiting", "Resource Pool"],
    level: "Intermediate",
    order: 6,
  },
  {
    href: "/thread-pool",
    title: "Thread Pool",
    description:
      "See how a fixed pool of workers processes a queue of tasks efficiently without thread explosion.",
    icon: Users,
    color: "cyan",
    tags: ["Worker Pool", "Task Queue"],
    level: "Intermediate",
    order: 7,
  },
  // Advanced Level
  {
    href: "/reader-writer",
    title: "Reader-Writer Lock",
    description:
      "Multiple readers OR one exclusive writer - never both. Perfect for read-heavy workloads.",
    icon: BookOpen,
    color: "indigo",
    tags: ["Shared Access", "Exclusive Write"],
    level: "Advanced",
    order: 8,
  },
  {
    href: "/memory-ordering",
    title: "Memory Ordering",
    description:
      "See why CPU caches can cause threads to see stale values. Understand memory barriers.",
    icon: Eye,
    color: "pink",
    tags: ["Cache Coherence", "Visibility"],
    level: "Advanced",
    order: 9,
  },
  {
    href: "/starvation",
    title: "Starvation",
    description:
      "Watch low-priority threads wait forever. Compare unfair vs fair scheduling strategies.",
    icon: AlertCircle,
    color: "red",
    tags: ["Priority Inversion", "Fair Scheduling"],
    level: "Advanced",
    order: 10,
  },
];

const levelConfig: Record<string, { bg: string; text: string; label: string }> =
  {
    Beginner: {
      bg: "bg-green-500/20",
      text: "text-green-400",
      label: "🌱 Beginner",
    },
    Intermediate: {
      bg: "bg-yellow-500/20",
      text: "text-yellow-400",
      label: "🌿 Intermediate",
    },
    Advanced: {
      bg: "bg-red-500/20",
      text: "text-red-400",
      label: "🔥 Advanced",
    },
  };

const colorClasses: Record<
  string,
  { border: string; bg: string; icon: string; hover: string }
> = {
  red: {
    border: "border-red-500/30",
    bg: "from-red-900/20",
    icon: "text-red-400",
    hover: "hover:border-red-500/60 hover:shadow-red-500/10",
  },
  amber: {
    border: "border-amber-500/30",
    bg: "from-amber-900/20",
    icon: "text-amber-400",
    hover: "hover:border-amber-500/60 hover:shadow-amber-500/10",
  },
  rose: {
    border: "border-rose-500/30",
    bg: "from-rose-900/20",
    icon: "text-rose-400",
    hover: "hover:border-rose-500/60 hover:shadow-rose-500/10",
  },
  orange: {
    border: "border-orange-500/30",
    bg: "from-orange-900/20",
    icon: "text-orange-400",
    hover: "hover:border-orange-500/60 hover:shadow-orange-500/10",
  },
  cyan: {
    border: "border-cyan-500/30",
    bg: "from-cyan-900/20",
    icon: "text-cyan-400",
    hover: "hover:border-cyan-500/60 hover:shadow-cyan-500/10",
  },
  indigo: {
    border: "border-indigo-500/30",
    bg: "from-indigo-900/20",
    icon: "text-indigo-400",
    hover: "hover:border-indigo-500/60 hover:shadow-indigo-500/10",
  },
  yellow: {
    border: "border-yellow-500/30",
    bg: "from-yellow-900/20",
    icon: "text-yellow-400",
    hover: "hover:border-yellow-500/60 hover:shadow-yellow-500/10",
  },
  purple: {
    border: "border-purple-500/30",
    bg: "from-purple-900/20",
    icon: "text-purple-400",
    hover: "hover:border-purple-500/60 hover:shadow-purple-500/10",
  },
  pink: {
    border: "border-pink-500/30",
    bg: "from-pink-900/20",
    icon: "text-pink-400",
    hover: "hover:border-pink-500/60 hover:shadow-pink-500/10",
  },
};

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-2 mb-6">
            <Zap className="w-4 h-4 text-blue-400" />
            <span className="text-blue-400 text-sm font-medium">
              10 Interactive Demos
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Concurrency
            </span>
            <br />
            <span className="text-slate-300">Demystified</span>
          </h1>

          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-8">
            Master concurrency through interactive visualizations. See race
            conditions, deadlocks, and synchronization primitives in action.
          </p>

          <a
            href="https://github.com/adamreaksmey/concurrency-demo"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-xl transition-all border border-slate-700"
          >
            <Github className="w-5 h-5" />
            View on GitHub
          </a>
        </div>

        {/* Demo Cards Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {demos.map((demo) => {
            const colors = colorClasses[demo.color];
            const level = levelConfig[demo.level];
            const Icon = demo.icon;
            return (
              <Link key={demo.href} href={demo.href} className="group">
                <div
                  className={`h-full bg-gradient-to-br ${colors.bg} to-slate-800 rounded-2xl border ${colors.border} p-6 transition-all duration-300 ${colors.hover} hover:shadow-2xl hover:-translate-y-1`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 bg-slate-800/80 rounded-xl`}>
                        <Icon className={`w-6 h-6 ${colors.icon}`} />
                      </div>
                      <div
                        className={`px-2 py-1 rounded-full text-xs font-medium ${level.bg} ${level.text}`}
                      >
                        {level.label}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 text-xs font-mono">
                        #{demo.order}
                      </span>
                      <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>

                  <h2 className="text-xl font-bold text-white mb-2">
                    {demo.title}
                  </h2>

                  <p className="text-slate-400 text-sm mb-4 line-clamp-2">
                    {demo.description}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {demo.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-slate-700/50 text-slate-300 text-xs rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Learning Path */}
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-8 mb-16">
          <h3 className="text-2xl font-bold text-white mb-6 text-center">
            📚 Suggested Learning Path
          </h3>

          <div className="space-y-6">
            {/* Beginner */}
            <div className="flex items-center gap-4">
              <div className="w-50 flex-shrink-0">
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-500/20 text-green-400">
                  🌱 Beginner
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 bg-slate-700 rounded-lg text-white text-sm">
                  1. Race Conditions
                </span>
                <span className="text-slate-500">→</span>
                <span className="px-3 py-1 bg-slate-700 rounded-lg text-white text-sm">
                  2. Async vs Threads
                </span>
                <span className="text-slate-500">→</span>
                <span className="px-3 py-1 bg-slate-700 rounded-lg text-white text-sm">
                  3. Locks & CAS
                </span>
              </div>
            </div>

            {/* Intermediate */}
            <div className="flex items-center gap-4">
              <div className="w-50 flex-shrink-0">
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-500/20 text-yellow-400">
                  🌿 Intermediate
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 bg-slate-700 rounded-lg text-white text-sm">
                  4. Deadlock
                </span>
                <span className="text-slate-500">→</span>
                <span className="px-3 py-1 bg-slate-700 rounded-lg text-white text-sm">
                  5. Producer-Consumer
                </span>
                <span className="text-slate-500">→</span>
                <span className="px-3 py-1 bg-slate-700 rounded-lg text-white text-sm">
                  6. Semaphore
                </span>
                <span className="text-slate-500">→</span>
                <span className="px-3 py-1 bg-slate-700 rounded-lg text-white text-sm">
                  7. Thread Pool
                </span>
              </div>
            </div>

            {/* Advanced */}
            <div className="flex items-center gap-4">
              <div className="w-50 flex-shrink-0">
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-500/20 text-red-400">
                  🔥 Advanced
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 bg-slate-700 rounded-lg text-white text-sm">
                  8. Reader-Writer
                </span>
                <span className="text-slate-500">→</span>
                <span className="px-3 py-1 bg-slate-700 rounded-lg text-white text-sm">
                  9. Memory Ordering
                </span>
                <span className="text-slate-500">→</span>
                <span className="px-3 py-1 bg-slate-700 rounded-lg text-white text-sm">
                  10. Starvation
                </span>
              </div>
            </div>
          </div>

          <p className="text-slate-400 text-center mt-6">
            Follow the numbered path from beginner to advanced concepts
          </p>
        </div>

        {/* Footer */}
        <footer className="pt-8 border-t border-slate-800 text-center">
          <p className="text-slate-500 text-sm">
            Built to help developers understand concurrency concepts through
            visualization.
          </p>
        </footer>
      </div>
    </div>
  );
}
