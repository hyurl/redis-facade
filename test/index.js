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

    it("should set the string value", () => co(function* () {
        assert.strictEqual(yield str.set("Hello, World!"), "Hello, World!");
        assert.strictEqual(yield redis.has("foo"), true);
    }));

    it("should get the string value", () => co(function* () {
        assert.strictEqual(yield str.get(), "Hello, World!");
    }));

    it("should clear the string", () => co(function* () {
        assert.strictEqual(yield str.clear(), undefined);
        assert.strictEqual(yield str.get(), null);
        assert.strictEqual(yield redis.has("foo"), false);
    }));

    it("should set the string value with TTL", () => co(function* () {
        assert.strictEqual(yield str.set("Hello, World!", 1), "Hello, World!");
        yield sleep(1005);
        assert.strictEqual(yield str.get(), null);
        assert.strictEqual(yield redis.has("foo"), false);
    }));

    it("should get the length of the string", () => co(function* () {
        yield str.set("Hello, World!");
        assert.strictEqual(yield str.length(), 13);
    }));

    it("should append value to the string", () => co(function* () {
        assert.strictEqual(yield str.append(" Hi, Ayon"), "Hello, World! Hi, Ayon");
        assert.strictEqual(yield str.length(), 22);
    }));

    it("should slice the string with only start argument", () => co(function* () {
        assert.strictEqual(yield str.slice(1), "ello, World! Hi, Ayon");
    }));

    it("should slice the list with both start and end argument", () => co(function* () {
        assert.strictEqual(yield str.slice(1, 5), "ello");
        assert.strictEqual(yield str.slice(1, 0), "");
    }));

    it("should slice the list with minus start argument", () => co(function* () {
        assert.strictEqual(yield str.slice(-4), "Ayon");
    }));

    it("should slice the list with minus end argument", () => co(function* () {
        assert.strictEqual(yield str.slice(0, -4), "Hello, World! Hi, ");
    }));

    it("should check if the string starts with a target string", () => co(function* () {
        assert.strictEqual(yield str.startsWith("Hello"), true);
    }));

    it("should check if the string ends with a target string", () => co(function* () {
        assert.strictEqual(yield str.endsWith("Ayon"), true);
    }));

    it("should increase a value according to a specified key", () => co(function* () {
        assert.strictEqual(yield str.set("123"), "123");
        assert.strictEqual(yield str.increase(), "124");
        assert.strictEqual(yield str.increase(2), "126");
        assert.strictEqual(yield str.increase(1.5), "127.5");
    }));

    it("should decrease a value according to a specified key", () => co(function* () {
        assert.strictEqual(yield str.set("123"), "123");
        assert.strictEqual(yield str.decrease(), "122");
        assert.strictEqual(yield str.decrease(2), "120");
        assert.strictEqual(yield str.decrease(1.5), "118.5");
        yield str.clear();
    }));

    it("should set TTL after set the value", () => co(function* () {
        yield str.set("Hello, World!");
        assert.strictEqual(yield str.setTTL(1), 1);
        yield sleep(1005);
        assert.strictEqual(yield redis.has("foo"), false);
    }));

    it("should get TTL of the string", () => co(function* () {
        yield str.set("Hello, World!");
        yield str.setTTL(2);
        let ttl = yield str.getTTL();
        assert.ok(typeof ttl === "number" && ttl > 0);
    }));

    it("should refer to the same string when providing the same name", () => co(function* () {
        yield str.set("Hello, World!");
        let _str = redis.String.of("foo");
        assert.deepStrictEqual(yield str.get(), yield _str.get());
        yield str.clear();
    }));
});

