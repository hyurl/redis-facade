"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

const { RedisFacade, key } = require("./Facade");
const { createFacadeType } = require("./util");

class RedisSet extends RedisFacade {
    /**
     * @param {...string} values
     * @returns {Promise<this>}
     */
    add(...values) {
        return this.exec("sadd", ...values).then(() => this);
    }

    /**
     * 
     * @param {...string} values
     * @returns {Promise<boolean>} 
     */
    delete(...values) {
        return this.exec("srem", ...values).then(res => res > 0);
    }

    /**
     * @param {string} value
     * @returns {Promise<boolean>} 
     */
    has(value) {
        return this.exec("sismember", value).then(res => res > 0);
    }

    /**
     * @returns {Promise<string[]>}
     */
    values() {
        return this.exec("smembers");
    }

    /**
     * @returns {Promise<number>}
     */
    size() {
        return this.exec("scard");
    }

    /**
     * @param {number} [count]
     * @returns {Promise<string|string[]>}
     */
    pop(count = 1) {
        if (count === 1) {
            return this.exec("spop");
        } else {
            return this.exec("spop", count);
        }
    }

    /**
     * @param {number} [count]
     * @returns {Promise<string|string[]>}
     */
    random(count = 1) {
        if (count === 1) {
            return this.exec("srandmember");
        } else {
            return this.exec("srandmember", count);
        }
    }

    /**
     * @param  {...RedisSet} sets 
     * @returns {Promise<string[]>}
     */
    difference(...sets) {
        return this.exec("sdiff", ...sets.map(set => set[key]));
    }

    /**
     * @param  {...RedisSet} sets 
     * @returns {Promise<string[]>}
     */
    intersection(...sets) {
        return this.exec("sinter", ...sets.map(set => set[key]));
    }

    /**
     * @param  {...RedisSet} sets 
     * @returns {Promise<string[]>}
     */
    union(...sets) {
        return this.exec("sunion", ...sets.map(set => set[key]));
    }
}

exports.default = redis => createFacadeType("set", RedisSet, redis);