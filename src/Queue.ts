import { RedisClient } from "redis";
import { RedisFacade } from "./Facade";
import { RedisQueue as RedisQueueInterface } from "./index";
import { redis as _redis, key as _key, CommandArguments, createFacadeType } from "./util";
import sequid from "sequid";

export class RedisQueue extends RedisFacade implements RedisQueueInterface {
    private static uids = sequid(0, true);
    private tasks: {
        handle: (...args: any[]) => Promise<void>;
        ttl: number;
        args: any[]
    }[] = [];

    static resolve(key: string) {
        return `RedisQueueLock:${key}`;
    }

    async run<T extends (...args: any[]) => any>(
        task: T,
        ttl = 30,
        ...args: Parameters<T>
    ): Promise<ReturnType<T> extends Promise<infer U> ? U : ReturnType<T>> {
        let job = new Promise<any>((resolve, reject) => {
            this.tasks.push({
                handle: async (...args: any[]) => {
                    try {
                        resolve(await task.apply(void 0, args));
                    } catch (err) {
                        reject(err);
                    }
                },
                ttl,
                args
            });
        });

        this.callNext();
        return job;
    }

    private async callNext() {
        if (this.tasks.length > 0) {
            let value = String(RedisQueue.uids.next().value);
            let args: CommandArguments = [value, "nx"];
            let { ttl } = this.tasks[0];
            ttl > 0 && args.push("ex", ttl);
            let res = await this.exec("set", ...args);

            if (res === "OK") {
                try {
                    let { handle, args } = this.tasks.shift();
                    await handle.apply(void 0, args);
                } catch (e) { }

                // Before release the lock, must check whether the current lock
                // value is still the same value at the time we set it, since a
                // later task might gain the lock if the former task didn't
                // complete in time and was forced to release the lock, we need
                // to ensure when this former task completes, it will not delete
                // the lock that was set by the later task.
                if ((await this.exec("get")) === value) {
                    await this.clear();
                }

                this.callNext();
            }
        }
    }
}

export default function (redis: RedisClient) {
    return createFacadeType("string", RedisQueue, redis);
}