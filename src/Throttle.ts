import timestamp from "@hyurl/utils/timestamp";
import { compose, deserialize } from "@hyurl/structured-clone";
import { RedisClient } from "redis";
import { FlowControl } from "./FlowControl";
import { RedisMessageQueue } from './MessageQueue';
import { RedisThrottle as RedisThrottleInterface } from "./index";
import { redis, key as _key, exec, batch, createFacadeType } from "./util";

export class RedisThrottle extends FlowControl implements RedisThrottleInterface {
    private timeKey: string;
    private lockKey: string;
    private cacheKey: string;
    private static pendingTasks = new Map<string, Set<{
        resolve: (value: any) => void,
        reject: (err: any) => void
    }>>();

    constructor(redis: RedisClient, key: string) {
        super(redis, key, msg => {
            try {
                let [_key, { value, error }] = deserialize(msg) as [string, any];
                let tasks = RedisThrottle.pendingTasks.get(_key);

                if (tasks) {
                    RedisThrottle.pendingTasks.delete(_key);

                    // Once received the newest data, immediately complete
                    // the queued tasks with the result.
                    tasks.forEach(task => {
                        // tasks.delete(task);
                        error !== null
                            ? task.reject(error)
                            : task.resolve(value);
                    });
                }
            } catch (e) { }
        });

        this.timeKey = "RedisThrottle:" + key;
        this.lockKey = "RedisThrottleLock:" + key;
        this.cacheKey = "RedisThrottleCache:" + key;
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
            ["get", this.timeKey], // get lastActiveTime
            ["set", this.lockKey, 1, "nx", "ex", 120] // acquire lock
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
                    ["set", this.timeKey, now, "ex", ttl + 1],
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
        } else if (cache = (await this.getCache(lock === "OK"))) {
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
        await this.exec("DEL", this.timeKey, this.cacheKey, this.lockKey);
    }

    private async getCache(hasLock: boolean): Promise<{
        value: any,
        error: any
    }> {
        let args = [["get", this.cacheKey]];

        // When getting the lastActiveTime, we also attempt to set a lock in
        // order to achieve atomic operation, if the lastActiveTime is within
        // the TTL and we're going to retrieve the data from cache, we must, as
        // well, release that lock if we have had it.
        hasLock && args.push(["del", this.lockKey]);

        let [cache] = await batch<[string]>(this[redis], ...args);
        return cache ? deserialize(cache) : null;
    }

    private async setCache(value: any, error: any, ttl: number) {
        let data = compose({ value, error });

        await exec(
            this[redis],
            "set",
            this.cacheKey,
            JSON.stringify(data),
            "ex",
            ttl + 1 // Add an extra seconds for data to expire.
        );

        // Publish the data to the message queue so that pending tasks can
        // receive the data and complete the task with the newest result.
        RedisThrottle.message.publish(JSON.stringify([this[_key], data]));
    }

    private waitForRefreshing() {
        return new Promise<any>((resolve, reject) => {
            let queue = RedisThrottle.pendingTasks.get(this[_key]);

            if (!queue) {
                RedisThrottle.pendingTasks.set(this[_key], queue = new Set());
            }

            queue.add({ resolve, reject });
        });
    }

    static async has(redis: RedisClient, key: string) {
        return RedisMessageQueue.has(redis, this.name)
            && this.pendingTasks.has(key);
    }
}

export default function (redis: RedisClient) {
    return createFacadeType("none", RedisThrottle, redis);
}