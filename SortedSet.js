"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

const { RedisFacade } = require("./Facade");
const { createFacadeCtor, isVoid } = require("./util");

class RedisSortedSet extends RedisFacade {
    /**
     * @param {string|{[value: string]: number}} value
     * @param {number} [score]
     * @returns {Promise<this>}
     */
    add(value, score) {
        if (typeof value === "object") {
            let data = [];

            for (let x in value) {
                data.push(x, value[x]);
            }

            return this._emitCommand("zadd", ...data).then(() => this);
        } else {
            return this._emitCommand("zadd", score, value).then(() => this);
        }
    }

    /**
     * A synonym of `RedisSortedSet.add()`.
     * @param {string|{[value: string]: number}} value
     * @param {number} [score]
     * @returns {Promise<this>}
     */
    set(value, score) {
        return this.add(value, score);
    }

    /**
     * 
     * @param {...string} values
     * @returns {Promise<boolean>} 
     */
    delete(...values) {
        return this._emitCommand("zrem", ...values).then(res => res > 0);
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
        return this._emitCommand("zrank", value).then(index => {
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
     * @param {number} start 
     * @param {number} [end] 
     * @returns {Promise<string[]>}
     */
    slice(start, end = 0) {
        return this._emitCommand("zrange", start, end - 1);
    }

    /**
     * @param {number} start 
     * @param {number} count 
     * @returns {Promise<string[]>}
     */
    splice(start, count = 1) {
        let end = start + count;
        return this.slice(start, end).then(values => {
            return this._emitCommand(
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
        return this._emitCommand("zscore", value).then(Number);
    }

    /**
     * @returns {Promise<{[value: string]: number}>}
     */
    scores() {
        return this._emitCommand("zrange", 0, -1, "withscores").then(res => {
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
     * @returns {Promise<string>}
     */
    increase(value, increment = 1) {
        // fix type after retrieving the score
        return this._emitCommand("zincrby", increment, value).then(Number);
    }
    /**
     * @param {string} value 
     * @param {number} [decrement] 
     * @returns {Promise<string>}
     */
    decrease(value, decrement = 1) {
        return this.increase(value, -decrement);
    }

    /**
     * @returns {Promise<number>}
     */
    getSize() {
        return this._emitCommand("zcard");
    }

    /**
     * @param {number} minScore 
     * @param {number} maxScore 
     * @returns {Promise<number>}
     */
    countBetween(minScore, maxScore) {
        return this._emitCommand("zcount", minScore, maxScore);
    }

    /**
     * @param {number} minScore 
     * @param {number} maxScore 
     * @returns {Promise<string[]>}
     */
    sliceBetween(minScore, maxScore) {
        return this._emitCommand("zrangebyscore", minScore, maxScore);
    }

    /**
     * @param {number} minScore 
     * @param {number} maxScore 
     * @returns {Promise<string[]>}
     */
    spliceBetween(minScore, maxScore) {
        return this.sliceBetween(minScore, maxScore).then(values => {
            return this._emitCommand(
                "zremrangebyscore",
                minScore,
                maxScore
            ).then(res => res > 0 ? values : []);
        });
    }
}

exports.default = redis => createFacadeCtor(RedisSortedSet, redis);