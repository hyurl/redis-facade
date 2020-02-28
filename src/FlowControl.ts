import { RedisClient } from "redis";
import { RedisFacade } from './Facade';
import { RedisMessageQueue } from "./MessageQueue";
import { key as _key } from "./util";
import isOwnKey from "@hyurl/utils/isOwnKey";

export abstract class FlowControl extends RedisFacade {
    protected static message: RedisMessageQueue;

    constructor(
        redis: RedisClient,
        key: string,
        listener: (msg: string) => void
    ) {
        super(redis, key);

        let ctor: typeof FlowControl = <any>this.constructor;

        if (!isOwnKey(ctor, "message")) {
            ctor.message = new RedisMessageQueue(redis, ctor.name);
            ctor.message.addListener(listener);
        }
    }

    abstract run<T, A extends any[]>(
        task: (...args: A) => T | Promise<T>,
        ttl?: number,
        ...args: A
    ): Promise<T>;
}