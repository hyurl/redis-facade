"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

const { RedisFacade, key } = require("./Facade");
const { createFacadeType, isVoid } = require("./util");

class RedisList extends RedisFacade {
    /**
     * @returns {Promise<string>}
     */
    shift() {
        return this.exec("lpop");
    }

    /**
     * @param {string} value
     * @returns {Promise<number>}
     */
    unshift(...values) {
        return this.exec("lpush", ...values.reverse());
    }

    /**
     * @returns {Promise<string>}
     */
    pop() {
        return this.exec("rpop");
    }

    /**
     * @param {string} value
     * @returns {Promise<number>} 
     */
    push(...values) {
        return this.exec("rpush", ...values);
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
    valueAt(index, value = undefined) {
        if (isVoid(value)) {
            return this.exec("lindex", index);
        } else {
            return this.exec("lset", index, value).then(() => value);
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
    slice(start, end = undefined) {
        return this.exec(
            "lrange",
            start,
            isVoid(end) ? -1 : (end === 0 ? 0 : end - 1)
        );
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
     * @param {"asc"|"desc"} [order]
     * @returns {Promise<string[]>}
     */
    sort(order = "asc") {
        return this.exec("sort", "alpha", order, `store ${this[key]}`)
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
    length() {
        return this.exec("llen");
    }
}

exports.default = redis => createFacadeType("list", RedisList, redis);