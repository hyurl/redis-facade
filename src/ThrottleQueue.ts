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
    private timer: NodeJS.Timer;
    private state: "running" | "stopped";

    constructor(redis: RedisClient, key: string) {
        super(redis, key);
        this.queueKey = "RedisThrottleQueue:" + key;
        this.lockKey = "RedisThrottleQueueLock:" + key;
    }

    async start(
        handle: (data: any) => void | Promise<void>,
        concurrency = 1,
        interval = 1
    ) {
        let _interval = interval * 1000;
        let tryHandle = async (data: any) => {
            try {
                await handle(data);
            } catch (err) {
                console.error(err);
            }
        };

        this.state = "running";
        this.timer = setInterval(async () => {
            if (this.state !== "running")
                return;

            let list = await this.pull(concurrency);
            let count = list.length;

            if (count > 0) {
                tryHandle(list[0]);

                if (count > 1) {
                    let cursor = 1;
                    let balancer = setInterval(() => {
                        tryHandle(list[cursor++]);

                        if (cursor === count) {
                            clearInterval(balancer);
                        }
                    }, Math.round(_interval / count));
                }
            }
        }, _interval);
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
        let lockKey = this.lockKey + ":" + sign;

        // A lock is needed in order to update the expiration time of the task
        // and prevent duplicated processes.
        let lock = await exec(this[redis], "SET", lockKey, 1, "NX", "EX", 5);

        if (lock !== "OK")
            return false;

        let cache = JSON.stringify({ end, repeat });

        // Use a little trick to prevent serializing data again.
        if (cache === "{}") {
            cache = `{"data":${json}}`;
        } else {
            cache = `{"data":${json},` + cache.slice(1);
        }

        let regArgs = [this.queueKey, start, cache];

        if (isImmediate) {
            // If the task doesn't have a start time set when pushing it, we
            // consider such a task is intended to be started immediately,
            // and its score should not be allowed to update in order to
            // guarantee the validity when the initial time reaches.
            regArgs.splice(1, 0, "NX");
        }

        let [count] = await batch(
            this[redis],
            ["ZADD", ...regArgs], // push task
            ["DEL", lockKey] // release lock
        );

        return Number(count) > 0;
    }

    private async doPull(
        score: number,
        offset: number,
        count: number
    ) {
        let minScore = score - 604800; // max range is 1 week
        let caches: string[] = await exec( // retrieve all registered tasks
            this[redis],
            "ZRANGEBYSCORE",
            this.queueKey,
            `(${minScore}`,
            score,
            "LIMIT",
            offset,
            count
        );

        return caches;
    }

    private async pull(count: number) {
        // A lock is needed in order to prevent duplicated pulls and updates.
        let { lockKey, queueKey } = this;
        let lock = await exec(this[redis], "SET", lockKey, 1, "NX", "EX", 5);

        if (lock !== "OK")
            return [];

        let now = timestamp();
        let result: any[] = []; // pulled data
        let jobs: (string | number)[][] = []; // update jobs

        do {
            let _offset = result.length;
            let _count = count - result.length;
            let caches = await this.doPull(now, _offset, _count);

            for (let i = 0; i < caches.length; ++i) {
                let cache = caches[i];
                let task: {
                    data: any,
                    end?: number,
                    repeat?: number
                } = JSON.parse(cache);

                let isValid = isEmpty(task.end) || task.end <= now;

                if (isValid) {
                    result.push(decompose(task.data));

                    if (task.repeat > 0) { // update task
                        jobs.push(["ZADD", queueKey, now + task.repeat, cache]);
                    } else { // delete task
                        jobs.push(["ZREM", queueKey, cache]);
                    }
                } else { // remove expired task
                    jobs.push(["ZREM", queueKey, cache]);
                }
            };

            if (caches.length < _count) { // no more cache available
                break;
            }
        } while (result.length < count);

        if (!isEmpty(jobs)) {
            await batch(
                this[redis],
                ...jobs,
                ["DEL", lockKey] // release lock
            );
        } else {
            await exec(this[redis], "DEL", lockKey);
        }

        return result;
    }

    static async has(redis: RedisClient, key: string) {
        key = "RedisThrottleQueue:" + key;
        return "zset" === (await exec(redis, "type", key));
    }
}

export default function (redis: RedisClient) {
    return createFacadeType("none", RedisThrottleQueue, redis);
}