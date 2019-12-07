import { RedisFacade } from "./Facade";
import { createFacadeType, isVoid, isRedisV5, redis } from "./util";
import { RedisSortedSet as RedisSortedSetInterface } from ".";
import { RedisClient } from "redis";

class RedisSortedSet extends RedisFacade implements RedisSortedSetInterface {
    async add(value: string | { [value: string]: number; }, score = 0) {
        if (typeof value === "object") {
            let data = [];

            for (let x in value) {
                data.push(value[x], x);
            }

            await this.exec("zadd", ...data);
        } else {
            await this.set(value, score);
        }

        return this;
    }

    async delete(...values: string[]) {
        return (await this.exec("zrem", ...values)) > 0;
    }

    async has(value: string) {
        return (await this.indexOf(value)) >= 0;
    }

    async indexOf(value: string) {
        let index = await this.exec<number>("zrank", value);
        return isVoid(index) ? -1 : index;
    }

    values() {
        return this.slice(0);
    }

    async forEach(fn: (value: string, score: number) => void, thisArg?: any) {
        let csr = 0;

        while (true) {
            let [_csr, items] = await this.exec<[string, string[]]>("zscan", csr);

            for (let i = 0; i < items.length; i += 2) {
                fn.apply(thisArg, [items[i], Number(items[i + 1])]);
            }

            csr = Number(_csr);
            if (csr === 0) {
                break;
            }
        }
    }

    pop(): Promise<string>;
    pop(withScore: true): Promise<[string, number]>;
    async pop(withScores = false) {
        if (isRedisV5(this[redis])) {
            let [value, score] = await this.exec<[string, string]>("zpopmax");
            return withScores ? [value, Number(score)] : value;
        } else {
            // 'zpopmax' is a new command that only Redis v5+ supports, for
            // older version, use a compatible approach.
            if (withScores) {
                let [value, score] = await this.exec<[string, string]>("zrange",
                    -1, -1, "withscores");

                await this.delete(value);
                return [value, Number(score)];
            } else {
                let [value] = await this.splice(-1);
                return value;
            }
        }
    }

    shift(): Promise<string>;
    shift(withScore: true): Promise<[string, number]>;
    async shift(withScores = false) {
        if (isRedisV5(this[redis])) {
            let [value, score] = await this.exec<[string, string]>("zpopmin");
            return withScores ? [value, Number(score)] : value;
        } else {
            // 'zpopmin' is a new command that only Redis v5+ supports, for
            // older version, use a compatible approach.
            if (withScores) {
                let [value, score] = await this.exec<[string, string]>("zrange",
                    0, 0, "withscores");

                await this.delete(value);
                return [value, Number(score)];
            } else {
                let [value] = await this.splice(0);
                return value;
            }
        }
    }

    slice(start: number, end: number = undefined) {
        return this.exec<string[]>(
            "zrange",
            start,
            isVoid(end) ? -1 : (end === 0 ? 0 : end - 1)
        );
    }

    async splice(start: number, count = 1) {
        let end = start + count - 1;
        let [values, res] = await this.batch<[string[], number]>(
            ["zrange", start, end === 0 ? -1 : end],
            ["zremrangebyrank", start, end]
        );
        return res > 0 ? values : [];
    }

    async scoreOf(value: string) {
        // fix type after retrieving the score
        let res = await this.exec("zscore", value);
        return res === null ? null : Number(res);
    }

    async scores() {
        let data: { [value: string]: number; } = {};
        let res = await this.exec<string[]>("zrange", 0, -1, "withscores");

        for (let i = 0; i < res.length; i += 2) {
            data[res[i]] = Number(res[i + 1]);
        }

        return data;
    }

    async increase(value: string, increment = 1) {
        // fix type after retrieving the score
        return Number(await this.exec<string>("zincrby", increment, value));
    }

    decrease(value: string, decrement = 1) {
        return this.increase(value, -decrement);
    }

    async set(value: string, score: number) {
        await this.exec<number>("zadd", score, value);
        return score;
    }

    size() {
        return this.exec<number>("zcard");
    }

    countByScore(minScore: number, maxScore: number = undefined) {
        isVoid(maxScore) && (maxScore = minScore);
        return this.exec<number>("zcount", minScore, maxScore);
    }

    sliceByScore(minScore: number, maxScore: number) {
        return this.exec<string[]>("zrangebyscore", minScore, maxScore);
    }

    async spliceByScore(minScore: number, maxScore: number) {
        let [values, res] = await this.batch<[string[], number]>(
            ["zrangebyscore", minScore, maxScore],
            ["zremrangebyscore", minScore, maxScore]
        );
        return res > 0 ? values : [];
    }
}

export default function (redis: RedisClient) {
    return createFacadeType("zset", RedisSortedSet, redis);
}