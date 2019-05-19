"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

exports.isVoid = (value) => value === null || value === undefined;

exports.isFloat = (num) => typeof num === "number" && num % 1 !== 0;

exports.isRedisV5 = (redis) => parseInt(redis.server_info.redis_version) >= 5;

function exec(cmd, ...args) {
    return new Promise((resolve, reject) => {
        this[cmd](...args, (err, res) => {
            err ? reject(err) : resolve(res);
        });
    });
}
exports.exec = exec;

/**
 * @returns {{[op: string]: (...args) => Promise<string|number|string[]>}}
 */
exports.createRedisOperator = (redis) => {
    return {
        has: (key) => exec.call(redis, "exists", key).then(res => res > 0),
        delete: (key) => exec.call(redis, "del", key).then(res => res > 0),
        typeof: (key) => exec.call(redis, "type", key),
        exec: exec.bind(redis)
    };
};

/**
 * @param {string} type
 * @param {Function} ctor
 * @returns {Function}
 */
exports.createFacadeType = (type, ctor, redis) => {
    // Creates a wrapped constructor to prevent conflict, so that every time
    // calling `createFacadeType` with a new redis connection will refer to the
    // new constructor.
    let facade = ctor.bind(void 0, redis);

    Object.defineProperty(facade, "prototype", {
        value: type.prototype
    });

    facade.of = function (key) {
        return new facade(key);
    };

    facade.has = function (key) {
        return exec.call(redis, "type", key).then(res => res === type);
    };

    return facade;
};