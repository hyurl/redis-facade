"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

exports.isVoid = (value) => value === null || value === undefined;

exports.isFloat = (num) => typeof num === "number" && num % 1 !== 0;

exports.createFacadeCtor = (type, redis) => {
    let ctor = type.bind(void 0, redis);

    Object.defineProperty(ctor, "prototype", {
        value: type.prototype
    });
    ctor.of = function (key) {
        return new ctor(key);
    };

    return ctor;
};