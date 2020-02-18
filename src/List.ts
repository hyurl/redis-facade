import { RedisFacade } from "./Facade";
import { createFacadeType, key } from "./util";
import { RedisList as RedisListInterface } from ".";
import { RedisClient } from "redis";
import isVoid from "@hyurl/utils/isVoid";
import isEmpty from "@hyurl/utils/isEmpty";

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

    has(value: string) {
        return this.includes(value);
    }

    async includes(value: string) {
        return (await this.indexOf(value)) >= 0;
    }

    async indexOf(value: string) {
        return (await this.values()).indexOf(value);
    }

    async get(index: number) {
        return this.exec<string>("lindex", index);
    }

    async set(index: number, value: string) {
        await this.exec<number>("lset", index, value)
        return value;
    }

    async delete(...values: string[]) {
        return (await this.batch<number[]>(...values.map(value => {
            return ["lrem", 0, value];
        }))).length > 0;
    }

    async concat(...values: (string | string[])[]) {
        let [, value] = await this.batch<[number, string[]]>(
            ["rpush", ...[].concat(values)],
            ["lrange", 0, -1]
        );
        return value;
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
        if (count < 0)
            throw new RangeError("'count' must be equal to or greater than 0");

        if (start === 0) {
            let commands: (string | number)[][] = [];

            if (count === 0) {
                if (!isEmpty(items)) {
                    await this.unshift(...items);
                }

                return [];
            } else if (count === 1) {
                commands.push(["lpop"]);
            } else {
                commands.push(
                    ["lrange", start, count === 0 ? 0 : count - 1],
                    ["ltrim", count, -1]
                );
            }

            if (!isEmpty(items)) {
                commands.push(["lpush", ...[...items].reverse()]);
            }

            let [removed] = await this.batch(...commands);

            if (isVoid(removed)) {
                return [];
            } else {
                return Array.isArray(removed) ? removed : [removed] as string[];
            }
        } else {
            let values = await this.values();
            let removed = values.splice(start, count, ...items);

            if (isEmpty(values)) {
                await this.clear();
            } else {
                await this.batch(["del"], ["rpush", ...values]);
            }

            return removed;
        }
    }

    async sort(order: 1 | -1 = 1) {
        let _order = order >= 0 ? "asc" : "desc";
        let [, values] = await this.batch(
            ["sort", "alpha", _order, "store", this[key]],
            ["lrange", 0, -1]
        );
        return values;
    }

    async reverse() {
        let values = (await this.values()).reverse();
        await this.batch(["del"], ["rpush", ...values]);
        return values;
    }

    async forEach(fn: (value: string, index: number) => void, thisArg?: any) {
        let values = await this.values();
        values.forEach(fn, thisArg);
    }

    size() {
        return this.exec<number>("llen");
    }

    length() {
        return this.size();
    }
}

export default function (redis: RedisClient) {
    return createFacadeType("list", RedisList, redis);
}