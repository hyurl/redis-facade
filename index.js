"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

const { RedisString } = require("./String");
const { default: createListCtor } = require("./List");
const { default: createSetCtor } = require("./Set");
const { default: createHashMapCtor } = require("./HashMap");

function createTypeInterface(conn) {
    return {
        String: new RedisString(conn),
        List: createListCtor(conn),
        Set: createSetCtor(conn),
        HashMap: createHashMapCtor(conn)
    };
}

exports.default = createTypeInterface;