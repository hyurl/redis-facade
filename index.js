"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

const { key, redis } = require("./Facade");
const { default: createStringFacade } = require("./String");
const { default: createListFacade } = require("./List");
const { default: createSetFacade } = require("./Set");
const { default: createSortedSetFacade } = require("./SortedSet");
const { default: createHashMapFacade } = require("./HashMap");
const { createRedisOperator } = require("./util");

function createRedisFacade(redis) {
    return Object.assign(createRedisOperator(redis), {
        String: createStringFacade(redis),
        List: createListFacade(redis),
        Set: createSetFacade(redis),
        SortedSet: createSortedSetFacade(redis),
        HashMap: createHashMapFacade(redis)
    });
}

exports.default = createRedisFacade;
exports.key = key;
exports.redis = redis;