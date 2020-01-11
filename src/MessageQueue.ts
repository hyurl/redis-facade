import { RedisClient } from "redis";
import { RedisFacade } from "./Facade";
import { RedisMessageQueue as RedisMessageQueueInterface } from "./index";
import { redis as _redis, key as _key, exec, createFacadeType } from "./util";

const enablePubSub = Symbol("enablePubSub");

export class RedisMessageQueue extends RedisFacade implements RedisMessageQueueInterface {
    private isReady = false;
    private listeners = new Set<(msg: string) => void>();
    private queuedMessages: string[] = [];
    private static PubSubMap = new Map<RedisClient, {
        connection: RedisClient,
        channels: Map<string, {
            isReady: boolean,
            subscribers: Set<RedisMessageQueue>
        }>
    }>();

    constructor(redis: RedisClient, key: string) {
        super(redis, key);
        let sub = RedisMessageQueue.PubSubMap.get(this[_redis]);

        if (!sub) { // initiate subscriber connection and channel map
            RedisMessageQueue.PubSubMap.set(this[_redis], sub = {
                connection: this[_redis].duplicate(),
                channels: new Map()
            });
            sub.connection.on("subscribe", topic => {
                let channel = sub.channels.get(topic);

                if (channel) {
                    channel.isReady = true;
                    channel.subscribers.forEach(subscriber => {
                        subscriber.isReady = true;
                        subscriber.queuedMessages.forEach(msg => {
                            // republish queued messages
                            subscriber.publish(msg);
                        });
                    });
                }
            }).on("message", (topic, msg) => {
                let channel = sub.channels.get(topic);
                channel && channel.subscribers.forEach(subscriber => {
                    subscriber.listeners.forEach(handle => {
                        try { handle(msg) } catch (e) { }
                    });
                });
            });;
        }

        let channel = sub.channels.get(this[_key]);

        if (!channel) {
            sub.connection.subscribe(this[_key]);
            sub.channels.set(this[_key], channel = {
                isReady: false,
                subscribers: new Set()
            });
        }

        this.isReady = channel.isReady;
        channel.subscribers.add(this);

        if (!redis[enablePubSub]) {
            redis[enablePubSub] = true;
            let quit: RedisClient["quit"] = redis.quit.bind(redis);

            // Rewrite the quit method so that when quitting the main connection,
            // the underlying subscriber connections will be closed as well.
            redis.quit = (cb) => {
                (async () => {
                    try {
                        // Close main connection.
                        await new Promise<void>((resolve, reject) => {
                            quit(err => err ? reject(err) : resolve());
                        });

                        // Close subscriber connections and empty queues.
                        for (let [redis, sub] of RedisMessageQueue.PubSubMap) {
                            sub.channels.forEach(channel => {
                                channel.isReady = false;
                                channel.subscribers.forEach(subscriber => {
                                    subscriber.isReady = false;
                                });
                            });
                            RedisMessageQueue.PubSubMap.delete(redis);
                            await new Promise((resolve, reject) => {
                                sub.connection.quit(err => {
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