describe("RedisList", () => {
    let list = redis.List.of("foo");

    it("should push a value into the list", () => co(function* () {
        assert.strictEqual(yield list.push("Hello"), 1);
    }));

    it("should push multiple values into the list", () => co(function* () {
        assert.strictEqual(yield list.push("World", "Hi", "Ayon", "Cool"), 5);
    }));

    it("should pop the last item of the list", () => co(function* () {
        assert.strictEqual(yield list.pop(), "Cool");
    }));

    it("should shift the first item of the list", () => co(function* () {
        assert.strictEqual(yield list.shift(), "Hello");
    }));

    it("should unshift a value into the list", () => co(function* () {
        assert.strictEqual(yield list.unshift("Hello"), 4);
    }));

    it("should unshift multiple values into the list", () => co(function* () {
        assert.strictEqual(yield list.unshift("Good", "Morning"), 6);
    }));

    it("should check if a value exists in the list", () => co(function* () {
        assert.strictEqual(yield list.includes("Good"), true);
        assert.strictEqual(yield list.includes("Morning"), true);
        assert.strictEqual(yield list.includes("Hola"), false);
    }));

    it("should get the index of a value", () => co(function* () {
        assert.strictEqual(yield list.indexOf("Good"), 0);
        assert.strictEqual(yield list.indexOf("Morning"), 1);
        assert.strictEqual(yield list.indexOf("Hola"), -1);
    }));

    it("should get the value at a specified index", () => co(function* () {
        assert.deepStrictEqual([
            yield list.valueAt(0),
            yield list.valueAt(1)
        ], ["Good", "Morning"]);
    }));

    it("should set the value at a specified index", () => co(function* () {
        assert.deepStrictEqual([
            yield list.valueAt(0, "Nice"),
            yield list.valueAt(1, "Day")
        ], ["Nice", "Day"]);
    }));

    it("should get all values from the list", () => co(function* () {
        assert.deepStrictEqual(yield list.values(), [
            "Nice",
            "Day",
            "Hello",
            "World",
            "Hi",
            "Ayon"
        ]);
    }));

    it("should slice the list with only start argument", () => co(function* () {
        assert.deepStrictEqual(yield list.slice(1), [
            "Day",
            "Hello",
            "World",
            "Hi",
            "Ayon"
        ]);
    }));

    it("should slice the list with both start and end argument", () => co(function* () {
        assert.deepStrictEqual(yield list.slice(1, 4), [
            "Day",
            "Hello",
            "World"
        ]);
        assert.deepStrictEqual(yield list.slice(1, 0), []);
    }));

    it("should slice the list with minus start argument", () => co(function* () {
        assert.deepStrictEqual(yield list.slice(-2), ["Hi", "Ayon"]);
    }));

    it("should slice the list with minus end argument", () => co(function* () {
        assert.deepStrictEqual(yield list.slice(0, -2), [
            "Nice",
            "Day",
            "Hello",
            "World"
        ]);
    }));

    it("should splice a value and return it from the list", () => co(function* () {
        assert.deepStrictEqual(yield list.splice(1), ["Day"]);
        assert.deepStrictEqual(yield list.values(), [
            "Nice",
            "Hello",
            "World",
            "Hi",
            "Ayon"
        ]);
    }));

    it("should splice multiple values and return them from the list", () => co(function* () {
        assert.deepStrictEqual(yield list.splice(1, 2), ["Hello", "World"]);
        assert.deepStrictEqual(yield list.values(), ["Nice", "Hi", "Ayon"]);
    }));

    it("should splice values and insert new values into the list", () => co(function* () {
        assert.deepStrictEqual(yield list.splice(1, 1, "Day", "Hello"), ["Hi"]);
        assert.deepStrictEqual(yield list.values(), ["Nice", "Day", "Hello", "Ayon"]);
        yield list.splice(1, 2, "Hi");
    }));

    it("should reverse all values in the list", () => co(function* () {
        assert.deepStrictEqual(yield list.reverse(), ["Ayon", "Hi", "Nice"]);
        assert.deepStrictEqual(yield list.values(), ["Ayon", "Hi", "Nice"]);
    }));

    it("should sort the list in ascending order", () => () => co(function* () {
        assert.deepStrictEqual(yield list.sort(), ["Ayon", "Hi", "Nice"]);
        assert.deepStrictEqual(yield list.values(), ["Ayon", "Hi", "Nice"]);
        assert.deepStrictEqual(yield list.sort(1), ["Ayon", "Hi", "Nice"]);
        assert.deepStrictEqual(yield list.values(), ["Ayon", "Hi", "Nice"]);
    }));

    it("should sort the list in descending order", () => () => co(function* () {
        assert.deepStrictEqual(yield list.sort(-1), ["Nice", "Hi", "Ayon"]);
        assert.deepStrictEqual(yield list.values(), ["Nice", "Hi", "Ayon"]);
    }));

    it("should get the length of the list", () => co(function* () {
        assert.strictEqual(yield list.length(), 3);
    }));

    it("should refer to the same list when providing the same name", () => co(function* () {
        let _list = redis.List.of("foo");
        assert.deepStrictEqual(yield list.values(), yield _list.values());
    }));

    it("should clear the list", () => co(function* () {
        assert.strictEqual(yield list.clear(), undefined);
        assert.deepStrictEqual(yield list.values(), []);
    }));
});

