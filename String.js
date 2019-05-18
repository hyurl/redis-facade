"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

const { RedisFacade } = require("./Facade");
const { createFacadeCtor, isVoid, isFloat } = require("./util");

class RedisString extends RedisFacade {
    /**
     * @param {string} value 
     * @param {number} [ttl]
     * @returns {Promise<string>} 
     */
    set(value, ttl) {
        if (ttl > 0) {
            return this._emitCommand("setex", ttl, value).then(() => value);
        } else {
            return this._emitCommand("set", value).then(() => value);
        }
    }

    /**
     * @returns {Promise<string>}
     */
    get() {
        return this._emitCommand("get");
    }

    /**
     * @param {string} value
     * @returns {Promise<boolean>}
     */
    startsWith(value) {
        return this._emitCommand("getrange", 0, value.length - 1).then(res => {
            return res === value;
        });
    }

    /**
     * @param {string} value
     * @returns {Promise<boolean>}
     */
    endsWith(value) {
        return this._emitCommand("getrange", -value.length, -1).then(res => {
            return res === value;
        });
    }

    /**
     * @param {string} value 
     * @returns {Promise<string>}
     */
    append(value) {
        return this._emitCommand("append", value).then(() => this.get());
    }

    /**
     * @param {number} [increment]
     * @returns {Promise<string>}
     */
    increase(increment) {
        if (isVoid(increment)) {
            return this._emitCommand("incr").then(String); // type fix
        } else if (isFloat(increment)) {
            return this._emitCommand("incrbyfloat", increment).then(String);
        } else {
            return this._emitCommand("incrby", increment).then(String);
        }
    }

    /**
     * @param {number} [decrement]
     * @returns {Promise<string>}
     */
    decrease(decrement) {
        if (isVoid(decrement)) {
            return this._emitCommand("decr").then(String); // type fix
        } else if (isFloat(decrement)) {
            // There is no 'decrbyfloat' in redis, so incrbyfloat to the
            // negative value instead.
            return this._emitCommand("incrbyfloat", -decrement).then(String);
        } else {
            return this._emitCommand("decrby", decrement).then(String);
        }
    }

    /**
     * @returns {Promise<number>} 
     */
    getLength() {
        return this._emitCommand("strlen");
    }
}

exports.default = redis => createFacadeCtor(RedisString, redis);