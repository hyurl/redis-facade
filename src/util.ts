import { RedisClient } from "redis";
import { RedisFacadeUtils, RedisFacade, RedisFacadeType } from '.';

export const key = Symbol("RedisDataKey");
export const redis = Symbol("RedisClient");

export type CommandArguments = (string | number | object)[];
export type RedisReply = string | number | string[];

export function isVoid(value: any) {
    return value === null || value === undefined;
}

export function isFloat(num: any) {
    return typeof num === "number" && num % 1 !== 0;
}

export function isRedisV5(redis: RedisClient) {
    return parseInt(redis.server_info.redis_version) >= 5;
}

export function exec(
    this: RedisClient,
    cmd: string,
    ...args: string[]
): Promise<RedisReply> {
    return new Promise((resolve, reject) => {
        this[cmd](...args, (err: Error, res: RedisReply) => {
            err ? reject(err) : resolve(res);
        });
    });
};

export function createFacadeUtils(redis: RedisClient): RedisFacadeUtils {
    let _exec: (...args: any[]) => Promise<RedisReply> = exec.bind(redis);
    let { redis: _redis, key: _key } = exports;
    let heartBeat = setInterval(() => {
        redis.ping();
    }, 5000);

    return {
        is: (ins1: RedisFacade, ins2: RedisFacade) => {
            return ins1.constructor && ins2.constructor
                && ins1.constructor === ins2.constructor
                && ins1[_redis] === ins2[_redis]
                && ins1[_key] === ins2[_key];
        },
        exec: _exec,
        has: (key: string) => _exec("exists", key).then(res => res > 0),
        delete: (key: string) => _exec("del", key).then(res => res > 0),
        typeof: (key: string) => _exec("type", key) as Promise<any>,
        disconnect: () => {
            return new Promise<void>((resolve) => {
                clearInterval(heartBeat);
                redis.quit(() => resolve());
            });
        }
    };
};

export function createFacadeType<T extends new (...args: any[]) => RedisFacade>(
    type: string,
    ctor: T & {
        of?: (redis: RedisClient, key: string) => InstanceType<T>,
        has?: (redis: RedisClient, key: string) => Promise<boolean>
    },
    redis: RedisClient
) {
    // Creates a wrapped constructor to prevent conflict, so that every time
    // calling `createFacadeType` with a new redis connection will refer to the
    // new constructor.
    let facade: RedisFacadeType<InstanceType<T>> = ctor.bind(void 0, redis);

    Object.defineProperty(facade, "prototype", {
        value: ctor.prototype
    });

    facade.of = function (key: string) {
        if (typeof ctor.of === "function") {
            return ctor.of(redis, key);
        } else {
            return new (<any>facade)(key);
        }
    };

    facade.has = async function (key) {
        if (typeof ctor.has === "function") {
            return ctor.has(redis, key);
        } else {
            return type === (await exec.call(redis, "type", key));
        }
    };

    return facade;
};