describe("RedisSet", () => {
    let set = redis.Set.of("foo");

    it("should add a value into the set", () => co(function* () {
        assert.strictEqual(yield set.add("Hello"), set);
    }));

    it("should add multiple values into the set", () => co(function* () {
        assert.strictEqual(yield set.add("World", "Hi", "Ayon"), set);
    }));

    it("should check if a value exists in the set", () => co(function* () {
        assert.strictEqual(yield set.has("Hello"), true);
        assert.strictEqual(yield set.has("World"), true);
        assert.strictEqual(yield set.has("Hi"), true);
        assert.strictEqual(yield set.has("Ayon"), true);
        assert.strictEqual(yield set.has("Cool"), false);
    }));

    it("should delete a value from the set", () => co(function* () {
        assert.strictEqual(yield set.delete("Hello"), true);
        assert.strictEqual(yield set.has("Hello"), false);
    }));

    it("should delete multiple values from the set", () => co(function* () {
        assert.strictEqual(yield set.delete("Hello"), false);
        assert.strictEqual(yield set.delete("World", "Hi", "Ayon"), true);
        assert.strictEqual(yield set.has("World"), false);
        assert.strictEqual(yield set.has("Hi"), false);
        assert.strictEqual(yield set.has("Ayon"), false);
    }));

    it("should get the size of the set", () => co(function* () {
        yield set.add("Hello", "World");
        assert.strictEqual(yield set.size(), 2);
    }));

    it("should get all values of the set", () => co(function* () {
        assert.deepStrictEqual((yield set.values()).sort(), ["Hello", "World"]);
    }));

    it("should not add duplicate value into the set", () => co(function* () {
        yield set.add("Hello");
        assert.deepStrictEqual((yield set.values()).sort(), ["Hello", "World"]);
    }));

    it("should pop a random value from the set", () => co(function* () {
        let value = yield set.pop();
        assert.ok(["Hello", "World"].includes(value));
        assert.strictEqual(yield set.size(), 1);
        yield set.add(value);
    }));

    it("should pop multiple random values from the set", () => co(function* () {
        let values = yield set.pop(2);
        assert.deepStrictEqual(values.sort(), ["Hello", "World"]);
        assert.strictEqual(yield set.size(), 0);
        yield set.add(...values);
    }));

    it("should return a random value from the set", () => co(function* () {
        let value = yield set.random();
        assert.ok(["Hello", "World"].includes(value));
        assert.strictEqual(yield set.size(), 2);
    }));

    it("should return multiple random values from the set", () => co(function* () {
        let values = yield set.random(2);
        assert.deepStrictEqual(values.sort(), ["Hello", "World"]);
        assert.strictEqual(yield set.size(), 2);
    }));

    it("should get the different values from another set", () => co(function* () {
        let _set = redis.Set.of("bar");
        yield _set.add("Hello", "Ayon");
        assert.deepStrictEqual(yield set.difference(_set), ["World"]);
        yield _set.clear();
    }));

    it("should get the different values from other sets", () => co(function* () {
        let _set = redis.Set.of("bar");
        let _set2 = redis.Set.of("bar2");
        yield _set.add("Hello", "Ayon");
        yield _set2.add("Hi", "Ayon");
        assert.deepStrictEqual(yield set.difference(_set, _set2), ["World"]);
        yield _set.clear();
        yield _set2.clear();
    }));

    it("should get the intersection values from another set", () => co(function* () {
        let _set = redis.Set.of("bar");
        yield _set.add("Hello", "Ayon");
        assert.deepStrictEqual(yield set.intersection(_set), ["Hello"]);
        yield _set.clear();
    }));

    it("should get the intersection values from other sets", () => co(function* () {
        let _set = redis.Set.of("bar");
        let _set2 = redis.Set.of("bar2");
        yield _set.add("Hello", "Ayon");
        yield _set2.add("Hello", "Ayon");
        assert.deepStrictEqual(yield set.intersection(_set, _set2), ["Hello"]);
        yield _set.clear();
        yield _set2.clear();
    }));

    it("should get the union values from another set", () => co(function* () {
        let _set = redis.Set.of("bar");
        yield _set.add("Hello", "Ayon");
        assert.deepStrictEqual((yield set.union(_set)).sort(), [
            "Ayon",
            "Hello",
            "World"
        ]);
        yield _set.clear();
    }));

    it("should get the union values from other sets", () => co(function* () {
        let _set = redis.Set.of("bar");
        let _set2 = redis.Set.of("bar2");
        yield _set.add("Hello", "Ayon");
        yield _set2.add("Hi", "Ayon");
        assert.deepStrictEqual((yield set.union(_set)).sort(), [
            "Ayon",
            "Hello",
            "World"
        ]);
        yield _set.clear();
        yield _set2.clear();
    }));

    it("should refer to the same set when providing the same name", () => co(function* () {
        let _set = redis.Set.of("foo");
        assert.deepStrictEqual(yield set.values(), yield _set.values());
    }));

    it("should clear the set", () => co(function* () {
        assert.strictEqual(yield set.clear(), undefined);
        assert.strictEqual(yield set.size(), 0);
    }));
});

