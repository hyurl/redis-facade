import { RedisClient } from "redis";
import { RedisFacade } from "./Facade";
import { RedisQueue as RedisQueueInterface } from "./index";
import { redis as _redis, key as _key, CommandArguments, createFacadeType } from "./util";

export class RedisQueue extends RedisFacade implements RedisQueueInterface {
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
        ttl = 0,
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
            try {
                let _args: CommandArguments = [1, "nx"];
                let { ttl } = this.tasks[0];
                ttl > 0 && _args.push("ex", ttl);
                let res = await this.exec("set", ..._args);

                if (res === "OK") {
                    let { handle, args } = this.tasks.shift();
                    await handle.apply(void 0, args);
                    await this.clear();
                }
            } catch (e) { }

            setImmediate(() => this.callNext());
        }
    }
}

export default function (redis: RedisClient) {
    return createFacadeType("string", RedisQueue, redis);
}