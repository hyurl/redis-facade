import * as assert from "assert";
import * as redis from "redis";
import createDataInterface from "..";

let con = redis.createClient();
let data = createDataInterface(con);

describe("RedisString", () => {
    it("should set a value with specified key as expected", async () => {
        let value = await data.String.set("foo", "Hello, World!");
        assert.strictEqual(value, "Hello, World!");
    });

    it("should get a value according to a specified key as expected", async () => {
        let value = await data.String.get("foo");
        assert.strictEqual(value, "Hello, World!");
    });

    it("should delete a value according to a specified key as expected", async () => {
        let ok = await data.String.delete("foo");
        let value = await data.String.get("foo");
        assert(ok);
        assert.strictEqual(value, null);
    });;

    it("should increase a value according to a specified key as expected", async () => {
        let value = await data.String.set("foo", "123");
        let _value = await data.String.incr("foo");
        let __value = await data.String.incr("foo", 2);
        await data.String.delete("foo");
        assert.strictEqual(value, "123");
        assert.strictEqual(_value, "124");
        assert.strictEqual(__value, "126");
    });

    it("should decrease a value according to a specified key as expected", async () => {
        let value = await data.String.set("foo", "123");
        let _value = await data.String.decr("foo");
        let __value = await data.String.decr("foo", 2);
        await data.String.delete("foo");
        assert.strictEqual(value, "123");
        assert.strictEqual(_value, "122");
        assert.strictEqual(__value, "120");
    });
});

describe("RedisList", () => {
    let list = data.List.of("foo");

    it("should push a value into the list as expected", async () => {
        let count = await list.push("Hello");
        assert.strictEqual(count, 1);
    });

    it("should push multiple values into the list as expected", async () => {
        let count = await list.push("World", "Hi", "Ayon", "Cool");
        assert.strictEqual(count, 5);
    });

    it("should pop the last item of the list as expected", async () => {
        let value = await list.pop();
        assert.strictEqual(value, "Cool");
    });

    it("should shift the first item of the list as expected", async () => {
        let value = await list.shift();
        assert.strictEqual(value, "Hello");
    });

    it("should unshift a value into the list as expected", async () => {
        let count = await list.unshift("Hello");
        assert.strictEqual(count, 4);
    });

    it("should unshift multiple values into the list as expected", async () => {
        let count = await list.unshift("Good", "Morning");
        assert.strictEqual(count, 6);
    });

    it("should get a value at a specified index of the list as expected", async () => {
        let value0 = await list.valueAt(0);
        let value1 = await list.valueAt(1);
        assert.deepStrictEqual([value0, value1], ["Good", "Morning"]);
    });

    it("should get all values from the list as expected", async () => {
        let values = await list.values();
        assert.deepStrictEqual(values, ["Good", "Morning", "Hello", "World", "Hi", "Ayon"]);
    });

    it("should slice the list with only start position as expected", async () => {
        let values = await list.slice(1);
        assert.deepStrictEqual(values, ["Morning", "Hello", "World", "Hi", "Ayon"]);
    });

    it("should slice the list with both start and end position as expected", async () => {
        let values = await list.slice(1, -1);
        assert.deepStrictEqual(values, ["Hello", "World", "Hi"]);
    });

    it("should slice the list with minus end position as expected", async () => {
        let values = await list.slice(0, -1);
        assert.deepStrictEqual(values, ["Hello", "World"]);
    });

    it("should splice a value and return it from the list as expected", async () => {
        let values = await list.splice(0);
        assert.deepStrictEqual(values, ["Hello"]);
    });

    it("should splice multiple values and return them from the list as expected", async () => {
        await list.unshift("Hello", "Good", "Morning");
        let values = await list.splice(1, 2);
        assert.deepStrictEqual(values, ["Good", "Morning"]);
    });

    it("should get the length of the list as expected", async () => {
        let length = await list.getLength();
        assert.strictEqual(length, 2);
    });

    it("should use the same list if provide the same name as expected", async () => {
        let _list = await data.List.of("foo");
        let values = await list.values();
        let _values = await _list.values();
        assert.deepStrictEqual(values, _values);
    });

    it("should clear the list as expected", async () => {
        let res = await list.clear();
        let values = await list.values();
        assert.strictEqual(res, undefined);
        assert.deepStrictEqual(values, []);
    });
});

describe("RedisSet", () => {
    let set = data.Set.of("foo");

    it("should add value into the set as expected", async () => {
        let _set = await set.add("Hello");
        let size = await set.getSize();
        assert.strictEqual(_set, set);
        assert.strictEqual(size, 1);
    });

    it("should not add duplicate value into the set as expected", async () => {
        await set.add("Hello");
        let size = await set.getSize();
        assert.strictEqual(size, 1);
    });

    it("should delete a value from the set as expected", async () => {
        await set.delete("Hello");
        let size = await set.getSize();
        assert.strictEqual(size, 0);
    });

    it("should check if a value exists in the set as expected", async () => {
        await set.add("Hello");
        let exists = await set.has("Hello");
        let notExists = await set.has("World");
        assert.ok(exists);
        assert.ok(!notExists);
    });

    it("should get all values of the set as expected", async () => {
        await set.add("World");
        let values = await set.values();
        assert.deepStrictEqual(values, ["Hello", "World"]);
    });

    it("should get the size of the set as expected", async () => {
        let size = await set.getSize();
        assert.strictEqual(size, 2);
    });

    it("should use the same set if provided the same name", async () => {
        let _set = data.Set.of("foo");
        let values = await set.values();
        let _values = await _set.values();
        assert.deepStrictEqual(values, _values);
    });

    it("should cleat the set as expected", async () => {
        await set.clear();
        let size = await set.getSize();
        assert.strictEqual(size, 0);
    });
});