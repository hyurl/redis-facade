import { RedisClient } from "redis";
import { exec, RedisReply, CommandArguments } from "./util";
import { RedisFacade as RedisFacadeInterface } from ".";

// export const key = Symbol("RedisDataKey");
// export const redis = Symbol("RedisClient");

export abstract class RedisFacade implements RedisFacadeInterface {
    /**
     * @param redis A key in the Redis store that this instance binds to.
     * @param key Sets Time-To-Live on the current key in seconds.
     */
    constructor(protected redis: RedisClient, protected key: string) { }

    exec<T = RedisReply>(cmd: string, ...args: CommandArguments): Promise<T> {
        return exec.call(this.redis, cmd, this.key, ...args);
    }

    async setTTL(seconds: number) {
        let res = await this.exec<number>("expire", seconds);
        return res > 0 ? seconds : -1;
    }

    getTTL() {
        return this.exec<number>("ttl");
    }

    async clear() {
        await this.exec("del");
    }

    equals(another: RedisFacade) {
        return this.constructor === another.constructor
            && this.redis === another.redis
            && this.key === another.key;
    }
}