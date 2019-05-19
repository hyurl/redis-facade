import { RedisFacade } from "./Facade";
import { createFacadeType, isVoid, isFloat } from "./util";
import { RedisString as RedisStringInterface } from ".";
import { RedisClient } from "redis";

class RedisString extends RedisFacade implements RedisStringInterface {
    async set(value: string, ttl = -1) {
        if (ttl > 0) {
            await this.exec("setex", ttl, value);
        } else {
            await this.exec("set", value);
        }

        return value;
    }

    get() {
        return this.exec<string>("get");
    }

    slice(start: number, end: number = undefined) {
        return this.exec<string>(
            "getrange",
            start,
            isVoid(end) ? -1 : (end === 0 ? 0 : end - 1)
        );
    }

    async startsWith(str: string) {
        return str === (await this.slice(0, str.length));
    }

    async endsWith(str: string) {
        return str === (await this.slice(-str.length));
    }

    async append(str: string) {
        await this.exec("append", str);
        return this.get();
    }

    async increase(increment: number = undefined) {
        let res: number;

        if (isVoid(increment)) {
            res = await this.exec("incr");
        } else if (isFloat(increment)) {
            res = await this.exec("incrbyfloat", increment);
        } else {
            res = await this.exec("incrby", increment);
        }

        return String(res);
    }

    async decrease(decrement: number = undefined) {
        let res: number;

        if (isVoid(decrement)) {
            res = await this.exec("decr");
        } else if (isFloat(decrement)) {
            // There is no 'decrbyfloat' in redis, so 'incrbyfloat' to the
            // negative value instead.
            res = await this.exec("incrbyfloat", -decrement);
        } else {
            res = await this.exec("decrby", decrement);
        }

        return String(res);
    }

    length() {
        return this.exec<number>("strlen");
    }
}

export default function (redis: RedisClient) {
    return createFacadeType("string", RedisString, redis);
}