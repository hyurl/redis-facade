const _redis = exports.redis = Symbol("RedisClient");
const _key = exports.key = Symbol("RedisDataKey");

class RedisFacade {
    constructor(redis, key) {
        this[_redis] = redis;
        this[_key] = key;
    }

    /**
     * 
     * @param {string} cmd 
     * @param  {...any} args 
     * @returns {Promise<string|number|string[]>}
     */
    _emitCommand(cmd, ...args) {
        return new Promise((resolve, reject) => {
            this[_redis][cmd](this[_key], ...args, (err, result) => {
                err ? reject(err) : resolve(result);
            });
        });
    }

    /**
     * @param {number} seconds 
     * @returns {Promise<void>}
     */
    setTTL(seconds) {
        return this._emitCommand("expire", seconds).then(() => void 0);
    }

    /**
     * @returns {Promise<number>}
     */
    getTTL() {
        return this._emitCommand("ttl");
    }

    /**
     * @param {string} key
     * @returns {Promise<void>}
     */
    clear() {
        return this._emitCommand("del").then(() => void 0);
    }
}

exports.RedisFacade = RedisFacade;