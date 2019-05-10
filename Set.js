"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

const {
    key: _key,
    redis: _redis,
    CompoundType,
    createFactory
} = require("./util");

class RedisSet extends CompoundType {
    /**
     * @param {string} value 
     * @returns {Promise<this>}
     */
    add(value) {
        return new Promise((resolve, reject) => {
            this[_redis].sadd(this[_key], value, err => {
                err ? reject(err) : resolve(this);
            })
        });
    }

    /**
     * 
     * @param {string} value
     * @returns {Promise<boolean>} 
     */
    delete(value) {
        return new Promise((resolve, reject) => {
            this[_redis].srem(this[_key], value, (err, result) => {
                err ? reject(err) : resolve(result > 0);
            })
        });
    }

    /**
     * @returns {Promise<number>}
     */
    getSize() {
        return new Promise((resolve, reject) => {
            this[_redis].scard(this[_key], (err, result) => {
                err ? reject(err) : resolve(result);
            });
        });
    }

    /**
     * @param {string} value
     * @returns {Promise<boolean>} 
     */
    has(value) {
        return new Promise((resolve, reject) => {
            this[_redis].sismember(this[_key], value, (err, result) => {
                err ? reject(err) : resolve(result > 0);
            });
        });
    }

    /**
     * @returns {Promise<string[]>}
     */
    values() {
        return new Promise((resolve, reject) => {
            this[_redis].smembers(this[_key], (err, result) => {
                err ? reject(err) : resolve(result);
            });
        });
    }
}

exports.default = function factory(redis) {
    return createFactory(RedisSet, redis);
};