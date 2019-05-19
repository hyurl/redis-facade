"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

const { RedisFacade, redis } = require("./Facade");
const { createFacadeType, isVoid, isRedisV5 } = require("./util");

class RedisSortedSet extends RedisFacade {
    /**
     * @param {string|{[value: string]: number}} value
     * @param {number} [score]
     * @returns {Promise<this>}
     */
    add(value, score = 0) {
        if (typeof value === "object") {
            let data = [];

            for (let x in value) {
                data.push(value[x], x);
            }

            return this.exec("zadd", ...data).then(() => this);
        } else {
            return this.set(value, score).then(() => this);
        }
    }

    /**
     * 
     * @param {...string} values
     * @returns {Promise<boolean>} 
     */
    delete(...values) {
        return this.exec("zrem", ...values).then(res => res > 0);
    }

    /**
     * @param {string} value
     * @returns {Promise<boolean>} 
     */
    has(value) {
        return this.indexOf(value).then(index => index >= 0);
    }

    /**
     * @param {string} value 
     * @returns {Promise<number>}
     */
    indexOf(value) {
        return this.exec("zrank", value).then(index => {
            return isVoid(index) ? -1 : index;
        });
    }

    /**
     * @returns {Promise<string[]>}
     */
    values() {
        // fix order after retrieve the result
        return this.slice(0);
    }

    /**
     * @param {boolean} withScores
     * @returns {Promise<string|[string, number]>}
     */
    pop(withScores = false) {
        if (isRedisV5(this[redis])) {
            return this.exec("zpopmax").then(([value, score]) => {
                return withScores ? [value, Number(score)] : value;
            });
        } else {
            // 'zpopmax' is a new command that only Redis v5+ supports, for
            // older version, use a compatible approach.
            if (withScores) {
                return this.exec("zrange", -1, -1, "withscores")
                    .then(([value, score]) => {
                        return this.delete(value)
                            .then(() => [value, Number(score)]);
                    });
            } else {
                return this.splice(-1).then(([value]) => {
                    return value;
                });
            }
        }
    }

    /**
     * @param {boolean} withScores
     * @returns {Promise<string|[string, number]>}
     */
    shift(withScores = false) {
        if (isRedisV5(this[redis])) {
            return this.exec("zpopmin").then(([value, score]) => {
                return withScores ? [value, Number(score)] : value;
            });
        } else {
            // 'zpopmin' is a new command that only Redis v5+ supports, for
            // older version, use a compatible approach.
            if (withScores) {
                return this.exec("zrange", 0, 0, "withscores")
                    .then(([value, score]) => {
                        return this.delete(value)
                            .then(() => [value, Number(score)]);
                    });
            } else {
                return this.splice(0, 1).then(([value]) => value);
            }
        }
    }

    /**
     * @param {number} start 
     * @param {number} [end] 
     * @returns {Promise<string[]>}
     */
    slice(start, end = undefined) {
        return this.exec(
            "zrange",
            start,
            isVoid(end) ? -1 : (end === 0 ? 0 : end - 1)
        );
    }

    /**
     * @param {number} start 
     * @param {number} count 
     * @returns {Promise<string[]>}
     */
    splice(start, count = 1) {
        let end = start + count;

        return this.slice(start, end === 0 ? undefined : end).then(values => {
            return this.exec(
                "zremrangebyrank",
                start,
                end - 1
            ).then(res => res > 0 ? values : []);
        });
    }

    /**
     * @param {string} value 
     * @returns {Promise<number>}
     */
    scoreOf(value) {
        // fix type after retrieving the score
        return this.exec("zscore", value).then((res) => {
            return res === null ? null : Number(res);
        });
    }

    /**
     * @returns {Promise<{[value: string]: number}>}
     */
    scores() {
        return this.exec("zrange", 0, -1, "withscores").then(res => {
            let data = {};

            for (let i = 0; i < res.length; i += 2) {
                data[res[i]] = Number(res[i + 1]);
            }

            return data;
        });
    }

    /**
     * @param {string} value 
     * @param {number} [increment] 
     * @returns {Promise<number>}
     */
    increase(value, increment = 1) {
        // fix type after retrieving the score
        return this.exec("zincrby", increment, value).then(Number);
    }
    /**
     * @param {string} value 
     * @param {number} [decrement] 
     * @returns {Promise<number>}
     */
    decrease(value, decrement = 1) {
        return this.increase(value, -decrement);
    }

    /**
     * @param {string} value
     * @param {number} score
     * @returns {Promise<number>}
     */
    set(value, score) {
        return this.exec("zadd", score, value).then(() => score);
    }

    /**
     * @returns {Promise<number>}
     */
    size() {
        return this.exec("zcard");
    }

    /**
     * @param {number} minScore 
     * @param {number} [maxScore] 
     * @returns {Promise<number>}
     */
    countByScore(minScore, maxScore = undefined) {
        isVoid(maxScore) && (maxScore = minScore);
        return this.exec("zcount", minScore, maxScore);
    }

    /**
     * @param {number} minScore 
     * @param {number} maxScore 
     * @returns {Promise<string[]>}
     */
    sliceByScore(minScore, maxScore) {
        return this.exec("zrangebyscore", minScore, maxScore);
    }

    /**
     * @param {number} minScore 
     * @param {number} maxScore 
     * @returns {Promise<string[]>}
     */
    spliceByScore(minScore, maxScore) {
        return this.sliceByScore(minScore, maxScore).then(values => {
            return this.exec(
                "zremrangebyscore",
                minScore,
                maxScore
            ).then(res => res > 0 ? values : []);
        });
    }
}

exports.default = redis => createFacadeType("zset", RedisSortedSet, redis);