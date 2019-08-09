import { RedisFacade } from "./Facade";
import { createFacadeType, isFloat } from "./util";
import { RedisHashMap as RedisHashMapInterface } from ".";
import { RedisClient } from "redis";

class RedisHashMap extends RedisFacade implements RedisHashMapInterface {
    async set(key: string | object, value: string = undefined) {
        if (typeof key === "object") {
            await this.exec("hmset", key);
        } else {
            await this.exec("hset", key, value);
        }

        return this;
    }

    get(key: string) {
        return this.exec<string>("hget", key);
    }

    async has(key: string) {
        return (await this.exec<number>("hexists", key)) > 0;
    }

    async delete(key: string) {
        return (await this.exec<number>("hdel", key)) > 0;
    }

    keys() {
        return this.exec<string[]>("hkeys");
    }

    values() {
        return this.exec<string[]>("hvals");
    }

    toObject() {
        return this.exec<{ [key: string]: string }>("hgetall");
    }

    size() {
        return this.exec<number>("hlen");
    }

    async forEach(fn: (value: string, key: string) => void, thisArg = undefined) {
        let csr = 0;

        while (true) {
            let [_csr, items] = await this.exec<[string, string[]]>("hscan", csr);

            for (let i = 0; i < items.length; i += 2) {
                fn.apply(thisArg, [items[i + 1], items[i]]);
            }

            csr = Number(_csr);
            if (csr === 0) {
                break;
            }
        }
    }

    async increase(key: string, increment = 1) {
        let res: number;

        if (isFloat(increment)) {
            res = await this.exec("hincrbyfloat", key, increment);
        } else {
            res = await this.exec("hincrby", key, increment);
        }

        return String(res);
    }

    decrease(key: string, decrement = 1) {
        return this.increase(key, -decrement);
    }
}

export default function (redis: RedisClient) {
    return createFacadeType("hash", RedisHashMap, redis);
}