import sequid from "sequid";
import { RedisClient } from "redis";
import { FlowControl } from './FlowControl';
import { RedisMessageQueue } from './MessageQueue';
import { RedisQueue as RedisQueueInterface } from "./index";
import { key as _key, exec, CommandArguments, createFacadeType } from "./util";
import isEmpty from '@hyurl/utils/isEmpty';

export class RedisQueue extends FlowControl implements RedisQueueInterface {
    private static uids = sequid(0, true);
    private static tasks = new Map<string, {
        task: (...args: any[]) => any;
        resolve: (value: any) => void;
        reject: (err: Error) => void;
        ttl: number;
        args: any[]
    }[]>();

    constructor(redis: RedisClient, key: string) {
        super(redis, key, _key => {
            RedisQueue.tryTask(redis, _key);
        });
    }

    async run<T, A extends any[]>(
        task: (...args: A) => T | Promise<T>,
        ttl = 30,
        ...args: A
    ): Promise<T> {
        if (ttl < 1) {
            throw new RangeError(
                "The 'ttl' for throttle must not be smaller than 1"
            );
        }

        return new Promise<any>((resolve, reject) => {
            let tasks = RedisQueue.tasks.get(this[_key]);

            if (!tasks) {
                RedisQueue.tasks.set(this[_key], tasks = []);
            }

            tasks.push({
                task,
                resolve,
                reject,
                ttl,
                args
            });

            RedisQueue.message.publish(this[_key]);
        });
    }

    private static async tryTask(redis: RedisClient, key: string) {
        let tasks = this.tasks.get(key);

        if (!isEmpty(tasks)) {
            let lockKey = "RedisQueue:" + key;
            let value = String(this.uids.next().value);
            let args: CommandArguments = [lockKey, value, "nx"];
            let { ttl } = tasks[0];
            ttl > 0 && args.push("ex", ttl);
            let lock = await exec(redis, "set", ...args);

            if (lock === "OK") {
                let { task, args, resolve, reject } = tasks.shift();

                try {
                    let res = await task.apply(void 0, args);

                    // Before release the lock, must check whether the current
                    // lock value is still the same value at the time we set it,
                    // since a later task might gain the lock if the former task
                    // didn't complete in time and was forced to release the
                    // lock, we need to ensure when this former task completes,
                    // it will not delete the lock that was set by the later
                    // task.
                    if ((await exec(redis, "get", lockKey)) === value) {
                        await exec(redis, "del", lockKey);
                    }

                    resolve(res);
                } catch (err) {
                    reject(err);
                }

                this.message.publish(key);
            }

            if (isEmpty(tasks))
                this.tasks.delete(key);
        }
    }

    static async has(redis: RedisClient, key: string) {
        return RedisMessageQueue.has(redis, this.name)
            && this.tasks.has(key);
    }
}

export default function (redis: RedisClient) {
    return createFacadeType("none", RedisQueue, redis);
}