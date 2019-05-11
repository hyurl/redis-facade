"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const assert = require("assert");
const redis = require("redis");
const __1 = require("..");
let con = redis.createClient();
let data = __1.default(con);
describe("RedisString", () => {
    it("should set a value with specified key as expected", () => tslib_1.__awaiter(this, void 0, void 0, function* () {
        let value = yield data.String.set("foo", "Hello, World!");
        assert.strictEqual(value, "Hello, World!");
    }));
    it("should get a value according to a specified key as expected", () => tslib_1.__awaiter(this, void 0, void 0, function* () {
        let value = yield data.String.get("foo");
        assert.strictEqual(value, "Hello, World!");
    }));
    it("should delete a value according to a specified key as expected", () => tslib_1.__awaiter(this, void 0, void 0, function* () {
        let ok = yield data.String.delete("foo");
        let value = yield data.String.get("foo");
        assert(ok);
        assert.strictEqual(value, null);
    }));
    ;
    it("should increase a value according to a specified key as expected", () => tslib_1.__awaiter(this, void 0, void 0, function* () {
        let value = yield data.String.set("foo", "123");
        let _value = yield data.String.incr("foo");
        let __value = yield data.String.incr("foo", 2);
        yield data.String.delete("foo");
        assert.strictEqual(value, "123");
        assert.strictEqual(_value, "124");
        assert.strictEqual(__value, "126");
    }));
    it("should decrease a value according to a specified key as expected", () => tslib_1.__awaiter(this, void 0, void 0, function* () {
        let value = yield data.String.set("foo", "123");
        let _value = yield data.String.decr("foo");
        let __value = yield data.String.decr("foo", 2);
        yield data.String.delete("foo");
        assert.strictEqual(value, "123");
        assert.strictEqual(_value, "122");
        assert.strictEqual(__value, "120");
    }));
});
describe("RedisList", () => {
    let list = data.List.of("foo");
    it("should push a value into the list as expected", () => tslib_1.__awaiter(this, void 0, void 0, function* () {
        let count = yield list.push("Hello");
        assert.strictEqual(count, 1);
    }));
    it("should push multiple values into the list as expected", () => tslib_1.__awaiter(this, void 0, void 0, function* () {
        let count = yield list.push("World", "Hi", "Ayon", "Cool");
        assert.strictEqual(count, 5);
    }));
    it("should pop the last item of the list as expected", () => tslib_1.__awaiter(this, void 0, void 0, function* () {
        let value = yield list.pop();
        assert.strictEqual(value, "Cool");
    }));
    it("should shift the first item of the list as expected", () => tslib_1.__awaiter(this, void 0, void 0, function* () {
        let value = yield list.shift();
        assert.strictEqual(value, "Hello");
    }));
    it("should unshift a value into the list as expected", () => tslib_1.__awaiter(this, void 0, void 0, function* () {
        let count = yield list.unshift("Hello");
        assert.strictEqual(count, 4);
    }));
    it("should unshift multiple values into the list as expected", () => tslib_1.__awaiter(this, void 0, void 0, function* () {
        let count = yield list.unshift("Good", "Morning");
        assert.strictEqual(count, 6);
    }));
    it("should get a value at a specified index of the list as expected", () => tslib_1.__awaiter(this, void 0, void 0, function* () {
        let value0 = yield list.valueAt(0);
        let value1 = yield list.valueAt(1);
        assert.deepStrictEqual([value0, value1], ["Good", "Morning"]);
    }));
    it("should get all values from the list as expected", () => tslib_1.__awaiter(this, void 0, void 0, function* () {
        let values = yield list.values();
        assert.deepStrictEqual(values, ["Good", "Morning", "Hello", "World", "Hi", "Ayon"]);
    }));
    it("should slice the list with only start position as expected", () => tslib_1.__awaiter(this, void 0, void 0, function* () {
        let values = yield list.slice(1);
        assert.deepStrictEqual(values, ["Morning", "Hello", "World", "Hi", "Ayon"]);
    }));
    it("should slice the list with both start and end position as expected", () => tslib_1.__awaiter(this, void 0, void 0, function* () {
        let values = yield list.slice(1, -1);
        assert.deepStrictEqual(values, ["Hello", "World", "Hi"]);
    }));
    it("should slice the list with minus end position as expected", () => tslib_1.__awaiter(this, void 0, void 0, function* () {
        let values = yield list.slice(0, -1);
        assert.deepStrictEqual(values, ["Hello", "World"]);
    }));
    it("should splice a value and return it from the list as expected", () => tslib_1.__awaiter(this, void 0, void 0, function* () {
        let values = yield list.splice(0);
        assert.deepStrictEqual(values, ["Hello"]);
    }));
    it("should splice multiple values and return them from the list as expected", () => tslib_1.__awaiter(this, void 0, void 0, function* () {
        yield list.unshift("Hello", "Good", "Morning");
        let values = yield list.splice(1, 2);
        assert.deepStrictEqual(values, ["Good", "Morning"]);
    }));
    it("should get the length of the list as expected", () => tslib_1.__awaiter(this, void 0, void 0, function* () {
        let length = yield list.getLength();
        assert.strictEqual(length, 2);
    }));
    it("should use the same list if provide the same name as expected", () => tslib_1.__awaiter(this, void 0, void 0, function* () {
        let _list = yield data.List.of("foo");
        let values = yield list.values();
        let _values = yield _list.values();
        assert.deepStrictEqual(values, _values);
    }));
    it("should clear the list as expected", () => tslib_1.__awaiter(this, void 0, void 0, function* () {
        let res = yield list.clear();
        let values = yield list.values();
        assert.strictEqual(res, undefined);
        assert.deepStrictEqual(values, []);
    }));
});
describe("RedisSet", () => {
    let set = data.Set.of("foo");
    it("should add value into the set as expected", () => tslib_1.__awaiter(this, void 0, void 0, function* () {
        let _set = yield set.add("Hello");
        let size = yield set.getSize();
        assert.strictEqual(_set, set);
        assert.strictEqual(size, 1);
    }));
    it("should not add duplicate value into the set as expected", () => tslib_1.__awaiter(this, void 0, void 0, function* () {
        yield set.add("Hello");
        let size = yield set.getSize();
        assert.strictEqual(size, 1);
    }));
    it("should delete a value from the set as expected", () => tslib_1.__awaiter(this, void 0, void 0, function* () {
        yield set.delete("Hello");
        let size = yield set.getSize();
        assert.strictEqual(size, 0);
    }));
    it("should check if a value exists in the set as expected", () => tslib_1.__awaiter(this, void 0, void 0, function* () {
        yield set.add("Hello");
        let exists = yield set.has("Hello");
        let notExists = yield set.has("World");
        assert.ok(exists);
        assert.ok(!notExists);
    }));
    it("should get all values of the set as expected", () => tslib_1.__awaiter(this, void 0, void 0, function* () {
        yield set.add("World");
        let values = yield set.values();
        assert.deepStrictEqual(values, ["Hello", "World"]);
    }));
    it("should get the size of the set as expected", () => tslib_1.__awaiter(this, void 0, void 0, function* () {
        let size = yield set.getSize();
        assert.strictEqual(size, 2);
    }));
    it("should use the same set if provided the same name", () => tslib_1.__awaiter(this, void 0, void 0, function* () {
        let _set = data.Set.of("foo");
        let values = yield set.values();
        let _values = yield _set.values();
        assert.deepStrictEqual(values, _values);
    }));
    it("should cleat the set as expected", () => tslib_1.__awaiter(this, void 0, void 0, function* () {
        yield set.clear();
        let size = yield set.getSize();
        assert.strictEqual(size, 0);
    }));
});
//# sourceMappingURL=index.js.map