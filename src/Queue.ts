import sequid from "sequid";
import { RedisClient } from "redis";
import { RedisMessageQueue } from "./MessageQueue";
import { RedisQueue as RedisQueueInterface } from "./index";
import { CommandArguments, createFacadeType } from "./util";

export class RedisQueue extends RedisMessageQueue implements RedisQueueInterface {
    private static uids = sequid(0, true);
    private tasks: {
        task: (...args: any[]) => any;
        resolve: (value: any) => void;
        reject: (err: Error) => void;
        ttl: number;
        args: any[]
    }[] = [];

    constructor(redis: RedisClient, key: string) {
        super(redis, key);
        this.addListener((msg) => {
            msg === "tryTask" && this.tryTask();
        });
    }

    async run<T, A extends any[]>(
        task: (...args: A) => T | Promise<T>,
        ttl = 30,
        ...args: A
    ): Promise<T> {
        let job = new Promise<any>((resolve, reject) => {
            this.tasks.push({
                task,
                resolve,
                reject,
                ttl,
                args
            });
        });

        this.publish("tryTask");
        return job;
    }

    private async tryTask() {
        if (this.tasks.length > 0) {
            let value = String(RedisQueue.uids.next().value);
            let args: CommandArguments = [value, "nx"];
            let { ttl } = this.tasks[0];
            ttl > 0 && args.push("ex", ttl);
            let lock = await this.exec("set", ...args);

            if (lock === "OK") {
                let { task, args, resolve, reject } = this.tasks.shift();

                try {
                    let res = await task.apply(void 0, args);

                    // Before release the lock, must check whether the current
                    // lock value is still the same value at the time we set it,
                    // since a later task might gain the lock if the former task
                    // didn't complete in time and was forced to release the
                    // lock, we need to ensure when this former task completes,
                    // it will not delete the lock that was set by the later
                    // task.
                    if ((await this.exec("get")) === value) {
                        await this.clear();
                    }

                    resolve(res);
                } catch (err) {
                    reject(err);
                }

                this.publish("tryTask");
            }
        }
    }

    static of(redis: RedisClient, key: string) {
        return new RedisQueue(redis, `RedisQueue:${key}`);
    }

    static async has(redis: RedisClient, key: string) {
        return RedisMessageQueue.has(redis, `RedisQueue:${key}`);
    }
}

export default function (redis: RedisClient) {
    return createFacadeType("none", RedisQueue, redis);
}