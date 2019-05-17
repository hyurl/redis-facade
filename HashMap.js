"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

const { RedisFacade } = require("./Facade");
const { createFacadeCtor, isVoid, isFloat } = require("./util");

class RedisHashMap extends RedisFacade {
    /**
     * @param {string|{[key: string]: string}} key 
     * @param {string} [value]
     * @returns {Promise<this>} 
     */
    set(key, value) {
        if (typeof key === "object") {
            return this._emitCommand("hmset", key).then(() => this);
        } else {
            return this._emitCommand("hset", key, value).then(() => this);
        }
    }

    /**
     * @param {string} key 
     * @returns {Promise<boolean>}
     */
    delete(key) {
        return this._emitCommand("hdel", key).then(res => res > 0);
    }

    /**
     * @param {string} key
     * @returns {Promise<string>} 
     */
    get(key) {
        return this._emitCommand("hget", key);
    }

    /**
     * @param {string} key
     * @returns {Promise<boolean>} 
     */
    has(key) {
        return this._emitCommand("hexists", key).then(res => res > 0);
    }

    /**
     * @returns {Promise<string[]>}
     */
    keys() {
        return this._emitCommand("hkeys");
    }

    /**
     * @returns {Promise<string[]>}
     */
    values() {
        return this._emitCommand("hvals");
    }

    /**
     * @returns {Promise<{[key: string]: string}>}
     */
    pairs() {
        return this._emitCommand("hgetall");
    }

    /**
     * @returns {Promise<number>}
     */
    getSize() {
        return this._emitCommand("hlen");
    }

    /**
     * @param {string} key 
     * @param {number} increment 
     * @returns {Promise<string>}
     */
    increase(key, increment) {
        if (isVoid(increment)) {
            return this._emitCommand("hincrby", key, 1).then(String);
        } else if (isFloat(increment)) {
            return this._emitCommand("hincrbyfloat", key, increment).then(String);
        } else {
            return this._emitCommand("hincrby", key, increment).then(String);
        }
    }

    /**
     * @param {string} key 
     * @param {number} decrement 
     * @returns {Promise<string>}
     */
    decrease(key, decrement) {
        return this.increase(key, isVoid(decrement) ? -1 : -decrement);
    }
}

exports.default = redis => createFacadeCtor(RedisHashMap, redis);