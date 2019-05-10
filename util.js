"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

exports.redis = Symbol("RedisClient");
exports.key = Symbol("RedisDataKey");

exports.createFactory = (type, redis) => {
    ctor = type.bind(void 0, redis);

    ctor.prototype = type.prototype;
    ctor.of = function (name) {
        return new ctor(name);
    }

    return ctor;
};

exports.drop = (type, key) => {
    return new Promise((resolve, reject) => {
        type[exports.redis].del(key, (err, result) => {
            err ? reject(err) : resolve();
        });
    });
};

exports.CompoundType = class CompoundType {
    constructor(redis, name) {
        this[exports.redis] = redis;
        this[exports.key] = name;
    }

    /**
     * @param {string} key
     * @returns {Promise<void>}
     */
    clear() {
        return drop(this, this[exports.key]);
    }
};