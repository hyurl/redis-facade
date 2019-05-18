const _operator = Symbol("RedisOperator");
const _key = exports.key = Symbol("RedisDataKey");

class RedisFacade {
    constructor(operator, key) {
        this[_operator] = operator;
        this[_key] = key;
    }

    /**
     * @protected
     * @param {string} cmd 
     * @param  {...any} args 
     * @returns {Promise<string|number|string[]>}
     */
    exec(cmd, ...args) {
        return this[_operator].exec(cmd, this[_key], ...args);
    }

    /**
     * @param {number} seconds 
     * @returns {Promise<void>}
     */
    setTTL(seconds) {
        return this.exec("expire", seconds).then(() => void 0);
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