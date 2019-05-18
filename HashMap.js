"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

const { RedisFacade } = require("./Facade");
const { createFacadeType, isFloat } = require("./util");

class RedisHashMap extends RedisFacade {
    /**
     * @param {string|{[key: string]: string}} key 
     * @param {string} [value]
     * @returns {Promise<this>} 
     */
    set(key, value = undefined) {
        if (typeof key === "object") {
            return this.exec("hmset", key).then(() => this);
        } else {
            return this.exec("hset", key, value).then(() => this);
        }
    }

    /**
     * @param {string} key 
     * @returns {Promise<boolean>}
     */
    delete(key) {
        return this.exec("hdel", key).then(res => res > 0);
    }

    /**
     * @param {string} key
     * @returns {Promise<string>} 
     */
    get(key) {
        return this.exec("hget", key);
    }

    /**
     * @param {string} key
     * @returns {Promise<boolean>} 
     */
    has(key) {
        return this.exec("hexists", key).then(res => res > 0);
    }

    /**
     * @returns {Promise<string[]>}
     */
    keys() {
        return this.exec("hkeys");
    }

    /**
     * @returns {Promise<string[]>}
     */
    values() {
        return this.exec("hvals");
    }

    /**
     * @returns {Promise<{[key: string]: string}>}
     */
    pairs() {
        return this.exec("hgetall");
    }

    /**
     * @returns {Promise<number>}
     */
    size() {
        return this.exec("hlen");
    }

    /**
     * @param {string} key 
     * @param {number} [increment] 
     * @returns {Promise<string>}
     */
    increase(key, increment = 1) {
        if (isFloat(increment)) {
            return this.exec("hincrbyfloat", key, increment).then(String);
        } else {
            return this.exec("hincrby", key, increment).then(String);
        }
    }

    /**
     * @param {string} key 
     * @param {number} [decrement] 
     * @returns {Promise<string>}
     */
    decrease(key, decrement = 1) {
        return this.increase(key, -decrement);
    }
}

exports.default = redis => createFacadeType("hash", RedisHashMap, redis);