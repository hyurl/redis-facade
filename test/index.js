const co = require("co");
const assert = require("assert");
const { createClient } = require("redis");
const createFacade = require("..").default;

let redis = createFacade(createClient());

/**
 * @param {number} timeout
 * @returns {Promise<void>} 
 */
function sleep(timeout) {
    return new Promise(resolve => setTimeout(resolve, timeout));
}

describe("RedisString", () => {
    let str = redis.String.of("foo");

    it("should set the string value", () => co(function*() {
        assert.strictEqual(yield str.set("Hello, World!"), "Hello, World!");
        assert.strictEqual(yield redis.has("foo"), true);
    }));

    it("should get the string value", () => co(function*() {
        assert.strictEqual(yield str.get(), "Hello, World!");
    }));

    it("should clear the string", () => co(function*() {
        assert.strictEqual(yield str.clear(), undefined);
        assert.strictEqual(yield str.get(), null);
        assert.strictEqual(yield redis.has("foo"), false);
    }));

    it("should set the string value with TTL", () => co(function*() {
        assert.strictEqual(yield str.set("Hello, World!", 1), "Hello, World!");
        yield sleep(1005);
        assert.strictEqual(yield str.get(), null);
        assert.strictEqual(yield redis.has("foo"), false);
    }));

    it("should get the length of the string", () => co(function*() {
        yield str.set("Hello, World!");
        assert.strictEqual(yield str.getLength(), 13);
    }));

    it("should increase a value according to a specified key", () => co(function*() {
        assert.strictEqual(yield str.set("123"), "123");
        assert.strictEqual(yield str.increase(), "124");
        assert.strictEqual(yield str.increase(2), "126");
        assert.strictEqual(yield str.increase(1.5), "127.5");
    }));

    it("should decrease a value according to a specified key", () => co(function*() {
        assert.strictEqual(yield str.set("123"), "123");
        assert.strictEqual(yield str.decrease(), "122");
        assert.strictEqual(yield str.decrease(2), "120");
        assert.strictEqual(yield str.decrease(1.5), "118.5");
        yield str.clear();
    }));

    it("should set TTL after set the value", () => co(function*() {
        yield str.set("Hello, World!");
        yield str.setTTL(1);
        yield sleep(1005);
        assert.strictEqual(yield redis.has("foo"), false);
    }));

    it("should get TTL of the string", () => co(function*() {
        yield str.set("Hello, World!");
        yield str.setTTL(2);
        let ttl = yield str.getTTL();
        assert.ok(typeof ttl === "number" && ttl > 0);
    }));

    it("should refer to the same string when providing the same name", () => co(function*() {
        yield str.set("Hello, World!");
        let _str = redis.String.of("foo");
        assert.deepStrictEqual(yield str.get(), yield _str.get());
        yield str.clear();
    }));
});

describe("RedisList", () => {
    let list = redis.List.of("foo");

    it("should push a value into the list", () => co(function*() {
        assert.strictEqual(yield list.push("Hello"), 1);
    }));

    it("should push multiple values into the list", () => co(function*() {
        assert.strictEqual(yield list.push("World", "Hi", "Ayon", "Cool"), 5);
    }));

    it("should pop the last item of the list", () => co(function*() {
        assert.strictEqual(yield list.pop(), "Cool");
    }));

    it("should shift the first item of the list", () => co(function*() {
        assert.strictEqual(yield list.shift(), "Hello");
    }));

    it("should unshift a value into the list", () => co(function*() {
        assert.strictEqual(yield list.unshift("Hello"), 4);
    }));

    it("should unshift multiple values into the list", () => co(function*() {
        assert.strictEqual(yield list.unshift("Good", "Morning"), 6);
    }));

    it("should get the index of a value in the list", () => co(function*() {
        assert.strictEqual(yield list.indexOf("Good"), 0);
        assert.strictEqual(yield list.indexOf("Morning"), 1);
        assert.strictEqual(yield list.indexOf("Hola"), -1);
    }));

    it("should get the value at a specified index of the list", () => co(function*() {
        assert.deepStrictEqual([
            yield list.valueAt(0),
            yield list.valueAt(1)
        ], ["Good", "Morning"]);
    }));

    it("should set the value at a specified index of the list", () => co(function*() {
        assert.deepStrictEqual([
            yield list.valueAt(0, "Nice"),
            yield list.valueAt(1, "Day")
        ], ["Nice", "Day"]);
    }));

    it("should get all values from the list", () => co(function*() {
        assert.deepStrictEqual(yield list.values(), [
            "Nice",
            "Day",
            "Hello",
            "World",
            "Hi",
            "Ayon"
        ]);
    }));

    it("should slice the list with only start position", () => co(function*() {
        assert.deepStrictEqual(yield list.slice(1), [
            "Day",
            "Hello",
            "World",
            "Hi",
            "Ayon"
        ]);
    }));

    it("should slice the list with both start and end position", () => co(function*() {
        assert.deepStrictEqual(yield list.slice(1, 4), [
            "Day",
            "Hello",
            "World"
        ]);
    }));

    it("should slice the list with minus end position", () => co(function*() {
        assert.deepStrictEqual(yield list.slice(0, -2), [
            "Nice",
            "Day",
            "Hello",
            "World"
        ]);
    }));

    it("should splice a value and return it from the list", () => co(function*() {
        assert.deepStrictEqual(yield list.splice(1), ["Day"]);
        assert.deepStrictEqual(yield list.values(), [
            "Nice",
            "Hello",
            "World",
            "Hi",
            "Ayon"
        ]);
    }));

    it("should splice multiple values and return them from the list", () => co(function*() {
        assert.deepStrictEqual(yield list.splice(1, 2), ["Hello", "World"]);
        assert.deepStrictEqual(yield list.values(), ["Nice", "Hi", "Ayon"]);
    }));

    it("should reverse all values in the list", () => co(function*() {
        assert.deepStrictEqual(yield list.reverse(), ["Ayon", "Hi", "Nice"]);
        assert.deepStrictEqual(yield list.values(), ["Ayon", "Hi", "Nice"]);
    }));

    it("should get the length of the list", () => co(function*() {
        assert.strictEqual(yield list.getLength(), 3);
    }));

    it("should refer to the same list when providing the same name", () => co(function*() {
        let _list = redis.List.of("foo");
        assert.deepStrictEqual(yield list.values(), yield _list.values());
    }));

    it("should clear the list", () => co(function*() {
        assert.strictEqual(yield list.clear(), undefined);
        assert.deepStrictEqual(yield list.values(), []);
    }));
});

