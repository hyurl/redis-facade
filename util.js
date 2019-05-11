"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

exports.redis = Symbol("RedisClient");
exports.key = Symbol("RedisDataKey");

exports.createFactory = (type, redis) => {
    let ctor = type.bind(void 0, redis);

    Object.defineProperty(ctor, "prototype", {
        value: type.prototype
    });
    ctor.of = function (name) {
        return new ctor(name);
    };

    return ctor;
};

exports.drop = (type, key) => {
    return new Promise((resolve, reject) => {
        type[exports.redis].del(key, (err, result) => {
            err ? reject(err) : resolve(result > 0);
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
        return exports.drop(this, this[exports.key]).then(() => void 0);
    }
};