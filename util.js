"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

exports.isVoid = (value) => value === null || value === undefined;

exports.isFloat = (num) => typeof num === "number" && num % 1 !== 0;

exports.createRedisOperator = (redis) => {
    let exec = (cmd, ...args) => {
        return new Promise((resolve, reject) => {
            redis[cmd](...args, (err, res) => {
                err ? reject(err) : resolve(res);
            });
        });
    };

    return {
        has: (key) => exec("exists", key).then(res => res > 0),
        delete: (key) => exec("del", key).then(res => res > 0),
        typeof: (key) => exec("type", key),
        exec
    };
};

/**
 * @param {string} type
 * @param {Function} ctor
 * @returns {Function}
 */
exports.createFacadeType = (type, ctor, redis) => {
    let operator = exports.createRedisOperator(redis);
    let facade = ctor.bind(void 0, operator);

    Object.defineProperty(facade, "prototype", {
        value: type.prototype
    });

    facade.of = function (key) {
        return new facade(key);
    };

    facade.has = function (key) {
        return operator.typeof(key).then(res => res === type);
    };

    return facade;
};