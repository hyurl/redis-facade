"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

const { RedisFacade } = require("./Facade");
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
        return this._emitCommand("smembers");
    }

    /**
     * @returns {Promise<number>}
     */
    getSize() {
        return this._emitCommand("scard");
    }
}

exports.default = redis => createFacadeCtor(RedisSet, redis);