import { RedisClient } from "redis";
import { RedisFacade as RedisFacadeInterface } from ".";
import {
    redis as _redis,
    key as _key,
    exec,
    RedisReply,
    CommandArguments,
    batch
} from "./util";

export abstract class RedisFacade implements RedisFacadeInterface {
    [_redis]: RedisClient
    [_key]: string;

    constructor(redis: RedisClient, key: string) {
        this[_redis] = redis;
        this[_key] = key;
    }

    exec<T = RedisReply>(cmd: string, ...args: CommandArguments): Promise<T> {
        return exec(this[_redis], cmd, this[_key], ...args);
    }

    batch<T = RedisReply[]>(...cmds: (string | number)[][]): Promise<T> {
        return batch(this[_redis], ...cmds.map(cmd => {
            cmd.splice(1, 0, this[_key]);
            return cmd;
        })) as any;
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
}