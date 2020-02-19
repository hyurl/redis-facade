import { RedisClient } from "redis";
import { RedisFacade } from "./Facade";
import { RedisLock as RedisLockInterface } from ".";
import { CommandArguments, exec, createFacadeType } from "./util";

export class RedisLock extends RedisFacade implements RedisLockInterface {
    async acquire(ttl = 0) {
        let args: CommandArguments = ["nx"];
        ttl > 0 && args.push("ex", ttl);
        return "OK" === (await this.exec<string>("set", ...args));
    }

    async release() {
        await this.clear();
    }

    static of(redis: RedisClient, key: string) {
        return new RedisLock(redis, `redisLock:${key}`);
    }

    static async has(redis: RedisClient, key: string) {
        return 1 === (await exec.call(redis, "exists", `redisLock:${key}`));
    }
}

export default function (redis: RedisClient) {
    return createFacadeType("none", RedisLock, redis);
}