describe("RedisHashMap", () => {
    let map = redis.HashMap.of("foo");

    it("should set value to a key in the map", () => co(function* () {
        assert.strictEqual(yield map.set("bar", "Hello, World!"), map);
    }));

    it("should set values to multiple keys in the map", () => co(function* () {
        assert.strictEqual(yield map.set({
            "greet": "Hello, World!",
            "answer": "Hi, Ayon!"
        }), map);
    }));

    it("should check if a key exists in the map", () => co(function* () {
        assert.strictEqual(yield map.has("bar"), true);
        assert.strictEqual(yield map.has("foo"), false);
    }));

    it("should get value by a key", () => co(function* () {
        assert.strictEqual(yield map.get("bar"), "Hello, World!");
    }));

    it("should delete a value by a key", () => co(function* () {
        assert.strictEqual(yield map.delete("bar"), true);
        assert.strictEqual(yield map.has("bar"), false);
    }));

    it("should get the size of the map", () => co(function* () {
        assert.strictEqual(yield map.size(), 2);
    }));

    it("should get all the keys of the map", () => co(function* () {
        assert.deepStrictEqual(yield map.keys(), ["greet", "answer"]);
    }));

    it("should get all the values of the map", () => co(function* () {
        assert.deepStrictEqual(yield map.values(), [
            "Hello, World!",
            "Hi, Ayon!"
        ]);
    }));

    it("should get all key-value pairs of the map", () => co(function* () {
        assert.deepStrictEqual(yield map.pairs(), {
            greet: "Hello, World!",
            answer: "Hi, Ayon!"
        });
    }));

    it("should increase the value of a key", () => co(function* () {
        yield map.set("count", "123");
        assert.strictEqual(yield map.increase("count"), "124");
        assert.strictEqual(yield map.increase("count", 2), "126");
        assert.strictEqual(yield map.increase("count", 1.5), "127.5");
        assert.strictEqual(yield map.get("count"), "127.5");
    }));

    it("should decrease the value of a key", () => co(function* () {
        yield map.set("count", "123");
        assert.strictEqual(yield map.decrease("count"), "122");
        assert.strictEqual(yield map.decrease("count", 2), "120");
        assert.strictEqual(yield map.decrease("count", 1.5), "118.5");
        assert.strictEqual(yield map.get("count"), "118.5");
    }));

    it("should refer to the same map when providing the same name", () => co(function* () {
        let _map = redis.HashMap.of("foo");
        assert.deepStrictEqual(yield map.pairs(), yield _map.pairs());
    }));

    it("should clear the map", () => co(function* () {
        assert.strictEqual(yield map.clear(), undefined);
        assert.strictEqual(yield map.size(), 0);
    }));
});

