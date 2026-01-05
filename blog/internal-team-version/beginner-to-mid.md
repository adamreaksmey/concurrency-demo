# Concurrency for NestJS Developers: The Hidden Race Conditions

## Table of Contents

1. [The Illusion of Safety in NestJS](#the-illusion-of-safety-in-nestjs)
2. [Surprise: Your NestJS App Has Race Conditions](#surprise-your-nestjs-app-has-race-conditions)
3. [Understanding NestJS's Execution Model](#understanding-nestjs-execution-model)
4. [Real Race Conditions You're Already Writing](#real-race-conditions-youre-already-writing)
5. [Worker Threads in NestJS](#worker-threads-in-nestjs)
6. [Fixing Common NestJS Race Conditions](#fixing-common-nestjs-race-conditions)
7. [SharedArrayBuffer & Atomics in NestJS](#sharedarraybuffer--atomics-in-nestjs)
8. [Practical NestJS Patterns](#practical-nestjs-patterns)
9. [When to Use What](#when-to-use-what)
10. [Testing for Race Conditions](#testing-for-race-conditions)

---

## The Illusion of Safety in NestJS

You're writing NestJS services with async/await. It feels safe. Single-threaded, right?

**Wrong.** You have race conditions right now. Let me show you.

## Surprise: Your NestJS App Has Race Conditions

### Example 1: The "Safe" Cache Service

```typescript
// ❌ THIS HAS A RACE CONDITION
@Injectable()
export class CacheService {
  private cache = new Map<string, any>();
  private loading = new Set<string>();

  async get(key: string, fetchFn: () => Promise<any>) {
    // Check cache
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    // Avoid duplicate fetches
    if (this.loading.has(key)) {
      // Wait for the other request to finish
      await this.waitForKey(key);
      return this.cache.get(key);
    }

    // Mark as loading
    this.loading.add(key);

    try {
      const value = await fetchFn(); // ⚠️ YIELDS CONTROL HERE
      this.cache.set(key, value);
      return value;
    } finally {
      this.loading.delete(key);
    }
  }

  private async waitForKey(key: string) {
    while (this.loading.has(key)) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }
}
```

**What's wrong?** Two requests for the same key arrive:

```
Time    Request A                      Request B
----    ---------                      ---------
0ms     Check cache (miss)
1ms     Check loading (empty)
2ms     Add to loading set
3ms     Start fetchFn()
4ms                                    Check cache (miss)
5ms                                    Check loading (HAS KEY!)
6ms                                    waitForKey() loop starts
7ms     await fetchFn() ← YIELDS
8ms                                    Still in waitForKey()
...
100ms   fetchFn() returns
101ms   Set cache
102ms   Delete from loading
103ms                                  waitForKey() sees loading=false
104ms                                  Returns cache value ✓
```

**This works!** But what about this scenario:

```
Time    Request A                      Request B                      Request C
----    ---------                      ---------                      ---------
0ms     Check cache (miss)
1ms     Check loading (empty)          Check cache (miss)
2ms     Add to loading set             Check loading (empty) ⚠️
3ms     Start fetchFn()                Add to loading set ⚠️
4ms                                    Start fetchFn() ⚠️             Check cache (miss)
5ms     await yields                   await yields                   Check loading (HAS KEY)
```

**Request B slipped through!** Between Request A checking and adding to the set, Request B checked and also found it empty. Now both are fetching.

**Even worse - the classic counter:**

### Example 2: The Request Counter

```typescript
// ❌ RACE CONDITION
@Injectable()
export class MetricsService {
  private requestCount = 0;

  async incrementRequests() {
    this.requestCount++; // Looks atomic, isn't!
    await this.saveToDatabase(this.requestCount);
  }

  getCount() {
    return this.requestCount;
  }
}
```

```typescript
@Controller()
export class AppController {
  constructor(private metrics: MetricsService) {}

  @Get("api")
  async handleRequest() {
    await this.metrics.incrementRequests(); // ⚠️
    return { data: "ok" };
  }
}
```

**What happens with concurrent requests:**

```javascript
// 1000 concurrent requests arrive
// Each does: this.requestCount++

// You expect: requestCount = 1000
// You get: requestCount = 847 (or any random number < 1000)
```

**Why?** `this.requestCount++` is actually three operations:

1. Read `this.requestCount` (let's say it's 5)
2. Add 1 (now 6)
3. Write back to `this.requestCount`

```
Request A: Read (5) → Add 1 (6) → interrupted
Request B: Read (5) → Add 1 (6) → Write (6)
Request A: Write (6)  ← Overwrote B's increment!
```

One increment lost.

### Example 3: The "Idempotent" Payment

```typescript
// ❌ RACE CONDITION IN PROD
@Injectable()
export class PaymentService {
  private processedPayments = new Set<string>();

  async processPayment(paymentId: string, amount: number) {
    // Idempotency check
    if (this.processedPayments.has(paymentId)) {
      throw new Error("Already processed");
    }

    // Mark as processing
    this.processedPayments.add(paymentId);

    // Charge the card
    await this.stripeService.charge(amount); // ⚠️ YIELDS

    // Save to database
    await this.db.payments.create({ paymentId, amount });

    return { success: true };
  }
}
```

**The race:**

```
Time    Request A (same paymentId)    Request B (same paymentId)
----    --------------------------    --------------------------
0ms     Check Set (not found)
1ms     Add to Set                     Check Set (not found) ⚠️
2ms     Call Stripe                    Add to Set ⚠️
3ms                                    Call Stripe ⚠️
```

**You just charged the customer twice.**

The check and add are separate operations. Between them, another request can slip through.

## Understanding NestJS's Execution Model

NestJS runs on Node.js, which is:

1. **Single-threaded** for JavaScript execution
2. **Concurrent** through the event loop
3. **NOT atomic** for multi-step operations

```typescript
// This controller handles requests concurrently
@Controller("users")
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  async createUser(@Body() dto: CreateUserDto) {
    // Multiple requests execute this concurrently!
    return await this.usersService.create(dto);
  }
}
```

**Visual representation:**

```
Event Loop Tick 1:
  Request A: await db.query() ← starts, then YIELDS
  Request B: await db.query() ← starts, then YIELDS
  Request C: await db.query() ← starts, then YIELDS

Event Loop Tick 2:
  Request B's query completes → resumes execution
  Request A's query completes → resumes execution
  Request C's query completes → resumes execution
```

**Between any two lines with `await`, another request can run.**

## Real Race Conditions You're Already Writing

### Race Condition #1: Check-Then-Act

```typescript
// ❌ CLASSIC BUG
@Injectable()
export class UserService {
  async createUser(email: string) {
    // Check if exists
    const exists = await this.userRepo.findOne({ where: { email } });

    if (exists) {
      throw new Error("User exists");
    }

    // ⚠️ Another request can create the user HERE

    // Create user
    return await this.userRepo.save({ email });
  }
}
```

**Two requests with same email:**

```
Request A: Check (no user) → about to create
Request B: Check (no user) → about to create
Request A: Creates user
Request B: Creates user ← DUPLICATE!
```

**Fix: Use database constraints + catch error**

```typescript
// ✅ CORRECT
@Injectable()
export class UserService {
  async createUser(email: string) {
    try {
      // Let database enforce uniqueness
      return await this.userRepo.save({ email });
    } catch (error) {
      if (error.code === "23505") {
        // Postgres unique violation
        throw new ConflictException("User exists");
      }
      throw error;
    }
  }
}
```

### Race Condition #2: Read-Modify-Write

```typescript
// ❌ INVENTORY SYSTEM BUG
@Injectable()
export class InventoryService {
  async purchaseItem(itemId: string, quantity: number) {
    const item = await this.itemRepo.findOne(itemId);

    if (item.stock < quantity) {
      throw new Error("Out of stock");
    }

    // ⚠️ Another request can modify stock HERE

    item.stock -= quantity;
    await this.itemRepo.save(item);

    return { success: true };
  }
}
```

**Two requests buying the last item:**

```
Initial stock: 1

Request A: Read stock (1) → Check passes
Request B: Read stock (1) → Check passes
Request A: Set stock to 0 → Save
Request B: Set stock to 0 → Save

Result: Sold 2 items, stock shows 0 (should be -1)
```

**Fix: Use database atomic operations**

```typescript
// ✅ CORRECT - Atomic update
@Injectable()
export class InventoryService {
  async purchaseItem(itemId: string, quantity: number) {
    const result = await this.itemRepo
      .createQueryBuilder()
      .update(Item)
      .set({ stock: () => `stock - ${quantity}` })
      .where("id = :itemId AND stock >= :quantity", { itemId, quantity })
      .execute();

    if (result.affected === 0) {
      throw new Error("Out of stock");
    }

    return { success: true };
  }
}
```

### Race Condition #3: The Lazy Initialization

```typescript
// ❌ SINGLETON RACE
@Injectable()
export class ConfigService {
  private config: Config | null = null;

  async getConfig(): Promise<Config> {
    if (!this.config) {
      // ⚠️ Multiple requests can enter here
      this.config = await this.loadFromFile();
    }
    return this.config;
  }

  private async loadFromFile(): Promise<Config> {
    console.log("Loading config..."); // You'll see this multiple times!
    return await fs.readFile("config.json", "utf-8").then(JSON.parse);
  }
}
```

**What happens:**

```
Request A: Check config (null) → Start loading
Request B: Check config (null) → Start loading ← DUPLICATE LOAD
Request C: Check config (null) → Start loading ← DUPLICATE LOAD
```

**Fix: Promise-based lock**

```typescript
// ✅ CORRECT
@Injectable()
export class ConfigService {
  private config: Config | null = null;
  private loading: Promise<Config> | null = null;

  async getConfig(): Promise<Config> {
    if (this.config) {
      return this.config;
    }

    if (this.loading) {
      return this.loading; // Wait for in-flight load
    }

    this.loading = this.loadFromFile();
    this.config = await this.loading;
    this.loading = null;

    return this.config;
  }

  private async loadFromFile(): Promise<Config> {
    console.log("Loading config..."); // Only once!
    return await fs.readFile("config.json", "utf-8").then(JSON.parse);
  }
}
```

### Race Condition #4: The Subtle Service State

```typescript
// ❌ SHARED STATE BUG
@Injectable()
export class ReportService {
  private currentReport: Report | null = null;

  async generateReport(userId: string) {
    this.currentReport = { userId, data: [] };

    // Fetch data (takes time)
    const userData = await this.fetchUserData(userId);

    // ⚠️ currentReport might have been overwritten by another request

    this.currentReport.data = userData;
    return this.currentReport;
  }
}
```

**Disaster scenario:**

```
Request A (User 1): Set currentReport to {userId: 1}
Request B (User 2): Set currentReport to {userId: 2} ← OVERWRITES
Request A (User 1): Fetches data for User 1
Request A (User 1): Sets currentReport.data ← But currentReport is User 2!

Result: User 2 gets User 1's data! 🔥 PRIVACY VIOLATION
```

**Fix: Never use instance variables for request-scoped state**

```typescript
// ✅ CORRECT - Use local variables
@Injectable()
export class ReportService {
  async generateReport(userId: string) {
    const report: Report = { userId, data: [] }; // Local scope

    const userData = await this.fetchUserData(userId);

    report.data = userData;
    return report;
  }
}
```

## Worker Threads in NestJS

Now let's talk about true multi-threading.

### When You Need Worker Threads

```typescript
// ❌ This BLOCKS all requests for 5 seconds
@Controller("reports")
export class ReportsController {
  @Get("generate")
  async generateReport() {
    // CPU-intensive image processing
    const result = this.heavyImageProcessing(); // 5 seconds of pure CPU
    return result;
  }

  private heavyImageProcessing() {
    // Imagine complex calculations here
    let result = 0;
    for (let i = 0; i < 10_000_000_000; i++) {
      result += Math.sqrt(i);
    }
    return result;
  }
}
```

**Every other request waits.** Your API is frozen.

### NestJS Worker Threads Module

```bash
npm install @nestjs/worker-threads
```

```typescript
// worker.ts
import { parentPort } from "worker_threads";

parentPort.on("message", ({ imageBuffer, filters }) => {
  // CPU-intensive work here
  const processed = applyFilters(imageBuffer, filters);

  parentPort.postMessage({ result: processed });
});

function applyFilters(buffer: Buffer, filters: any) {
  // Heavy image processing
  return buffer; // simplified
}
```

```typescript
// image.service.ts
import { Injectable } from "@nestjs/common";
import { Worker } from "worker_threads";
import { join } from "path";

@Injectable()
export class ImageService {
  async processImage(imageBuffer: Buffer, filters: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const worker = new Worker(join(__dirname, "worker.js"));

      worker.on("message", ({ result }) => {
        resolve(result);
      });

      worker.on("error", reject);

      worker.on("exit", (code) => {
        if (code !== 0) {
          reject(new Error(`Worker stopped with exit code ${code}`));
        }
      });

      // Transfer buffer ownership (zero-copy)
      worker.postMessage(
        { imageBuffer, filters },
        [imageBuffer.buffer] // Transferable
      );
    });
  }
}
```

**Now the API stays responsive while processing happens in parallel!**

### Worker Pool Pattern for NestJS

```typescript
// worker-pool.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { Worker } from "worker_threads";
import { cpus } from "os";
import { join } from "path";

interface Task {
  data: any;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

@Injectable()
export class WorkerPoolService implements OnModuleInit, OnModuleDestroy {
  private workers: Worker[] = [];
  private queue: Task[] = [];
  private activeWorkers = new Set<Worker>();

  onModuleInit() {
    const numWorkers = cpus().length;

    for (let i = 0; i < numWorkers; i++) {
      const worker = this.createWorker();
      this.workers.push(worker);
    }
  }

  onModuleDestroy() {
    this.workers.forEach((w) => w.terminate());
  }

  private createWorker(): Worker {
    const worker = new Worker(join(__dirname, "worker.js"));

    worker.on("message", (result) => {
      this.activeWorkers.delete(worker);
      this.processNextTask(worker);
    });

    worker.on("error", (error) => {
      console.error("Worker error:", error);
      this.activeWorkers.delete(worker);
    });

    return worker;
  }

  async execute(data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const task: Task = { data, resolve, reject };
      this.queue.push(task);

      // Try to assign to free worker
      const freeWorker = this.workers.find((w) => !this.activeWorkers.has(w));
      if (freeWorker) {
        this.processNextTask(freeWorker);
      }
    });
  }

  private processNextTask(worker: Worker) {
    const task = this.queue.shift();
    if (!task) return;

    this.activeWorkers.add(worker);

    worker.once("message", (result) => {
      task.resolve(result);
    });

    worker.once("error", (error) => {
      task.reject(error);
    });

    worker.postMessage(task.data);
  }
}
```

```typescript
// Usage in controller
@Controller("images")
export class ImageController {
  constructor(private workerPool: WorkerPoolService) {}

  @Post("process")
  async processImage(@Body() dto: ProcessImageDto) {
    // Non-blocking! Uses worker pool
    const result = await this.workerPool.execute({
      image: dto.imageBuffer,
      filters: dto.filters,
    });

    return { processedImage: result };
  }
}
```

## SharedArrayBuffer & Atomics in NestJS

For shared state between workers (rare, but powerful).

### The Race Condition in Workers

```typescript
// shared-counter.ts
export class SharedCounter {
  private buffer: SharedArrayBuffer;
  private array: Int32Array;

  constructor() {
    this.buffer = new SharedArrayBuffer(4);
    this.array = new Int32Array(this.buffer);
  }

  // ❌ NOT THREAD-SAFE
  increment() {
    this.array[0]++; // Race condition across workers!
  }

  // ✅ THREAD-SAFE
  atomicIncrement() {
    return Atomics.add(this.array, 0, 1);
  }

  get value() {
    return Atomics.load(this.array, 0);
  }

  getBuffer() {
    return this.buffer;
  }
}
```

### NestJS Service with Shared Metrics

```typescript
// metrics.service.ts
import { Injectable, OnModuleInit } from "@nestjs/common";
import { Worker } from "worker_threads";

@Injectable()
export class MetricsService implements OnModuleInit {
  private metricsBuffer: SharedArrayBuffer;
  private metrics: Int32Array;
  private workers: Worker[] = [];

  onModuleInit() {
    // Create shared memory for metrics
    // Index 0: request count
    // Index 1: error count
    // Index 2: active requests
    this.metricsBuffer = new SharedArrayBuffer(12);
    this.metrics = new Int32Array(this.metricsBuffer);

    // Spawn workers and share buffer
    for (let i = 0; i < 4; i++) {
      const worker = new Worker("./metrics-worker.js");
      worker.postMessage({ metricsBuffer: this.metricsBuffer });
      this.workers.push(worker);
    }
  }

  incrementRequests() {
    Atomics.add(this.metrics, 0, 1); // Atomic!
  }

  incrementErrors() {
    Atomics.add(this.metrics, 1, 1);
  }

  incrementActive() {
    Atomics.add(this.metrics, 2, 1);
  }

  decrementActive() {
    Atomics.sub(this.metrics, 2, 1);
  }

  getMetrics() {
    return {
      requests: Atomics.load(this.metrics, 0),
      errors: Atomics.load(this.metrics, 1),
      active: Atomics.load(this.metrics, 2),
    };
  }
}
```

```typescript
// Use in interceptor
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    this.metrics.incrementRequests();
    this.metrics.incrementActive();

    return next.handle().pipe(
      tap({
        next: () => {
          this.metrics.decrementActive();
        },
        error: () => {
          this.metrics.incrementErrors();
          this.metrics.decrementActive();
        },
      })
    );
  }
}
```

## Fixing Common NestJS Race Conditions

### Pattern 1: Optimistic Locking with TypeORM

```typescript
// user.entity.ts
@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  balance: number;

  @VersionColumn() // ✅ Optimistic lock
  version: number;
}
```

```typescript
// wallet.service.ts
@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>
  ) {}

  async withdraw(userId: number, amount: number) {
    const maxRetries = 3;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const user = await this.userRepo.findOne({ where: { id: userId } });

        if (user.balance < amount) {
          throw new Error("Insufficient funds");
        }

        user.balance -= amount;

        // ✅ Will fail if version changed (another request modified it)
        await this.userRepo.save(user);

        return { success: true, balance: user.balance };
      } catch (error) {
        if (error.message.includes("version") && i < maxRetries - 1) {
          // Version conflict - retry
          await new Promise((r) => setTimeout(r, 10 * Math.pow(2, i)));
          continue;
        }
        throw error;
      }
    }

    throw new Error("Too many concurrent updates");
  }
}
```

### Pattern 2: Distributed Locks with Redis

```typescript
// lock.service.ts
import { Injectable } from "@nestjs/common";
import { InjectRedis } from "@nestjs-modules/ioredis";
import { Redis } from "ioredis";

@Injectable()
export class LockService {
  constructor(@InjectRedis() private redis: Redis) {}

  async withLock<T>(
    key: string,
    ttlMs: number,
    fn: () => Promise<T>
  ): Promise<T> {
    const lockKey = `lock:${key}`;
    const lockValue = Math.random().toString();

    // Try to acquire lock
    const acquired = await this.redis.set(
      lockKey,
      lockValue,
      "PX",
      ttlMs,
      "NX"
    );

    if (!acquired) {
      throw new Error("Could not acquire lock");
    }

    try {
      return await fn();
    } finally {
      // Release lock (Lua script ensures atomic check+delete)
      await this.redis.eval(
        `if redis.call("get", KEYS[1]) == ARGV[1] then
           return redis.call("del", KEYS[1])
         else
           return 0
         end`,
        1,
        lockKey,
        lockValue
      );
    }
  }
}
```

```typescript
// payment.service.ts
@Injectable()
export class PaymentService {
  constructor(private lockService: LockService) {}

  async processPayment(paymentId: string, amount: number) {
    // ✅ Only one request per paymentId can execute
    return this.lockService.withLock(
      `payment:${paymentId}`,
      5000, // 5 second TTL
      async () => {
        // Your payment logic here
        await this.chargeCard(amount);
        await this.savePayment(paymentId, amount);
        return { success: true };
      }
    );
  }
}
```

### Pattern 3: Queue-Based Processing

```typescript
// job.processor.ts
import { Processor, Process } from "@nestjs/bull";
import { Job } from "bull";

@Processor("email")
export class EmailProcessor {
  @Process("send")
  async handleSendEmail(job: Job) {
    const { to, subject, body } = job.data;

    // ✅ Bull ensures only one worker processes this job
    await this.sendEmail(to, subject, body);

    return { sent: true };
  }

  private async sendEmail(to: string, subject: string, body: string) {
    // Email sending logic
  }
}
```

```typescript
// email.service.ts
import { Injectable } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bull";
import { Queue } from "bull";

@Injectable()
export class EmailService {
  constructor(@InjectQueue("email") private emailQueue: Queue) {}

  async sendWelcomeEmail(userId: string, email: string) {
    // ✅ Queue ensures no duplicate processing
    await this.emailQueue.add(
      "send",
      {
        to: email,
        subject: "Welcome!",
        body: "Thanks for signing up",
      },
      {
        jobId: `welcome-${userId}`, // Deduplication key
        removeOnComplete: true,
      }
    );
  }
}
```

## When to Use What

### Decision Matrix

| Scenario                      | Solution                    | Why                     |
| ----------------------------- | --------------------------- | ----------------------- |
| Simple counter/flag           | Atomic operations           | Fastest, no locks       |
| Check-then-act                | Database constraints        | Let DB handle it        |
| Multi-step update             | Optimistic locking          | Good for low contention |
| High contention               | Pessimistic lock (Redis)    | Prevents retries        |
| Background jobs               | Queue (Bull)                | Built-in reliability    |
| CPU-heavy work                | Worker threads              | Keep API responsive     |
| Shared metrics across workers | SharedArrayBuffer + Atomics | Zero-copy sharing       |

### Quick Rules

1. **For single values:** Use atomics
2. **For database operations:** Use database-level atomics or locks
3. **For distributed systems:** Use Redis locks
4. **For background work:** Use queues
5. **For CPU work:** Use worker threads

## Testing for Race Conditions

### Load Testing with Artillery

```yaml
# artillery.yml
config:
  target: "http://localhost:3000"
  phases:
    - duration: 10
      arrivalRate: 100 # 100 requests/second

scenarios:
  - name: "Test concurrent purchases"
    flow:
      - post:
          url: "/inventory/purchase"
          json:
            itemId: "item-1"
            quantity: 1
```

Run: `artillery run artillery.yml`

### Unit Test for Race Conditions

```typescript
// inventory.service.spec.ts
describe("InventoryService Race Conditions", () => {
  it("should handle concurrent purchases correctly", async () => {
    const service = new InventoryService(mockRepo);

    // Set initial stock to 10
    await mockRepo.save({ id: "item-1", stock: 10 });

    // Fire 20 concurrent purchase requests (should fail 10)
    const results = await Promise.allSettled(
      Array.from({ length: 20 }, () => service.purchaseItem("item-1", 1))
    );

    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    expect(successful).toBe(10); // Only 10 should succeed
    expect(failed).toBe(10); // 10 should fail

    const finalStock = await mockRepo.findOne("item-1");
    expect(finalStock.stock).toBe(0); // ✅ No overselling
  });
});
```

### E2E Test

```typescript
// app.e2e-spec.ts
describe("Race Conditions (e2e)", () => {
  it("should not create duplicate users", async () => {
    const email = "test@example.com";

    // Fire 10 concurrent requests
    const requests = Array.from(
      { length: 10 },
      () =>
        request(app.getHttpServer())
          .post("/users")
          .send({ email })
          .catch((err) => err.response) // Catch errors
    );

    const responses = await Promise.all(requests);

    const created = responses.filter((r) => r.status === 201).length;
    const conflicts = responses.filter((r) => r.status === 409).length;

    expect(created).toBe(1); // Only one created
    expect(conflicts).toBe(9); // Rest got conflict errors
  });
});
```

## Summary for NestJS Developers

**You have race conditions right now:**

- Check-then-act patterns
- Read-modify-write on shared state
- Lazy initialization without locks
- Instance variables in services
- Simple counters (`++` is not atomic)

**How to fix them:**

- Use database constraints and atomic operations
- Use optimistic/pessimistic locking
- Use queues for background work
- Never store request-scoped state in instance variables
- Use worker threads for CPU-intensive work
- Use SharedArrayBuffer + Atomics for shared metrics

**Remember:** `await` yields control. Between any two `await` calls, another request can run and modify shared state.

**Test everything:** Race conditions are sneaky. Use load testing, stress testing, and check your assumptions.
