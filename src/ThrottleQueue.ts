import { RedisClient } from "redis";
import { RedisFacade } from "./Facade";
import { RedisThrottleQueue as iThrottleQueue } from "./index";
import { redis, exec, batch, createFacadeType } from "./util";
import { compose, decompose } from "@hyurl/structured-clone";
import sort from "@hyurl/utils/sort";
import timestamp from "@hyurl/utils/timestamp";
import isVoid from "@hyurl/utils/isVoid";
import isEmpty from "@hyurl/utils/isEmpty";
import md5 = require("md5");


export class RedisThrottleQueue extends RedisFacade implements iThrottleQueue {
    private queueKey: string;
    private lockKey: string;
    private cacheKey: string;
    private timer: NodeJS.Timer;
    private state: "running" | "stopped";

    constructor(redis: RedisClient, key: string) {
        super(redis, key);
        this.queueKey = "RedisThrottleQueue:" + key;
        this.lockKey = "RedisThrottleQueueLock:" + key;
        this.cacheKey = "RedisThrottleQueueCache:" + key;
    }

    async start(
        options: { interval?: number, concurrency?: number },
        handle: (data: any) => void | Promise<void>,
        errorHandle: (err: Error) => void = null
    ) {
        let { interval = 1, concurrency = 1 } = options;
        this.state = "running";
        this.timer = setInterval(async () => {
            if (this.state !== "running")
                return;

            let list = await this.pull(concurrency);

            if (!isEmpty(list)) {
                list.map(async (data) => {
                    try {
                        await handle(data);
                    } catch (err) {
                        if (typeof errorHandle === "function") {
                            errorHandle(err);
                        }
                    }
                });
            }
        }, interval * 1000);
    }

    async stop(): Promise<void> {
        this.state = "stopped";
        this.timer ?? clearInterval(this.timer);
        await exec(this[redis], "DEL", this.lockKey); // try to release lock
    }

    async push(data: any, options?: {
        start?: number;
        repeat?: number;
        end?: number;
    }): Promise<boolean> {
        let now = timestamp();
        let isImmediate = false;
        let { start, end, repeat } = options || {};

        if (isVoid(start)) {
            start = now;
            isImmediate = true;
        }

        data = compose(sort(data, true));
        let json = JSON.stringify(data);
        let sign = md5(json);
        let cacheKey = this.cacheKey + ":" + sign;
        let lockKey = this.lockKey + ":" + sign;
        // let task = { data, end, repeat };

        // A lock is needed in order to update the expiration time of the task
        // and prevent duplicated processes.
        let lock = await exec(this[redis], "SET", lockKey, 1, "NX", "EX", 5);

        if (lock !== "OK")
            return false;

        let regArgs = [this.queueKey, start, sign];

        if (isImmediate) {
            // If the task doesn't have a start time set when pushing it, we
            // consider such task is intended to be started immediately,
            // and its score should not be allowed to update in order to
            // guarantee the validity of the task when the initial time reaches.
            regArgs.splice(1, 0, "NX");
        }

        let count = await exec(this[redis], "ZADD", ...regArgs); // push task
        let ok = false;
        let ttl: number;
        let job: (string | number)[];

        if (Number(count) === 1) { // push succeed
            let cacheArgs = [cacheKey, JSON.stringify({ data, end, repeat })];

            end > 0 && cacheArgs.push("EX", String(end - now + 1));
            job = ["SET", ...cacheArgs]; // set cache
            ok = true;
        } else if (
            (ttl = Number(await exec(this[redis], "TTL", cacheKey)) || 0) > 0 &&
            ttl + now < end // indicates end time has changed
        ) {
            job = ["EXPIREAT", cacheKey, end]; // update expiration time
            ok = true;
        }

        if (!isEmpty(job)) {
            await batch(
                this[redis],
                job,
                ["DEL", lockKey] // release lock
            );
        } else {
            await exec(this[redis], "DEL", lockKey);
        }

        return ok;
    }

    private async pull(count: number) {
        // A lock is needed in order to prevent duplicated pulls and updates.
        let { lockKey } = this;
        let lock = await exec(this[redis], "SET", lockKey, 1, "NX", "EX", 5);

        if (lock !== "OK")
            return [];

        let now = timestamp();
        let fromTime = now - 604800; // max range is 1 week
        let signs: string[] = await exec( // retrieve all registered tasks
            this[redis],
            "ZRANGEBYSCORE",
            this.queueKey,
            `(${fromTime}`,
            now,
        );

        if (isEmpty(signs) || !Array.isArray(signs)) {
            await exec(this[redis], "DEL", lockKey); // release lock
            return [];
        }

        // retrieve all tasks
        let cacheKeys = signs.map(sign => this.cacheKey + ":" + sign);
        let caches = await batch(this[redis], ...cacheKeys.map(
            cacheKey => ["GET", cacheKey]
        ));
        let tasks = caches.map(cache => {
            if (isEmpty(cache)) {
                return null;
            } else {
                let task: {
                    data: any;
                    end?: number;
                    repeat?: number;
                } = JSON.parse(String(cache));

                task.data = decompose(task.data);
                return task;
            }
        });

        let jobs: (string | number)[][] = []; // update jobs
        let list: any[] = []; // pulled data

        for (let i = 0; i < tasks.length; ++i) {
            let task = tasks[i];
            let sign = signs[i];
            let cacheKey = cacheKeys[i];

            if (isEmpty(task)) { // cache has expired
                jobs.push(["ZREM", this.queueKey, sign]); // delete registry
            } else {
                let isValid = isEmpty(task.end) || task.end <= now;
                let deletions = [
                    ["DEL", cacheKey], // delete cache
                    ["ZREM", this.queueKey, sign] // delete registry
                ];

                if (isValid) {
                    list.push(task.data);

                    if (task.repeat > 0) { // update task
                        jobs.push(
                            ["ZADD", this.queueKey, now + task.repeat, sign]
                        );
                    } else { // delete task
                        jobs.push(...deletions);
                    }

                    // No need to loop and check all tasks, just break after
                    // collected enough ones.
                    if (list.length === count) {
                        break;
                    }
                } else if (!isValid) { // remove expired task
                    jobs.push(...deletions);
                }
            }
        };

        if (!isEmpty(jobs)) {
            await batch(
                this[redis],
                ...jobs,
                ["DEL", lockKey] // release lock
            );
        } else {
            await exec(this[redis], "DEL", lockKey);
        }

        return list;
    }

    static async has(redis: RedisClient, key: string) {
        key = "RedisThrottleQueue:" + key;
        return "zset" === (await exec(redis, "type", key));
    }
}

export default function (redis: RedisClient) {
    return createFacadeType("none", RedisThrottleQueue, redis);
}