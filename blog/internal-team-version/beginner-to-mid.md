# Concurrency for Node.js/JavaScript Developers

## Table of Contents

1. [Why This Matters for Node.js](#why-this-matters-for-nodejs)
2. [JavaScript's Concurrency Model: The Event Loop](#javascripts-concurrency-model-the-event-loop)
3. [When You Actually Need True Concurrency](#when-you-actually-need-true-concurrency)
4. [The Problem: Shared Memory in Worker Threads](#the-problem-shared-memory-in-worker-threads)
5. [Solution 1: Message Passing (The Easy Way)](#solution-1-message-passing-the-easy-way)
6. [Solution 2: SharedArrayBuffer & Atomics](#solution-2-sharedarraybuffer--atomics)
7. [Real Example: Building a Thread-Safe Counter](#real-example-building-a-thread-safe-counter)
8. [Practical Patterns for Node.js](#practical-patterns-for-nodejs)
9. [When to Use What](#when-to-use-what)
10. [Common Mistakes & How to Avoid Them](#common-mistakes--how-to-avoid-them)

---

## Why This Matters for Node.js

You might be thinking: "Node.js is single-threaded, why do I care about concurrency?"

**Half true!** Node.js has:

- **One main thread** for your JavaScript code (the event loop)
- **Worker threads** for CPU-intensive tasks
- **SharedArrayBuffer** for sharing memory between workers

**When you'll encounter this:**

- Image/video processing
- Data encryption/compression
- Heavy computations (ML, crypto mining, number crunching)
- Any CPU-bound work that blocks the event loop

## JavaScript's Concurrency Model: The Event Loop

First, let's clarify what Node.js already does well.

### The Event Loop (Your Daily Driver)

```javascript
// This is concurrent, but not parallel
console.log("1");

setTimeout(() => console.log("2"), 0);

Promise.resolve().then(() => console.log("3"));

console.log("4");

// Output: 1, 4, 3, 2
```

**This handles I/O beautifully:**

- Database queries
- HTTP requests
- File reads
- Timers

All without blocking! But it's **cooperative multitasking** - only one thing runs at a time.

### When the Event Loop Breaks Down

```javascript
// This BLOCKS everything for 5 seconds
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

app.get("/slow", (req, res) => {
  const result = fibonacci(45); // 🔥 Event loop is FROZEN
  res.json({ result });
});

app.get("/fast", (req, res) => {
  res.json({ message: "Hello" }); // Has to wait for fibonacci!
});
```

**Every request waits.** Your server is now single-threaded in the worst way.

## When You Actually Need True Concurrency

✅ **Use Worker Threads when:**

- CPU work takes > 50ms
- You need to process large datasets
- You're doing cryptography, compression, image manipulation
- You want to keep the event loop responsive

❌ **Don't use Worker Threads for:**

- I/O operations (use async/await instead)
- Quick calculations (overhead isn't worth it)
- Most web server requests (Node.js clusters are simpler)

**Rule of thumb:** Profile first. If `console.time()` shows > 50ms, consider workers.

## The Problem: Shared Memory in Worker Threads

### Message Passing (The Default)

```javascript
// main.js
const { Worker } = require("worker_threads");

const worker = new Worker("./worker.js");

worker.postMessage({ task: "process", data: [1, 2, 3] });

worker.on("message", (result) => {
  console.log("Result:", result); // Receives a COPY
});
```

```javascript
// worker.js
const { parentPort } = require("worker_threads");

parentPort.on("message", (msg) => {
  const result = msg.data.map((x) => x * 2);
  parentPort.postMessage(result); // Sends a COPY
});
```

**Copying is slow for large data.** Imagine sending a 100MB image buffer back and forth!

### SharedArrayBuffer (Zero-Copy Sharing)

```javascript
// Create shared memory
const sharedBuffer = new SharedArrayBuffer(1024);
const sharedArray = new Int32Array(sharedBuffer);

// Both main thread and worker see the SAME memory
worker.postMessage({ buffer: sharedBuffer });
```

**Now we have a problem:** Multiple threads touching the same memory = race conditions.

## Solution 1: Message Passing (The Easy Way)

**Best for:** Most use cases, especially with transferable objects.

```javascript
// main.js
const { Worker } = require("worker_threads");
const worker = new Worker("./worker.js");

// Create a large buffer
const buffer = Buffer.alloc(10_000_000);

// Transfer ownership (zero-copy!)
worker.postMessage({ buffer }, [buffer.buffer]);

// buffer is now unusable in main thread
console.log(buffer.byteLength); // 0 - it's been transferred!
```

```javascript
// worker.js
const { parentPort } = require("worker_threads");

parentPort.on("message", ({ buffer }) => {
  // Process the buffer
  const result = processImage(buffer);

  // Transfer back
  parentPort.postMessage({ result }, [result.buffer]);
});
```

**Pros:**

- No race conditions possible
- Simple mental model
- Works for 90% of cases

**Cons:**

- Ownership transfer means original thread can't access data
- Can't have true shared state

## Solution 2: SharedArrayBuffer & Atomics

**Best for:** Shared counters, flags, lock-free data structures.

### The Race Condition Problem

```javascript
// shared.js
const sharedBuffer = new SharedArrayBuffer(4);
const sharedArray = new Int32Array(sharedBuffer);

// Export for workers to import
module.exports = { sharedArray };
```

```javascript
// worker.js (spawned multiple times)
const { sharedArray } = require("./shared");

// BAD: Race condition!
for (let i = 0; i < 1000; i++) {
  sharedArray[0] = sharedArray[0] + 1; // Read-Modify-Write = DANGER
}

// Expected: 1000 * numWorkers
// Actual: Less than that (lost updates)
```

**What happens:**

1. Worker 1 reads: 100
2. Worker 2 reads: 100
3. Worker 1 writes: 101
4. Worker 2 writes: 101 (overwrites Worker 1!)

One increment is lost.

### The Fix: Atomics

```javascript
// worker.js
const { sharedArray } = require("./shared");

// GOOD: Atomic operations
for (let i = 0; i < 1000; i++) {
  Atomics.add(sharedArray, 0, 1); // Atomic increment
}

// Now it's actually: 1000 * numWorkers
```

**Available atomic operations:**

```javascript
// Arithmetic
Atomics.add(typedArray, index, value); // Returns old value
Atomics.sub(typedArray, index, value);
Atomics.and(typedArray, index, value); // Bitwise AND
Atomics.or(typedArray, index, value);
Atomics.xor(typedArray, index, value);

// Compare and swap
Atomics.compareExchange(typedArray, index, expectedValue, newValue);

// Load/Store with memory ordering
Atomics.load(typedArray, index);
Atomics.store(typedArray, index, value);

// Advanced: Wait/Notify (like mutexes)
Atomics.wait(typedArray, index, expectedValue, timeoutMs);
Atomics.notify(typedArray, index, numWaiters);
```

## Real Example: Building a Thread-Safe Counter

### Step 1: Shared Memory Setup

```javascript
// counter.js
class SharedCounter {
  constructor() {
    this.buffer = new SharedArrayBuffer(4);
    this.array = new Int32Array(this.buffer);
  }

  increment() {
    return Atomics.add(this.array, 0, 1);
  }

  get value() {
    return Atomics.load(this.array, 0);
  }

  getBuffer() {
    return this.buffer;
  }
}

module.exports = SharedCounter;
```

### Step 2: Main Thread

```javascript
// main.js
const { Worker } = require("worker_threads");
const SharedCounter = require("./counter");

const counter = new SharedCounter();
const workers = [];

// Spawn 4 workers
for (let i = 0; i < 4; i++) {
  const worker = new Worker("./worker.js");
  worker.postMessage({ buffer: counter.getBuffer() });
  workers.push(worker);
}

// Wait for all to finish
Promise.all(
  workers.map(
    (w) =>
      new Promise((resolve) => {
        w.on("exit", resolve);
      })
  )
).then(() => {
  console.log("Final count:", counter.value);
  // If each worker increments 1000 times: 4000
});
```

### Step 3: Worker Thread

```javascript
// worker.js
const { parentPort } = require("worker_threads");

parentPort.on("message", ({ buffer }) => {
  const array = new Int32Array(buffer);

  // Increment 1000 times atomically
  for (let i = 0; i < 1000; i++) {
    Atomics.add(array, 0, 1);
  }

  process.exit(0);
});
```

**This is guaranteed correct.** No locks needed!

## Practical Patterns for Node.js

### Pattern 1: Work Queue with Atomics

```javascript
// Shared queue using Atomics
class AtomicQueue {
  constructor(size) {
    this.buffer = new SharedArrayBuffer(size * 4 + 8);
    this.array = new Int32Array(this.buffer);
    // array[0] = write index
    // array[1] = read index
    // array[2..n] = queue data
  }

  enqueue(value) {
    const writeIdx = Atomics.load(this.array, 0);
    Atomics.store(this.array, writeIdx + 2, value);
    Atomics.add(this.array, 0, 1); // Increment write index
  }

  dequeue() {
    const readIdx = Atomics.load(this.array, 1);
    const writeIdx = Atomics.load(this.array, 0);

    if (readIdx >= writeIdx) return null; // Empty

    const value = Atomics.load(this.array, readIdx + 2);
    Atomics.add(this.array, 1, 1); // Increment read index
    return value;
  }

  getBuffer() {
    return this.buffer;
  }
}
```

### Pattern 2: Simple Mutex with Atomics.wait/notify

```javascript
class Mutex {
  constructor() {
    this.buffer = new SharedArrayBuffer(4);
    this.array = new Int32Array(this.buffer);
    // 0 = unlocked, 1 = locked
  }

  lock() {
    while (true) {
      const oldValue = Atomics.compareExchange(this.array, 0, 0, 1);
      if (oldValue === 0) {
        return; // Got the lock!
      }
      // Wait until value changes from 1
      Atomics.wait(this.array, 0, 1);
    }
  }

  unlock() {
    Atomics.store(this.array, 0, 0);
    Atomics.notify(this.array, 0, 1); // Wake one waiter
  }

  getBuffer() {
    return this.buffer;
  }
}

// Usage in worker
const mutex = new Mutex(/* pass shared buffer */);

mutex.lock();
try {
  // Critical section - only one worker here at a time
  doComplexOperation();
} finally {
  mutex.unlock();
}
```

### Pattern 3: Compare-and-Swap Retry Loop

```javascript
// Atomic increment with bounds checking
function boundedIncrement(array, index, max) {
  while (true) {
    const current = Atomics.load(array, index);

    if (current >= max) {
      return false; // Can't increment
    }

    // Try to swap: if current is still current, set to current + 1
    const result = Atomics.compareExchange(array, index, current, current + 1);

    if (result === current) {
      return true; // Success!
    }
    // If result !== current, someone else changed it. Retry.
  }
}
```

## When to Use What

### Decision Tree

```
Is it CPU-intensive work (> 50ms)?
├─ NO → Use async/await with event loop
└─ YES → Use Worker Threads
    │
    ├─ Need to share large buffers?
    │   ├─ Can transfer ownership? → Use transferList
    │   └─ Need concurrent access? → Use SharedArrayBuffer
    │
    └─ Need shared state?
        ├─ Simple counter/flag? → Use Atomics directly
        ├─ Complex multi-step operation? → Use Mutex pattern
        └─ Just passing data? → Use postMessage
```

### Quick Reference

| Pattern                       | Use Case                        | Example                             |
| ----------------------------- | ------------------------------- | ----------------------------------- |
| `async/await`                 | I/O operations                  | DB queries, API calls, file reads   |
| `postMessage`                 | Simple worker communication     | Processing tasks, returning results |
| `transferList`                | Large buffers, single ownership | Image processing, video encoding    |
| `SharedArrayBuffer + Atomics` | Shared counters, flags          | Request counting, feature flags     |
| `Atomics.wait/notify`         | Coordination between workers    | Producer-consumer, resource pools   |

## Common Mistakes & How to Avoid Them

### Mistake 1: Not Using Atomics

```javascript
// ❌ WRONG
const shared = new Int32Array(new SharedArrayBuffer(4));
shared[0]++; // Race condition!

// ✅ RIGHT
Atomics.add(shared, 0, 1);
```

### Mistake 2: Assuming Operations Are Atomic

```javascript
// ❌ WRONG - Two atomic operations, but not atomic together!
if (Atomics.load(array, 0) < 100) {
  Atomics.add(array, 0, 1); // Value might have changed!
}

// ✅ RIGHT - Use compareExchange
while (true) {
  const current = Atomics.load(array, 0);
  if (current >= 100) break;

  if (Atomics.compareExchange(array, 0, current, current + 1) === current) {
    break; // Success
  }
  // Retry if CAS failed
}
```

### Mistake 3: Forgetting SharedArrayBuffer Limitations

```javascript
// ❌ WRONG - Can only share typed arrays
const shared = new SharedArrayBuffer(100);
const wrongArray = new Array(shared); // Doesn't work!

// ✅ RIGHT
const shared = new SharedArrayBuffer(100);
const rightArray = new Int32Array(shared); // Works
```

### Mistake 4: Over-Engineering

```javascript
// ❌ WRONG - Using workers for trivial work
const worker = new Worker("./add.js");
worker.postMessage({ a: 1, b: 2 }); // Overhead > actual work

// ✅ RIGHT - Just do it synchronously
const result = 1 + 2; // Sub-millisecond
```

### Mistake 5: Not Handling Worker Errors

```javascript
// ❌ WRONG
const worker = new Worker("./worker.js");
worker.postMessage(data);

// ✅ RIGHT
const worker = new Worker("./worker.js");

worker.on("error", (err) => {
  console.error("Worker error:", err);
});

worker.on("exit", (code) => {
  if (code !== 0) {
    console.error("Worker stopped with exit code", code);
  }
});

worker.postMessage(data);
```

## Testing Concurrent Code

```javascript
// stress-test.js
const { Worker } = require("worker_threads");
const SharedCounter = require("./counter");

async function stressTest() {
  const counter = new SharedCounter();
  const numWorkers = 10;
  const incrementsPerWorker = 10000;

  const workers = [];
  for (let i = 0; i < numWorkers; i++) {
    const worker = new Worker("./counter-worker.js");
    worker.postMessage({
      buffer: counter.getBuffer(),
      iterations: incrementsPerWorker,
    });
    workers.push(new Promise((resolve) => worker.on("exit", resolve)));
  }

  await Promise.all(workers);

  const expected = numWorkers * incrementsPerWorker;
  const actual = counter.value;

  console.log(`Expected: ${expected}, Actual: ${actual}`);
  console.log(expected === actual ? "✅ PASS" : "❌ FAIL");
}

stressTest();
```

## Summary for Developers

**Key takeaways:**

1. **Node.js's event loop handles I/O brilliantly** - use async/await for that
2. **Worker Threads are for CPU-bound work** - image processing, encryption, heavy math
3. **postMessage is your friend** - use it for most worker communication
4. **SharedArrayBuffer + Atomics for high-performance shared state** - counters, flags, lock-free structures
5. **Always use Atomics for shared memory** - regular operations are NOT thread-safe
6. **Test with multiple workers** - race conditions are sneaky

**Remember:** Concurrency is an optimization. Profile first, then add complexity only where needed.

---

## Additional Resources

- [Node.js Worker Threads docs](https://nodejs.org/api/worker_threads.html)
- [MDN: SharedArrayBuffer](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer)
- [MDN: Atomics](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Atomics)
- [Node.js Threading Patterns](https://nodejs.org/en/learn/asynchronous-work/dont-block-the-event-loop)
