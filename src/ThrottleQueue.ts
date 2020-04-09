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
import flat = require("lodash/flatten");


export class RedisThrottleQueue extends RedisFacade implements iThrottleQueue {
    private lockKey: string;
    private queueKey: string;
    private storeKey: string;
    private timer: NodeJS.Timer;
    private state: "running" | "stopped";

    constructor(redis: RedisClient, key: string) {
        super(redis, key);
        this.queueKey = "RedisThrottleQueue:" + key;
        this.storeKey = "RedisThrottleQueueStore:" + key;
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
        this.timer && clearInterval(this.timer);
        await exec(this[redis], "DEL", this.lockKey); // try to release lock
    }

    async clear() {
        await this.exec("DEL", this.queueKey, this.storeKey, this.lockKey);
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
        let { storeKey } = this;

        // A lock is needed in order to update the expiration time of the task
        // and prevent duplicated processes.
        let [lock, cache] = await batch(
            this[redis],
            ["SET", lockKey, 1, "NX", "EX", 5],
            ["HGET", storeKey, sign]
        );

        if (lock !== "OK")
            return false;

        let task = JSON.stringify({ end, repeat });

        // Use a little trick to prevent serializing data again.
        if (task === "{}") {
            task = `{"data":${json}}`;
        } else {
            task = `{"data":${json},` + task.slice(1);
        }

        let regArgs = [this.queueKey, start, sign];
        let isModified = cache !== task;

        if (isImmediate) {
            // If the task doesn't have a start time set when pushing it, we
            // consider such a task is intended to be started immediately,
            // and its score should not be allowed to update in order to
            // guarantee the validity when the initial time reaches.
            regArgs.splice(1, 0, "NX");
        }

        let jobs = [
            ["ZADD", ...regArgs], // register signature
            ["DEL", lockKey] // release lock
        ];

        if (isModified) {
            jobs.splice(1, 0, ["HSET", storeKey, sign, task]); // set cache
        }

        let [count] = await batch(this[redis], ...jobs);

        return Number(count) > 0 || isModified;
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
        let { lockKey, queueKey, storeKey } = this;
        let lock = await exec(this[redis], "SET", lockKey, 1, "NX", "EX", 5);

        if (lock !== "OK")
            return [];

        let now = timestamp();
        let result: any[] = []; // pulled data
        let jobs: (string | number)[][] = []; // update jobs
        let updateSigns: [number, string][] = [];
        let deleteSigns: string[] = [];
        let deleteFields: string[] = [];

        do {
            let _offset = result.length;
            let _count = count - result.length;
            let signs = await this.doPull(now, _offset, _count);
            let caches: string[] = await batch(this[redis], ...signs.map(
                sign => ["HGET", storeKey, sign]
            ));

            for (let i = 0; i < signs.length; ++i) {
                let sign = signs[i];
                let cache = caches[i];

                if (isEmpty(cache)) {
                    deleteSigns.push(sign); // delete invalid signature
                    continue;
                }

                let task: {
                    data: any,
                    end?: number,
                    repeat?: number
                } = JSON.parse(cache);
                let isValid = isEmpty(task.end) || task.end <= now;

                if (isValid) {
                    result.push(decompose(task.data));

                    if (task.repeat > 0) { // update task
                        updateSigns.push([now + task.repeat, sign]);
                    } else { // remove processed task
                        deleteSigns.push(sign);
                        deleteFields.push(sign);
                    }
                } else { // remove expired task
                    deleteSigns.push(sign);
                    deleteFields.push(sign);
                }
            };

            if (signs.length < _count) { // no more task available
                break;
            }
        } while (result.length < count);

        if (!isEmpty(updateSigns))
            jobs.push(["ZADD", queueKey, ...flat(updateSigns)]);

        if (!isEmpty(deleteSigns))
            jobs.push(["ZREM", queueKey, ...deleteSigns]);

        if (!isEmpty(deleteFields))
            jobs.push(["HDEL", storeKey, ...deleteFields]);

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