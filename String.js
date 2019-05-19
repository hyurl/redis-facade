"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

const { RedisFacade } = require("./Facade");
const { createFacadeType, isVoid, isFloat } = require("./util");

class RedisString extends RedisFacade {
    /**
     * @param {string} value 
     * @param {number} [ttl]
     * @returns {Promise<string>} 
     */
    set(value, ttl) {
        if (ttl > 0) {
            return this.exec("setex", ttl, value).then(() => value);
        } else {
            return this.exec("set", value).then(() => value);
        }
    }

    /**
     * @returns {Promise<string>}
     */
    get() {
        return this.exec("get");
    }

    /**
     * @param {number} start 
     * @param {number} end 
     */
    slice(start, end = undefined) {
        return this.exec(
            "getrange",
            start,
            isVoid(end) ? -1 : (end === 0 ? 0 : end - 1)
        );
    }

    /**
     * @param {string} str
     * @returns {Promise<boolean>}
     */
    startsWith(str) {
        return this.slice(0, str.length).then(res => res === str);
    }

    /**
     * @param {string} str
     * @returns {Promise<boolean>}
     */
    endsWith(str) {
        return this.slice(-str.length).then(res => res === str);
    }

    /**
     * @param {string} str 
     * @returns {Promise<string>}
     */
    append(str) {
        return this.exec("append", str).then(() => this.get());
    }

    /**
     * @param {number} [increment]
     * @returns {Promise<string>}
     */
    increase(increment = undefined) {
        if (isVoid(increment)) {
            return this.exec("incr").then(String); // type fix
        } else if (isFloat(increment)) {
            return this.exec("incrbyfloat", increment).then(String);
        } else {
            return this.exec("incrby", increment).then(String);
        }
    }

    /**
     * @param {number} [decrement]
     * @returns {Promise<string>}
     */
    decrease(decrement = undefined) {
        if (isVoid(decrement)) {
            return this.exec("decr").then(String); // type fix
        } else if (isFloat(decrement)) {
            // There is no 'decrbyfloat' in redis, so incrbyfloat to the
            // negative value instead.
            return this.exec("incrbyfloat", -decrement).then(String);
        } else {
            return this.exec("decrby", decrement).then(String);
        }
    }

    /**
     * @returns {Promise<number>} 
     */
    length() {
        return this.exec("strlen");
    }
}

exports.default = redis => createFacadeType("string", RedisString, redis);