"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

const { redis: _redis, drop } = require("./util");

class RedisString {
    constructor(redis) {
        this[_redis] = redis;
    }

    /**
     * @param {string} key 
     * @param {string} value 
     * @param {number} [ttl]
     * @returns {Promise<string>} 
     */
    set(key, value, ttl) {
        return new Promise((resolve, reject) => {
            if (ttl > 0) {
                this[_redis].setex(key, ttl, value, (err) => {
                    err ? reject(err) : resolve(value);
                });
            } else {
                this[_redis].set(key, value, (err) => {
                    err ? reject(err) : resolve(value);
                });
            }
        });
    }

    /**
     * @param {string} key 
     * @returns {Promise<string>}
     */
    get(key) {
        return new Promise((resolve, reject) => {
            this[_redis].get(key, (err, result) => {
                err ? reject(err) : resolve(result);
            });
        });
    }

    /**
     * @param {string} key 
     * @param {number} [value]
     * @returns {Promise<string>}
     */
    incr(key, value) {
        return new Promise((resolve, reject) => {
            if (value === undefined) {
                this[_redis].incr(key, (err, result) => {
                    err ? reject(err) : resolve(result);
                });
            } else {
                this[_redis].incrby(key, value, (err, result) => {
                    err ? reject(err) : resolve(result);
                });
            }
        }).then(String); // type fix
    }

    /**
     * @param {string} key 
     * @param {number} [value]
     * @returns {Promise<string>}
     */
    decr(key, value) {
        return new Promise((resolve, reject) => {
            if (value === undefined) {
                this[_redis].decr(key, (err, result) => {
                    err ? reject(err) : resolve(result);
                });
            } else {
                this[_redis].decrby(key, value, (err, result) => {
                    err ? reject(err) : resolve(result);
                });
            }
        }).then(String); // type fix
    }

    /**
     * @param {string} key
     * @returns {Promise<boolean>}
     */
    delete(key) {
        return drop(this, key);
    }
}

exports.RedisString = RedisString;