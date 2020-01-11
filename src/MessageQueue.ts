import { RedisClient } from "redis";
import { RedisFacade } from "./Facade";
import { RedisMessageQueue as RedisMessageQueueInterface } from "./index";
import { redis as _redis, key as _key, exec, createFacadeType } from "./util";

const isReady = Symbol("isReady");
const enablePubSub = Symbol("enablePubSub");

export class RedisMessageQueue extends RedisFacade implements RedisMessageQueueInterface {
    private isReady = false;
    private listeners = new Set<(msg: string) => void>();
    private queuedMessages: string[] = [];
    private static Queues = new Map<string, {
        connection: RedisClient,
        subscribers: Set<RedisMessageQueue>
    }>();

    constructor(redis: RedisClient, key: string) {
        super(redis, key);
        let queue = RedisMessageQueue.Queues.get(this[_key]);

        if (queue) {
            this.isReady = queue.connection[isReady] || false;
            queue.subscribers.add(this);
        } else {
            let connection = this[_redis].duplicate();
            let subscribers = new Set<RedisMessageQueue>([this]);

            RedisMessageQueue.Queues.set(this[_key], {
                connection,
                subscribers
            });
            connection.subscribe(this[_key]);
            connection.once("subscribe", () => {
                connection[isReady] = true;
                subscribers.forEach(queue => {
                    queue.isReady = true;
                });

                // Publish queued messages once the subscriber is ready.
                this.queuedMessages.forEach(msg => {
                    this[_redis].publish(this[_key], msg);
                });
            }).on("message", (channel, msg) => {
                if (channel === this[_key]) {
                    subscribers.forEach(queue => {
                        queue.listeners.forEach(handle => {
                            try { handle(msg) } catch (e) { }
                        });
                    });
                }
            });
        }

        if (!redis[enablePubSub]) {
            redis[enablePubSub] = true;
            let quit: RedisClient["quit"] = redis.quit.bind(redis);

            redis.quit = (cb) => {
                (async () => {
                    try {
                        // Close main connection.
                        await new Promise<void>((resolve, reject) => {
                            quit(err => err ? reject(err) : resolve());
                        });

                        // Close subscriber connections and empty queues.
                        for (let [channel, queue] of RedisMessageQueue.Queues) {
                            queue.subscribers.forEach(subscriber => {
                                subscriber.isReady = false;
                            });
                            RedisMessageQueue.Queues.delete(channel);
                            await new Promise((resolve, reject) => {
                                queue.connection.quit(err => {
                                    err ? reject(err) : resolve();
                                });
                            });
                        }

                        cb(null, "OK");
                    } catch (err) {
                        cb(err, void 0);
                    }
                })();

                return true;
            }
        }
    }

    addListener(listener: (msg: string) => void) {
        this.listeners.add(listener);
        return this;
    }

    removeListener(listener: (msg: string) => void) {
        return this.listeners.delete(listener);
    }

    publish(msg: string) {
        if (this.isReady) {
            return this[_redis].publish(this[_key], msg);
        } else {
            this.queuedMessages.push(msg);
            return true;
        }
    }

    static async has(redis: RedisClient, key: string) {
        let channels: any[] = await exec.call(redis, "pubsub", "channels");
        return channels.includes(key);
    }
}

export default function (redis: RedisClient) {
    return createFacadeType("none", RedisMessageQueue, redis);
}