describe("RedisSortedSet", () => {
    let set = redis.SortedSet.of("foo");

    it("should add a value into the set", () => co(function* () {
        assert.strictEqual(yield set.add("Hello"), set);
        assert.strictEqual(yield set.add("World", 2), set);
    }));

    it("should add multiple values into the set", () => co(function* () {
        assert.strictEqual(yield set.add({
            "Hi": 3,
            "Ayon": 4
        }), set);
    }));

    it("should check if a value exists in the set", () => co(function* () {
        assert.strictEqual(yield set.has("Hello"), true);
        assert.strictEqual(yield set.has("hello"), false);
    }));

    it("should delete a value from the set", () => co(function* () {
        assert.strictEqual(yield set.delete("Hello"), true);
        assert.strictEqual(yield set.delete("Hello"), false);
        assert.strictEqual(yield set.has("Hello"), false);
        yield set.add("Hello", 1);
    }));

    it("should get the index of a value in the set", () => co(function* () {
        assert.strictEqual(yield set.indexOf("Hello"), 0);
        assert.strictEqual(yield set.indexOf("World"), 1);
        assert.strictEqual(yield set.indexOf("hello"), -1);
    }));

    it("should get the score of a value in the set", () => co(function* () {
        assert.strictEqual(yield set.scoreOf("Hello"), 1);
        assert.strictEqual(yield set.scoreOf("World"), 2);
        assert.strictEqual(yield set.scoreOf("hello"), null);
    }));

    it("should get all scores of the set in a key-value pair", () => co(function* () {
        assert.deepStrictEqual(yield set.scores(), {
            "Hello": 1,
            "World": 2,
            "Hi": 3,
            "Ayon": 4
        });
    }));

    it("should get all values in the set", () => co(function* () {
        assert.deepStrictEqual(yield set.values(), [
            "Hello",
            "World",
            "Hi",
            "Ayon"
        ]);
    }));

    it("should get the size of the set", () => co(function* () {
        assert.strictEqual(yield set.size(), 4);
    }));

    it("should set the score of a value in the set", () => co(function* () {
        assert.strictEqual(yield set.set("Ayon", 10), 10);
        assert.strictEqual(yield set.scoreOf("Ayon"), 10);
        yield set.set("Ayon", 4);
    }));

    it("should increase the score of a value", () => co(function* () {
        assert.strictEqual(yield set.increase("Ayon"), 5);
        assert.strictEqual(yield set.scoreOf("Ayon"), 5);
    }));

    it("should increase the score of a value with specified increment", () => co(function* () {
        assert.strictEqual(yield set.increase("Ayon", 2), 7);
        assert.strictEqual(yield set.scoreOf("Ayon"), 7);
    }));

    it("should decrease the score of a value", () => co(function* () {
        assert.strictEqual(yield set.decrease("Ayon"), 6);
        assert.strictEqual(yield set.scoreOf("Ayon"), 6);
    }));

    it("should decrease the score of a value with specified increment", () => co(function* () {
        assert.strictEqual(yield set.decrease("Ayon", 2), 4);
        assert.strictEqual(yield set.scoreOf("Ayon"), 4);
    }));

    it("should pop the last value of the set", () => co(function* () {
        assert.strictEqual(yield set.pop(), "Ayon");
        assert.deepStrictEqual(yield set.values(), ["Hello", "World", "Hi"]);
        yield set.add("Ayon", 4);
    }));

    it("should pop the last value with score of the set", () => co(function* () {
        assert.deepStrictEqual(yield set.pop(true), ["Ayon", 4]);
        assert.deepStrictEqual(yield set.values(), ["Hello", "World", "Hi"]);
        yield set.add("Ayon", 4);
    }));

    it("should shift the last value of the set", () => co(function* () {
        assert.strictEqual(yield set.shift(), "Hello");
        assert.deepStrictEqual(yield set.values(), ["World", "Hi", "Ayon"]);
        yield set.add("Hello", 1);
    }));

    it("should shift the last value with score of the set", () => co(function* () {
        assert.deepStrictEqual(yield set.shift(true), ["Hello", 1]);
        assert.deepStrictEqual(yield set.values(), ["World", "Hi", "Ayon"]);
        yield set.add("Hello", 1);
    }));

    it("should slice the set with only start argument", () => co(function* () {
        assert.deepStrictEqual(yield set.slice(1), ["World", "Hi", "Ayon"]);
        assert.deepStrictEqual(yield set.values(), ["Hello", "World", "Hi", "Ayon"]);
    }));

    it("should slice the set with start and end argument", () => co(function* () {
        assert.deepStrictEqual(yield set.slice(1, 3), ["World", "Hi"]);
        assert.deepStrictEqual(yield set.values(), ["Hello", "World", "Hi", "Ayon"]);
    }));

    it("should slice the set with minus start argument", () => co(function* () {
        assert.deepStrictEqual(yield set.slice(-2), ["Hi", "Ayon"]);
        assert.deepStrictEqual(yield set.values(), ["Hello", "World", "Hi", "Ayon"]);
    }));

    it("should slice the set with start end minus end argument", () => co(function* () {
        assert.deepStrictEqual(yield set.slice(1, -1), ["World", "Hi"]);
        assert.deepStrictEqual(yield set.values(), ["Hello", "World", "Hi", "Ayon"]);
    }));

    it("should splice a value and return it from the list", () => co(function* () {
        assert.deepStrictEqual(yield set.splice(1), ["World"]);
        assert.deepStrictEqual(yield set.values(), ["Hello", "Hi", "Ayon"]);
        yield set.add("World", 2);
    }));

    it("should splice multiple values and return them from the list", () => co(function* () {
        assert.deepStrictEqual(yield set.splice(1, 2), ["World", "Hi"]);
        assert.deepStrictEqual(yield set.values(), ["Hello", "Ayon"]);
        yield set.add({ "World": 2, "Hi": 3 });
    }));

    it("should count the elements with a given score in the set", () => co(function* () {
        assert.strictEqual(yield set.countByScore(1), 1);
    }));

    it("should count the elements between two scores of the set", () => co(function* () {
        assert.strictEqual(yield set.countByScore(1, 4), 4);
        assert.strictEqual(yield set.countByScore(2, 3), 2);
    }));

    it("should slice values between two scores of the set", () => co(function* () {
        assert.deepStrictEqual(yield set.sliceByScore(2, 3), ["World", "Hi"]);
        assert.deepStrictEqual(yield set.values(), ["Hello", "World", "Hi", "Ayon"]);
    }));

    it("should splice values between two scores of the set", () => co(function* () {
        assert.deepStrictEqual(yield set.spliceByScore(2, 3), ["World", "Hi"]);
        assert.deepStrictEqual(yield set.values(), ["Hello", "Ayon"]);
    }));

    it("should clear the set", () => co(function* () {
        assert.strictEqual(yield set.clear(), undefined);
        assert.strictEqual(yield set.size(), 0);
    }));
});

