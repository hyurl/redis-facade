"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

const {
    key: _key,
    redis: _redis,
    CompoundType,
    createFactory
} = require("./util");

class RedisList extends CompoundType {
    /**
     * @returns {Promise<string>}
     */
    shift() {
        return new Promise((resolve, reject) => {
            this[_redis].lpop(this[_key], (err, result) => {
                err ? reject(err) : resolve(result);
            });
        });
    }

    /**
     * @param {string} value
     * @returns {Promise<number>}
     */
    unshift(...values) {
        return new Promise((resolve, reject) => {
            this[_redis].lpush(this[_key], ...values.reverse(), (err, result) => {
                err ? reject(err) : resolve(result);
            });
        });
    }

    /**
     * @returns {Promise<string>}
     */
    pop() {
        return new Promise((resolve, reject) => {
            this[_redis].rpop(this[_key], (err, result) => {
                err ? reject(err) : resolve(result);
            });
        });
    }

    /**
     * @param {string} value
     * @returns {Promise<number>} 
     */
    push(...values) {
        return new Promise((resolve, reject) => {
            this[_redis].rpush(this[_key], ...values, (err, result) => {
                err ? reject(err) : resolve(result);
            });
        });
    }

    /**
     * @param {number} index 
     * @param {string} [value] 
     * @returns {Promise<string>}
     */
    valueAt(index, value) {
        return new Promise((resolve, reject) => {
            if (value === undefined) {
                this[_redis].lindex(this[_key], index, (err, result) => {
                    err ? reject(err) : resolve(result);
                });
            } else {
                this[_redis].lset(this[_key], index, value, err => {
                    err ? reject(err) : resolve(value);
                });
            }
        });
    }

    /**
     * @returns {Promise<string[]>}
     */
    values() {
        return new Promise((resolve, reject) => {
            this[_redis].lrange(this[_key], 0, -1, (err, result) => {
                err ? reject(err) : resolve(result);
            });
        });
    }

    /**
     * @param {number} start 
     * @param {number} [end]
     * @returns {Promise<string[]>} 
     */
    slice(start, end = 0) {
        return new Promise((resolve, reject) => {
            this[_redis].ltrim(this[_key], start, end - 1, err => {
                err ? reject(err) : resolve();
            });
        }).then(this.values.bind(this));
    }

    /**
     * @param {number} start 
     * @param {number} [count]
     * @returns {Promise<string[]>} 
     */
    splice(start, count = 1) {
        return this.values().then(values => {
            let spliced = values.splice(start, count);
            return this.clear()
                .then(() => this.push(...values))
                .then(() => spliced);
        });
    }

    /**
     * @returns {Promise<number>}
     */
    getLength() {
        return new Promise((resolve, reject) => {
            this[_redis].llen(this[_key], (err, result) => {
                err ? reject(err) : resolve(result);
            });
        });
    }
}

exports.default = function factory(redis) {
    return createFactory(RedisList, redis);
};