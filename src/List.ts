import { RedisFacade } from "./Facade";
import { createFacadeType, isVoid, key } from "./util";
import { RedisList as RedisListInterface } from ".";
import { RedisClient } from "redis";

class RedisList extends RedisFacade implements RedisListInterface {
    shift() {
        return this.exec<string>("lpop");
    }

    unshift(...values: string[]) {
        return this.exec<number>("lpush", ...values.reverse());
    }

    pop() {
        return this.exec<string>("rpop");
    }

    push(...values: string[]) {
        return this.exec<number>("rpush", ...values);
    }

    async includes(value: string) {
        return (await this.indexOf(value)) >= 0;
    }

    async indexOf(value: string) {
        return (await this.values()).indexOf(value);
    }

    async valueAt(index: number, value: string = undefined) {
        if (isVoid(value)) {
            return this.exec<string>("lindex", index);
        } else {
            await this.exec<number>("lset", index, value)
            return value;
        }
    }

    values() {
        return this.slice(0);
    }

    slice(start: number, end: number = undefined) {
        return this.exec<string[]>(
            "lrange",
            start,
            isVoid(end) ? -1 : (end === 0 ? 0 : end - 1)
        );
    }

    async splice(start: number, count = 1, ...items: string[]) {
        let values = await this.values();
        let removed = values.splice(start, count, ...items);

        await this.clear();
        await this.push(...values);

        return removed;
    }

    async sort(order: 1 | -1 = 1) {
        let _order = order >= 0 ? "asc" : "desc";
        await this.exec("sort", "alpha", _order, "store", this[key]);
        return this.values();
    }

    async reverse() {
        let values = await this.values();
        let reversed = values.reverse();

        await this.clear();
        await this.push(...reversed);

        return reversed;
    }

    async forEach(fn: (value: string, index: number) => void, thisArg?: any) {
        let values = await this.values();
        values.forEach(fn, thisArg);
    }

    length() {
        return this.exec<number>("llen");
    }
}

export default function (redis: RedisClient) {
    return createFacadeType("list", RedisList, redis);
}