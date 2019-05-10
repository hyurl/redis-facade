"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

const {
    key: _key,
    redis: _redis,
    CompoundType,
    createFactory
} = require("./util");

class RedisHashMap extends CompoundType {
    /**
     * @param {string} key 
     * @param {string} value
     * @returns {Promise<this>} 
     */
    set(key, value) {
        return new Promise((resolve, reject) => {
            this[_redis].hset(this[_key], key, value, err => {
                err ? reject(err) : resolve(this);
            });
        });
    }

    /**
     * @param {string} key 
     * @returns {Promise<boolean>}
     */
    delete(key) {
        return new Promise((resolve, reject) => {
            this[_redis].hdel(this[_key], key, (err, result) => {
                err ? reject(err) : resolve(result > 0);
            });
        });
    }

    /**
     * @param {string} key
     * @returns {Promise<string>} 
     */
    get(key) {
        return new Promise((resolve, reject) => {
            this[_redis].hget(this[_key], key, (err, result) => {
                err ? reject(err) : resolve(result);
            });
        });
    }

    /**
     * @param {string} key
     * @returns {Promise<boolean>} 
     */
    has(key) {
        return new Promise((resolve, reject) => {
            this[_redis].hexists(this[_key], key, (err, result) => {
                err ? reject(err) : resolve(result > 0);
            });
        });
    }

    /**
     * @returns {Promise<string[]>}
     */
    keys() {
        return new Promise((resolve, reject) => {
            this[_redis].hkeys(this[_key], (err, result) => {
                err ? reject(err) : resolve(result);
            });
        });
    }

    /**
     * @returns {Promise<string[]>}
     */
    values() {
        return new Promise((resolve, reject) => {
            this[_redis].hvals(this[_key], (err, result) => {
                err ? reject(err) : resolve(result);
            });
        });
    }

    /**
     * @returns {Promise<{[key: string]: string}>}
     */
    pairs() {
        return new Promise((resolve, reject) => {
            this[_redis].hgetall(this[_key], (err, result) => {
                err ? reject(err) : resolve(result);
            });
        });
    }

    clear() {
        
    }

    /**
     * @returns {Promise<number>}
     */
    getSize() {
        return new Promise((resolve, reject) => {
            this[_redis].hlen(this[_key], (err, result) => {
                err ? reject(err) : resolve(result);
            });
        });
    }
}

exports.default = function factory(redis) {
    return createFactory(RedisHashMap, redis);
};