describe("RedisSet", () => {
    let set = redis.Set.of("foo");

    it("should add a value into the set", () => co(function*() {
        assert.strictEqual(yield set.add("Hello"), set);
    }));

    it("should add multiple values into the set", () => co(function*() {
        assert.strictEqual(yield set.add("World", "Hi", "Ayon"), set);
    }));

    it("should check if a value exists in the set", () => co(function*() {
        assert.strictEqual(yield set.has("Hello"), true);
        assert.strictEqual(yield set.has("World"), true);
        assert.strictEqual(yield set.has("Hi"), true);
        assert.strictEqual(yield set.has("Ayon"), true);
        assert.strictEqual(yield set.has("Cool"), false);
    }));

    it("should delete a value from the set", () => co(function*() {
        assert.strictEqual(yield set.delete("Hello"), true);
        assert.strictEqual(yield set.has("Hello"), false);
    }));

    it("should delete multiple values from the set", () => co(function*() {
        assert.strictEqual(yield set.delete("Hello"), false);
        assert.strictEqual(yield set.delete("World", "Hi", "Ayon"), true);
        assert.strictEqual(yield set.has("World"), false);
        assert.strictEqual(yield set.has("Hi"), false);
        assert.strictEqual(yield set.has("Ayon"), false);
    }));

    it("should get the size of the set", () => co(function*() {
        yield set.add("Hello");
        yield set.add("World");
        assert.strictEqual(yield set.getSize(), 2);
    }));

    it("should get all values of the set", () => co(function*() {
        assert.deepStrictEqual(yield set.values(), ["Hello", "World"]);
    }));

    it("should not add duplicate value into the set", () => co(function*() {
        yield set.add("Hello");
        assert.deepStrictEqual(yield set.values(), ["Hello", "World"]);
    }));

    it("should refer to the same set when providing the same name", () => co(function*() {
        let _set = redis.Set.of("foo");
        assert.deepStrictEqual(yield set.values(), yield _set.values());
    }));

    it("should clear the set", () => co(function*() {
        assert.strictEqual(yield set.clear(), undefined);
        assert.strictEqual(yield set.getSize(), 0);
    }));
});

describe("RedisHashMap", () => {
    let map = redis.HashMap.of("foo");

    it("should set value to a key in the map", () => co(function*() {
        assert.strictEqual(yield map.set("bar", "Hello, World!"), map);
    }));

    it("should set values to multiple keys in the map", () => co(function*() {
        assert.strictEqual(yield map.set({
            "greet": "Hello, World!",
            "answer": "Hi, Ayon!"
        }), map);
    }));

    it("should check if a key exists in the map", () => co(function*() {
        assert.strictEqual(yield map.has("bar"), true);
        assert.strictEqual(yield map.has("foo"), false);
    }));

    it("should get value by a key", () => co(function*() {
        assert.strictEqual(yield map.get("bar"), "Hello, World!");
    }));

    it("should delete a value by a key", () => co(function*() {
        assert.strictEqual(yield map.delete("bar"), true);
        assert.strictEqual(yield map.has("bar"), false);
    }));

    it("should get the size of the map", () => co(function*() {
        assert.strictEqual(yield map.getSize(), 2);
    }));

    it("should get all the keys of the map", () => co(function*() {
        assert.deepStrictEqual(yield map.keys(), ["greet", "answer"]);
    }));

    it("should get all the values of the map", () => co(function*() {
        assert.deepStrictEqual(yield map.values(), [
            "Hello, World!",
            "Hi, Ayon!"
        ]);
    }));

    it("should get all key-value pairs of the map", () => co(function*() {
        assert.deepStrictEqual(yield map.pairs(), {
            greet: "Hello, World!",
            answer: "Hi, Ayon!"
        });
    }));

    it("should increase the value of a key", () => co(function*() {
        yield map.set("count", "123");
        assert.strictEqual(yield map.increase("count"), "124");
        assert.strictEqual(yield map.increase("count", 2), "126");
        assert.strictEqual(yield map.increase("count", 1.5), "127.5");
        assert.strictEqual(yield map.get("count"), "127.5");
    }));

    it("should decrease the value of a key", () => co(function*() {
        yield map.set("count", "123");
        assert.strictEqual(yield map.decrease("count"), "122");
        assert.strictEqual(yield map.decrease("count", 2), "120");
        assert.strictEqual(yield map.decrease("count", 1.5), "118.5");
        assert.strictEqual(yield map.get("count"), "118.5");
    }));

    it("should refer to the same map when providing the same name", () => co(function*() {
        let _map = redis.HashMap.of("foo");
        assert.deepStrictEqual(yield map.pairs(), yield _map.pairs());
    }));

    it("should clear the map", () => co(function*() {
        assert.strictEqual(yield map.clear(), undefined);
        assert.strictEqual(yield map.getSize(), 0);
    }));
});