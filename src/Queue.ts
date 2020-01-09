import { RedisClient } from "redis";
import { RedisFacade } from "./Facade";
import { RedisQueue as RedisQueueInterface } from "./index";
import { redis as _redis, key as _key, CommandArguments, createFacadeType } from "./util";
import sequid from "sequid";

const Subscribers = new Map<RedisClient, {
    client: RedisClient,
    listeners: (() => void)[]
}>();

export class RedisQueue extends RedisFacade implements RedisQueueInterface {
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

        let subscriber = Subscribers.get(this[_redis]);

        if (subscriber) {
            subscriber.listeners.push(this.tryTask.bind(this));
        } else {
            let sub = this[_redis].duplicate();
            let listeners: (() => void)[] = [this.tryTask.bind(this)];
            let quit = this[_redis].quit;

            Subscribers.set(this[_redis], { client: sub, listeners });
            sub.subscribe(this[_key]);
            sub.once("subscribe", () => {
                this[_redis].publish(this[_key], "tryTask");
            }).on("message", (channel) => {
                if (channel === this[_key]) {
                    for (let handle of listeners) {
                        try { handle() } catch (e) { }
                    }
                }
            });
            this[_redis].quit = (cb) => {
                sub.unsubscribe(this[_key]);
                return sub.quit(() => {
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
        let job = new Promise<any>((resolve, reject) => {
            this.tasks.push({
                task,
                resolve,
                reject,
                ttl,
                args
            });
        });

        this[_redis].publish(this[_key], "tryTask");
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

                this[_redis].publish(this[_key], "tryTask");
            }
        }
    }
}

export default function (redis: RedisClient) {
    return createFacadeType("string", RedisQueue, redis);
}