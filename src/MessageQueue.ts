import { RedisClient } from "redis";
import { RedisFacade } from "./Facade";
import { RedisMessageQueue as RedisMessageQueueInterface } from "./index";
import { redis as _redis, key as _key, exec, createFacadeType } from "./util";

export class RedisMessageQueue extends RedisFacade implements RedisMessageQueueInterface {
    readonly isReady: boolean;
    private listeners = new Set<(msg: string) => void>();
    private waitingMessages: string[] = [];

    constructor(redis: RedisClient, key: string) {
        super(redis, key);
        RedisMessageQueue.ensureSubPub(redis);
        RedisMessageQueue.register(redis, this);
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
            this.waitingMessages.push(msg);
            return true;
        }
    }

    /**
     * @override
     */
    async clear() {
        RedisMessageQueue.unregister(this[_redis], this);
    }

    static async has(redis: RedisClient, key: string) {
        let channels = await exec<string[]>(redis, "pubsub", "channels");
        return channels.includes(key);
    }
}

export namespace RedisMessageQueue {
    const enablePubSub = Symbol("enablePubSub");
    export const PubSubMap = new Map<RedisClient, {
        connection: RedisClient,
        channels: Map<string, {
            isReady: boolean,
            subscribers: Set<RedisMessageQueue>
        }>
    }>();

    function getSubChannel(redis: RedisClient) {
        let sub = PubSubMap.get(redis);

        if (!sub) { // initiate subscriber connection and channel map
            PubSubMap.set(redis, sub = {
                connection: redis.duplicate(),
                channels: new Map()
            });
            sub.connection.on("subscribe", topic => {
                let channel = sub.channels.get(topic);

                if (channel) {
                    channel.isReady = true;
                    channel.subscribers.forEach(subscriber => {
                        subscriber["waitingMessages"].forEach(msg => {
                            // republish queued messages
                            subscriber.publish(msg);
                        });
                    });
                }
            }).on("message", (topic, msg) => {
                let channel = sub.channels.get(topic);

                if (channel) {
                    channel.subscribers.forEach(subscriber => {
                        subscriber["listeners"].forEach(handle => {
                            try { handle(msg) } catch (e) { }
                        });
                    });
                }
            });
        }

        return sub;
    }

    export function ensureSubPub(redis: RedisClient) {
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
                        for (let [redis, sub] of PubSubMap) {
                            sub.channels.forEach(channel => {
                                channel.isReady = false;
                            });
                            PubSubMap.delete(redis);
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

    export function register(redis: RedisClient, instance: RedisMessageQueue) {
        let topic = instance[_key];
        let sub = getSubChannel(redis);
        let channel = sub.channels.get(topic);

        if (!channel) {
            sub.connection.subscribe(topic);
            sub.channels.set(topic, channel = {
                isReady: false,
                subscribers: new Set()
            });
        }

        channel.subscribers.add(instance);

        Object.defineProperty(instance, "isReady", {
            get: () => channel.isReady
        });
    }

    export function unregister(redis: RedisClient, instance: RedisMessageQueue) {
        let topic = instance[_key];
        let sub = getSubChannel(redis);
        let channel = sub.channels.get(topic);

        if (channel) {
            channel.subscribers.delete(instance);
        }
    }
}

export default function (redis: RedisClient) {
    return createFacadeType("none", RedisMessageQueue, redis);
}