describe("RedisOperator & RedisFacadeType", () => {
    it("should check if a key exists in redis store", () => co(function* () {
        assert.strictEqual(yield redis.has("foo"), false);
        yield redis.String.of("foo").set("Hello, World!");
        assert.strictEqual(yield redis.has("foo"), true);
    }));

    it("should delete a key from the redis store", () => co(function* () {
        assert.strictEqual(yield redis.delete("foo"), true);
        assert.strictEqual(yield redis.delete("foo"), false);
        assert.strictEqual(yield redis.has("foo"), false);
    }));

    it("should get the type of a key in the redis store", () => co(function* () {
        assert.strictEqual(yield redis.typeof("foo"), "none");

        yield redis.String.of("foo").set("Hello, World!");
        assert.strictEqual(yield redis.typeof("foo"), "string");

        yield redis.delete("foo");
        yield redis.List.of("foo").push("Hello", "World");
        assert.strictEqual(yield redis.typeof("foo"), "list");

        yield redis.delete("foo");
        yield redis.Set.of("foo").add("Hello", "World");
        assert.strictEqual(yield redis.typeof("foo"), "set");

        yield redis.delete("foo");
        yield redis.SortedSet.of("foo").add("Hello", 1);
        assert.strictEqual(yield redis.typeof("foo"), "zset");

        yield redis.delete("foo");
        yield redis.HashMap.of("foo").set("Hello", "World");
        assert.strictEqual(yield redis.typeof("foo"), "hash");
    }));

    it("should execute a redis command", () => co(function* () {
        assert.strictEqual(yield redis.exec("type", "foo"), "hash");
    }));

    it("should check if a key exists as string type", () => co(function* () {
        assert.strictEqual(yield redis.String.has("foo"), false);
        yield redis.delete("foo");
        yield redis.String.of("foo").set("Hello, World!");
        assert.strictEqual(yield redis.String.has("foo"), true);
    }));

    it("should check if a key exists as list type", () => co(function* () {
        assert.strictEqual(yield redis.List.has("foo"), false);
        yield redis.delete("foo");
        yield redis.List.of("foo").push("Hello", "World!");
        assert.strictEqual(yield redis.List.has("foo"), true);
    }));

    it("should check if a key exists as set type", () => co(function* () {
        assert.strictEqual(yield redis.Set.has("foo"), false);
        yield redis.delete("foo");
        yield redis.Set.of("foo").add("Hello", "World!");
        assert.strictEqual(yield redis.Set.has("foo"), true);
    }));

    it("should check if a key exists as sorted set type", () => co(function* () {
        assert.strictEqual(yield redis.SortedSet.has("foo"), false);
        yield redis.delete("foo");
        yield redis.SortedSet.of("foo").add("Hello", 1);
        assert.strictEqual(yield redis.SortedSet.has("foo"), true);
    }));

    it("should check if a key exists as hash map type", () => co(function* () {
        assert.strictEqual(yield redis.HashMap.has("foo"), false);
        yield redis.delete("foo");
        yield redis.HashMap.of("foo").set("Hello", "World!");
        assert.strictEqual(yield redis.HashMap.has("foo"), true);
    }));

    after(() => co(function* () {
        yield redis.delete("foo");
    }));
});