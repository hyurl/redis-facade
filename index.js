"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

const { RedisString } = require("./String");
const { default: createListCtor } = require("./List");
const { default: createHashMapCtor } = require("./HashMap").default;
const { default: createSetCtor } = require("./Set").default;

function createTypeInterface(conn) {
    let conn;

    return {
        String: RedisString.use(conn),
        List: createListCtor(conn),
        HashMap: createHashMapCtor(conn),
        Set: createSetCtor(conn)
    };
}

exports.default = createTypeInterface;