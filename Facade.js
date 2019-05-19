const { exec } = require("./util");

const _key = exports.key = Symbol("RedisDataKey");
const _redis = exports.redis = Symbol("RedisClient");

class RedisFacade {
    constructor(redis, key) {
        this[_redis] = redis;
        this[_key] = key;
    }

    /**
     * @protected
     * @param {string} cmd 
     * @param  {...any} args 
     * @returns {Promise<string|number|string[]>}
     */
    exec(cmd, ...args) {
        return exec.call(this[_redis], cmd, this[_key], ...args);
    }

    /**
     * @param {number} seconds 
     * @returns {Promise<number>}
     */
    setTTL(seconds) {
        return this.exec("expire", seconds).then(res => res > 0 ? seconds : -1);
    }

    /**
     * @returns {Promise<number>}
     */
    getTTL() {
        return this.exec("ttl");
    }

    /**
     * @param {string} key
     * @returns {Promise<void>}
     */
    clear() {
        return this.exec("del").then(() => void 0);
    }
}

exports.RedisFacade = RedisFacade;