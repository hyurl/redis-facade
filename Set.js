"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

const { RedisFacade, redis } = require("./Facade");
const { createFacadeCtor } = require("./util");

class RedisSet extends RedisFacade {
    /**
     * @param {...string} values
     * @returns {Promise<this>}
     */
    add(...values) {
        return this._emitCommand("sadd", ...values).then(() => this);
    }

    /**
     * 
     * @param {...string} values
     * @returns {Promise<boolean>} 
     */
    delete(...values) {
        return this._emitCommand("srem", ...values).then(res => res > 0);
    }

    /**
     * @param {string} value
     * @returns {Promise<boolean>} 
     */
    has(value) {
        return this._emitCommand("sismember", value).then(res => res > 0);
    }

    /**
     * @returns {Promise<string[]>}
     */
    values() {
        return this._emitCommand("smembers").then(values => {
            // Redis v4.X and lower versions add new values to the head of the
            // set, when retrieving members of the set, we need to reverse them
            // explicitly
            if (parseInt(this[redis].server_info.redis_version) <= 4) {
                return values.reverse();
            } else {
                return values;
            }
        });
    }

    /**
     * @returns {Promise<number>}
     */
    getSize() {
        return this._emitCommand("scard");
    }
}

exports.default = redis => createFacadeCtor(RedisSet, redis);