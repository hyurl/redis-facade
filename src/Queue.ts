import { RedisClient } from "redis";
import { RedisFacade } from "./Facade";
import { RedisQueue as RedisQueueInterface } from "./index";
import { redis as _redis, key as _key, CommandArguments, createFacadeType } from "./util";
import sequid from "sequid";

const MessageQueues = new Map<RedisClient, RedisClient>();

export class RedisQueue extends RedisFacade implements RedisQueueInterface {
    private static uids = sequid(0, true);
    private tasks: {
        handle: (...args: any[]) => Promise<void>;
        ttl: number;
        args: any[]
    }[] = [];

    constructor(redis: RedisClient, key: string) {
        super(redis, key);

        if (!MessageQueues.has(this[_redis])) {
            let mq = this[_redis].duplicate();
            let quit = this[_redis].quit;

            MessageQueues.set(this[_redis], mq);
            mq.subscribe(this[_key]);
            mq.on("message", (channel) => {
                if (channel === this[_key]) {
                    this.tryTask();
                }
            });
            this[_redis].quit = function (cb) {
                mq.unsubscribe(this[_key]);
                return mq.quit(() => {
                    return quit.call(this[_redis], cb);
                });
            }
        }
    }

    static resolve(key: string) {
        return `RedisQueueLock:${key}`;
    }

    async run<T extends (...args: any[]) => any>(
        task: T,
        ttl = 30,
        ...args: Parameters<T>
    ): Promise<ReturnType<T> extends Promise<infer U> ? U : ReturnType<T>> {
        let mq = MessageQueues.get(this[_redis]);
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

        setImmediate(() => mq.publish(this[_key], "1"));
        return job;
    }

    private async tryTask() {
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

                MessageQueues.get(this[_redis]).publish(this[_key], "1");
            }
        }
    }
}

export default function (redis: RedisClient) {
    return createFacadeType("string", RedisQueue, redis);
}