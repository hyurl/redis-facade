"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

const { RedisFacade, key } = require("./Facade");
const { createFacadeCtor, isVoid } = require("./util");

class RedisList extends RedisFacade {
    /**
     * @returns {Promise<string>}
     */
    shift() {
        return this._emitCommand("lpop");
    }

    /**
     * @param {string} value
     * @returns {Promise<number>}
     */
    unshift(...values) {
        return this._emitCommand("lpush", ...values.reverse());
    }

    /**
     * @returns {Promise<string>}
     */
    pop() {
        return this._emitCommand("rpop");
    }

    /**
     * @param {string} value
     * @returns {Promise<number>} 
     */
    push(...values) {
        return this._emitCommand("rpush", ...values);
    }

    /**
     * @param {string} value 
     * @returns {Promise<boolean>}
     */
    includes(value) {
        return this.indexOf(value).then(index => index >= 0);
    }

    /**
     * @param {string} value 
     * @returns {Promise<number>}
     */
    indexOf(value) {
        return this.values().then(values => values.indexOf(value));
    }

    /**
     * @param {number} index 
     * @param {string} [value] 
     * @returns {Promise<string>}
     */
    valueAt(index, value) {
        if (isVoid(value)) {
            return this._emitCommand("lindex", index);
        } else {
            return this._emitCommand("lset", index, value).then(() => value);
        }
    }

    /**
     * @returns {Promise<string[]>}
     */
    values() {
        return this.slice(0);
    }

    /**
     * @param {number} start 
     * @param {number} [end]
     * @returns {Promise<string[]>} 
     */
    slice(start, end = 0) {
        return this._emitCommand("lrange", start, end - 1);
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
     * @param {"asc"|"desc"} order 
     * @returns {Promise<string[]>}
     */
    sort(order = "asc") {
        return this._emitCommand("sort", "alpha", order, `store ${this[key]}`)
            .then(() => this.values());
    }

    /**
     * @returns {Promise<string[]>}
     */
    reverse() {
        return this.values().then(values => {
            return this.clear().then(() => values.reverse());
        }).then(values => {
            return this.push(...values).then(() => values);
        });
    }

    /**
     * @returns {Promise<number>}
     */
    getLength() {
        return this._emitCommand("llen");
    }
}

exports.default = redis => createFacadeCtor(RedisList, redis);