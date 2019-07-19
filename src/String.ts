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

    async get() {
        return await this.exec<string>("get");
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

    async includes(str: string) {
        return -1 !== (await this.indexOf(str));
    }

    async indexOf(str: string) {
        return (await this.get()).indexOf(str);
    }

    async lastIndexOf(str: string) {
        return (await this.get()).lastIndexOf(str);
    }

    async search(partial: string | RegExp) {
        return (await this.get()).search(partial);
    }

    charAt(index: number) {
        return this.slice(index, index + 1);
    }

    async charCodeAt(index: number) {
        return (await this.charAt(index)).charCodeAt(0);
    }

    async concat(...strings: string[]) {
        let [, result] = await this.batch(["append", strings.join("")], ["get"]);
        return result as string;
    }

    /** A synonym of `concat()`. */
    append(...strings: string[]) {
        return this.concat(...strings);
    }

    async padStart(maxLength: number, fillString = " ") {
        let value = (await this.get()).padStart(maxLength, fillString);
        return this.set(value);
    }

    async padEnd(maxLength: number, fillString = " ") {
        let value = (await this.get()).padEnd(maxLength, fillString);
        return this.set(value);
    }

    async trim() {
        return this.set((await this.get()).trim());
    }

    async trimStart() {
        return this.set((await this.get()).trimLeft());
    }

    async trimEnd() {
        return this.set((await this.get()).trimRight());
    }

    async toLowerCase() {
        return this.set((await this.get()).toLowerCase());
    }

    async toUpperCase() {
        return this.set((await this.get()).toUpperCase());
    }

    async replace(str: string, replacement: string) {
        let value = (await this.get()).replace(str, replacement);
        return this.set(value);
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