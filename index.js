"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

const { default: createStringFacade } = require("./String");
const { default: createListFacade } = require("./List");
const { default: createSetFacade } = require("./Set");
const { default: createSortedSetFacade } = require("./SortedSet");
const { default: createHashMapFacade } = require("./HashMap");

function createRedisFacade(redis) {
    let emitCommand = (cmd, ...args) => {
        return new Promise((resolve, reject) => {
            redis[cmd](...args, (err, res) => {
                err ? reject(err) : resolve(res > 0);
            });
        });
    };

    return {
        has: (key) => emitCommand("exists", key),
        delete: (key) => emitCommand("del", key),
        String: createStringFacade(redis),
        List: createListFacade(redis),
        Set: createSetFacade(redis),
        SortedSet: createSortedSetFacade(redis),
        HashMap: createHashMapFacade(redis)
    };
}

exports.default = createRedisFacade;