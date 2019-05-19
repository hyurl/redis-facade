import { RedisFacade } from "./Facade";
import { createFacadeType } from "./util";
import { RedisSet as RedisSetInterface } from ".";
import { RedisClient } from "redis";

class RedisSet extends RedisFacade implements RedisSetInterface {
    async add(...values: string[]) {
        await this.exec<number>("sadd", ...values);
        return this;
    }

    async delete(...values: string[]) {
        return (await this.exec<number>("srem", ...values)) > 0;
    }

    async has(value: string) {
        return (await this.exec<number>("sismember", value)) > 0;
    }

    values() {
        return this.exec<string[]>("smembers");
    }

    async forEach(fn: (value: string) => void, thisArg?: any) {
        let csr = 0;

        while (true) {
            let [_csr, items] = await this.exec<[string, string[]]>("hscan", csr);

            for (let value of items) {
                fn.apply(thisArg, [value]);
            }

            csr = Number(_csr);
            if (csr === 0) {
                break;
            }
        }
    }

    size() {
        return this.exec<number>("scard");
    }

    pop(): Promise<string>;
    pop(count: number): Promise<string[]>;
    pop(count = 1) {
        if (count === 1) {
            return this.exec<string>("spop");
        } else {
            return this.exec<string[]>("spop", count);
        }
    }

    random(): Promise<string>;
    random(count: number): Promise<string[]>;
    random(count = 1) {
        if (count === 1) {
            return this.exec<string>("srandmember");
        } else {
            return this.exec<string[]>("srandmember", count);
        }
    }

    difference(...sets: RedisSetInterface[]) {
        return this.exec<string[]>("sdiff", ...sets.map(set => set["key"]));
    }

    intersection(...sets: RedisSetInterface[]) {
        return this.exec<string[]>("sinter", ...sets.map(set => set["key"]));
    }

    union(...sets: RedisSetInterface[]) {
        return this.exec<string[]>("sunion", ...sets.map(set => set["key"]));
    }
}

export default function (redis: RedisClient) {
    return createFacadeType("set", RedisSet, redis);
}