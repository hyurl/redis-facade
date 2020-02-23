import timestamp from "@hyurl/utils/timestamp";
import { serialize, deserialize } from "@hyurl/structured-clone";
import { RedisClient } from "redis";
import { RedisMessageQueue } from "./MessageQueue";
import { RedisThrottle as RedisThrottleInterface } from "./index";
import { redis, key as _key, exec, batch, createFacadeType } from "./util";

export class RedisThrottle extends RedisMessageQueue implements RedisThrottleInterface {
    private lockKey = this[_key].replace("RedisThrottle", "RedisThrottleLock");
    private cacheKey = this[_key].replace("RedisThrottle", "RedisThrottleCache");
    private queue = new Set<{
        resolve: (value: any) => void,
        reject: (err: any) => void
    }>();

    constructor(redis: RedisClient, key: string) {
        super(redis, key);

        this.addListener((msg: string) => {
            try {
                let data: { value: any, error: any } = deserialize(msg);

                // Once received the newest data, immediately complete the
                // queued tasks with the result.
                this.queue.forEach(task => {
                    this.queue.delete(task);
                    data.error !== null
                        ? task.reject(data.error)
                        : task.resolve(data.value);
                });
            } catch (e) { }
        });
    }

    async run<T, A extends any[]>(
        task: (...args: A) => T | Promise<T>,
        ttl = 1,
        ...args: A
    ): Promise<T> {
        if (ttl < 1) {
            throw new RangeError(
                "The 'ttl' for throttle must not be smaller than 1"
            );
        }

        let now = timestamp();
        let cache: { value: T, error: any };

        // Since retrieving and updating the lastActiveTime is asynchronous,
        // so we use a lock to provide an atomic operation between all the tasks.
        let [lastActiveTime, lock] = await batch<[string, string]>(this[redis],
            ["get", this[_key]], // get lastActiveTime
            ["set", this.lockKey, 1, "nx"] // acquire lock
        );

        if (now - Number(lastActiveTime || 0) >= ttl) {
            if (lock === "OK") {
                await batch(this[redis],
                    // Update lastActiveTime
                    // In this throttle implementation, the minimal time unit is
                    // second, when a task/thread gets the current timestamp, it
                    // may be smaller or bigger than the one actually used in
                    // the Redis server, adding an extra second for expiration
                    // is meant to ensure that the cached data will always be
                    // available when the task/thread trying to retrieve it
                    // according to the task/thread's timestamp.
                    ["set", this[_key], now, "ex", ttl + 1],
                    ["del", this.cacheKey], // delete cache
                    ["del", this.lockKey] // release lock
                );

                let result: T;
                let error: any = null;

                try {
                    result = await task(...args);
                    await this.setCache(result, null, ttl);
                } catch (err) {
                    await this.setCache(void 0, error = err, ttl);
                }

                if (error !== null)
                    throw error;
                else
                    return result;
            } else {
                // Any task that failed to gain the lock should just simply be
                // pushed into the pending queue and wait for the newest result
                // published by the task that gained the lock.
                return this.waitForRefreshing();
            }
        } else if (cache = (await this.getCache())) {
            if (cache.error !== null)
                throw cache.error;
            else
                return cache.value;
        } else {
            return this.waitForRefreshing();
        }
    }

    /** @override */
    async clear() {
        await batch(this[redis],
            ["del", this[_key]], // delete lastActiveTime
            ["del", this.cacheKey], // delete cache
            ["del", this.lockKey] // release lock
        );
    }

    private async getCache(): Promise<{ value: any, error: any }> {
        let cache = await exec<string>(this[redis], "get", this.cacheKey);
        return cache ? deserialize(cache) : null;
    }

    private async setCache(value: any, error: any, ttl: number) {
        let data = serialize({ value, error });

        // Add an extra seconds for data to expire.
        await exec(this[redis], "set", this.cacheKey, data, "ex", ttl + 1);

        // Publish the data to the message queue so that pending tasks can
        // receive the data and complete the task with the newest result.
        this.publish(data);
    }

    private waitForRefreshing() {
        return new Promise<any>((resolve, reject) => {
            this.queue.add({ resolve, reject });
        });
    }

    static of(redis: RedisClient, key: string) {
        return new RedisThrottle(redis, `RedisThrottle:${key}`);
    }

    static async has(redis: RedisClient, key: string) {
        return RedisMessageQueue.has(redis, `RedisThrottle:${key}`);
    }
}

export default function (redis: RedisClient) {
    return createFacadeType("none", RedisThrottle, redis);
}