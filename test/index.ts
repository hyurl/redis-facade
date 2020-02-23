import "source-map-support/register";
import * as assert from "assert";
import { format } from "util";
import createFacade from "../src";

let redis = createFacade();

function sleep(timeout: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, timeout));
}

after(async () => {
    await redis.delete("foo");
    await redis.disconnect();
});

describe("RedisString", () => {
    let str = redis.String.of("foo");

    it("should set the string value", async () => {
        assert.strictEqual(await str.set("Hello, World!"), "Hello, World!");
        assert.strictEqual(await redis.has("foo"), true);
    });

    it("should get the string value", async () => {
        assert.strictEqual(await str.get(), "Hello, World!");
    });

    it("should clear the string", async () => {
        assert.strictEqual(await str.clear(), undefined);
        assert.strictEqual(await str.get(), null);
        assert.strictEqual(await redis.has("foo"), false);
    });

    it("should set the string value with TTL", async () => {
        assert.strictEqual(await str.set("Hello, World!", 1), "Hello, World!");
        await sleep(1005);
        assert.strictEqual(await str.get(), null);
        assert.strictEqual(await redis.has("foo"), false);
    });

    it("should get the length of the string", async () => {
        await str.set("Hello, World!");
        assert.strictEqual(await str.length(), 13);
    });

    it("should append value to the string", async () => {
        assert.strictEqual(await str.append(" Hi, Ayon"), "Hello, World! Hi, Ayon");
        assert.strictEqual(await str.length(), 22);
    });

    it("should slice the string with only start argument", async () => {
        assert.strictEqual(await str.slice(1), "ello, World! Hi, Ayon");
    });

    it("should slice the list with both start and end argument", async () => {
        assert.strictEqual(await str.slice(1, 5), "ello");
        assert.strictEqual(await str.slice(1, 0), "");
    });

    it("should slice the list with minus start argument", async () => {
        assert.strictEqual(await str.slice(-4), "Ayon");
    });

    it("should slice the list with minus end argument", async () => {
        assert.strictEqual(await str.slice(0, -4), "Hello, World! Hi, ");
    });

    it("should check if the string starts with a target string", async () => {
        assert.strictEqual(await str.startsWith("Hello"), true);
    });

    it("should check if the string ends with a target string", async () => {
        assert.strictEqual(await str.endsWith("Ayon"), true);
    });

    it("should increase a value according to a specified key", async () => {
        assert.strictEqual(await str.set("123"), "123");
        assert.strictEqual(await str.increase(), "124");
        assert.strictEqual(await str.increase(2), "126");
        assert.strictEqual(await str.increase(1.5), "127.5");
    });

    it("should decrease a value according to a specified key", async () => {
        assert.strictEqual(await str.set("123"), "123");
        assert.strictEqual(await str.decrease(), "122");
        assert.strictEqual(await str.decrease(2), "120");
        assert.strictEqual(await str.decrease(1.5), "118.5");
        await str.clear();
    });

    it("should set TTL after set the value", async () => {
        await str.set("Hello, World!");
        assert.strictEqual(await str.setTTL(1), 1);
        await sleep(1005);
        assert.strictEqual(await redis.has("foo"), false);
    });

    it("should get TTL of the string", async () => {
        await str.set("Hello, World!");
        await str.setTTL(2);
        let ttl = await str.getTTL();
        assert.ok(typeof ttl === "number" && ttl > 0);
    });

    it("should refer to the same string when providing the same name", async () => {
        await str.set("Hello, World!");
        let _str = redis.String.of("foo");
        assert.deepStrictEqual(await str.get(), await _str.get());
        await str.clear();
    });
});

describe("RedisList", () => {
    let list = redis.List.of("foo");

    it("should push a value into the list", async () => {
        assert.strictEqual(await list.push("Hello"), 1);
    });

    it("should push multiple values into the list", async () => {
        assert.strictEqual(await list.push("World", "Hi", "Ayon", "Cool"), 5);
    });

    it("should pop the last item of the list", async () => {
        assert.strictEqual(await list.pop(), "Cool");
    });

    it("should shift the first item of the list", async () => {
        assert.strictEqual(await list.shift(), "Hello");
    });

    it("should unshift a value into the list", async () => {
        assert.strictEqual(await list.unshift("Hello"), 4);
    });

    it("should unshift multiple values into the list", async () => {
        assert.strictEqual(await list.unshift("Good", "Morning"), 6);
    });

    it("should check if a value exists in the list", async () => {
        assert.strictEqual(await list.has("Good"), true);
        assert.strictEqual(await list.includes("Good"), true);
        assert.strictEqual(await list.includes("Morning"), true);
        assert.strictEqual(await list.includes("Hola"), false);
    });

    it("should get the index of a value", async () => {
        assert.strictEqual(await list.indexOf("Good"), 0);
        assert.strictEqual(await list.indexOf("Morning"), 1);
        assert.strictEqual(await list.indexOf("Hola"), -1);
    });

    it("should get the value at a specified index", async () => {
        assert.deepStrictEqual([
            await list.get(0),
            await list.get(1)
        ], ["Good", "Morning"]);
    });

    it("should set the value at a specified index", async () => {
        assert.deepStrictEqual([
            await list.set(0, "Nice"),
            await list.set(1, "Day")
        ], ["Nice", "Day"]);
    });

    it("should delete one or more elements", async () => {
        await list.push("a", "b", "c", "d", "a", "b");
        assert.strictEqual(await list.delete("a", "b", "c", "d"), true);
    });

    it("should get all values from the list", async () => {
        assert.deepStrictEqual(await list.values(), [
            "Nice",
            "Day",
            "Hello",
            "World",
            "Hi",
            "Ayon"
        ]);
    });

    it("should slice the list with only start argument", async () => {
        assert.deepStrictEqual(await list.slice(1), [
            "Day",
            "Hello",
            "World",
            "Hi",
            "Ayon"
        ]);
    });

    it("should slice the list with both start and end argument", async () => {
        assert.deepStrictEqual(await list.slice(1, 4), [
            "Day",
            "Hello",
            "World"
        ]);
        assert.deepStrictEqual(await list.slice(1, 0), []);
    });

    it("should slice the list with minus start argument", async () => {
        assert.deepStrictEqual(await list.slice(-2), ["Hi", "Ayon"]);
    });

    it("should slice the list with minus end argument", async () => {
        assert.deepStrictEqual(await list.slice(0, -2), [
            "Nice",
            "Day",
            "Hello",
            "World"
        ]);
    });

    it("should splice a value and return it from the list", async () => {
        assert.deepStrictEqual(await list.splice(1), ["Day"]);
        assert.deepStrictEqual(await list.values(), [
            "Nice",
            "Hello",
            "World",
            "Hi",
            "Ayon"
        ]);
    });

    it("should splice multiple values and return them from the list", async () => {
        assert.deepStrictEqual(await list.splice(1, 2), ["Hello", "World"]);
        assert.deepStrictEqual(await list.values(), ["Nice", "Hi", "Ayon"]);
    });

    it("should splice values and insert new values into the list", async () => {
        assert.deepStrictEqual(await list.splice(1, 1, "Day", "Hello"), ["Hi"]);
        assert.deepStrictEqual(await list.values(), ["Nice", "Day", "Hello", "Ayon"]);
        await list.splice(1, 2, "Hi");
    });

    it("should reverse all values in the list", async () => {
        assert.deepStrictEqual(await list.reverse(), ["Ayon", "Hi", "Nice"]);
        assert.deepStrictEqual(await list.values(), ["Ayon", "Hi", "Nice"]);
    });

    it("should sort the list in ascending order", async () => {
        assert.deepStrictEqual(await list.sort(), ["Ayon", "Hi", "Nice"]);
        assert.deepStrictEqual(await list.values(), ["Ayon", "Hi", "Nice"]);
        assert.deepStrictEqual(await list.sort(1), ["Ayon", "Hi", "Nice"]);
        assert.deepStrictEqual(await list.values(), ["Ayon", "Hi", "Nice"]);
    });

    it("should sort the list in descending order", async () => {
        assert.deepStrictEqual(await list.sort(-1), ["Nice", "Hi", "Ayon"]);
        assert.deepStrictEqual(await list.values(), ["Nice", "Hi", "Ayon"]);
    });

    it("should get the size of the list", async () => {
        assert.strictEqual(await list.size(), 3);
        assert.strictEqual(await list.length(), 3);
    });

    it("should iterate all elements in the list", async () => {
        let values = [];
        let indexes = [];
        let container = {
            values: [],
            indexes: []
        };

        await list.forEach((value, index) => {
            values.push(value);
            indexes.push(index);
        });
        await list.forEach(function (this: any, value, index) {
            this.values.push(value);
            this.indexes.push(index);
        }, container);

        assert.deepStrictEqual(values, ["Nice", "Hi", "Ayon"]);
        assert.deepStrictEqual(indexes, [0, 1, 2]);
        assert.deepStrictEqual(container, {
            values: ["Nice", "Hi", "Ayon"],
            indexes: [0, 1, 2]
        });
    });

    it("should refer to the same list when providing the same name", async () => {
        let _list = redis.List.of("foo");
        assert.deepStrictEqual(await list.values(), await _list.values());
    });

    it("should clear the list", async () => {
        assert.strictEqual(await list.clear(), undefined);
        assert.deepStrictEqual(await list.values(), []);
    });
});

describe("RedisSet", () => {
    let set = redis.Set.of("foo");

    it("should add a value into the set", async () => {
        assert.strictEqual(await set.add("Hello"), set);
    });

    it("should add multiple values into the set", async () => {
        assert.strictEqual(await set.add("World", "Hi", "Ayon"), set);
    });

    it("should check if a value exists in the set", async () => {
        assert.strictEqual(await set.has("Hello"), true);
        assert.strictEqual(await set.has("World"), true);
        assert.strictEqual(await set.has("Hi"), true);
        assert.strictEqual(await set.has("Ayon"), true);
        assert.strictEqual(await set.has("Cool"), false);
    });

    it("should delete a value from the set", async () => {
        assert.strictEqual(await set.delete("Hello"), true);
        assert.strictEqual(await set.has("Hello"), false);
    });

    it("should delete multiple values from the set", async () => {
        assert.strictEqual(await set.delete("Hello"), false);
        assert.strictEqual(await set.delete("World", "Hi", "Ayon"), true);
        assert.strictEqual(await set.has("World"), false);
        assert.strictEqual(await set.has("Hi"), false);
        assert.strictEqual(await set.has("Ayon"), false);
    });

    it("should get the size of the set", async () => {
        await set.add("Hello", "World");
        assert.strictEqual(await set.size(), 2);
    });

    it("should get all values of the set", async () => {
        assert.deepStrictEqual((await set.values()).sort(), ["Hello", "World"]);
    });

    it("should not add duplicate value into the set", async () => {
        await set.add("Hello");
        assert.deepStrictEqual((await set.values()).sort(), ["Hello", "World"]);
    });

    it("should pop a random value from the set", async () => {
        let value = await set.pop();
        assert.ok(["Hello", "World"].includes(value));
        assert.strictEqual(await set.size(), 1);
        await set.add(value);
    });

    it("should pop multiple random values from the set", async () => {
        let values = await set.pop(2);
        assert.deepStrictEqual(values.sort(), ["Hello", "World"]);
        assert.strictEqual(await set.size(), 0);
        await set.add(...values);
    });

    it("should return a random value from the set", async () => {
        let value = await set.random();
        assert.ok(["Hello", "World"].includes(value));
        assert.strictEqual(await set.size(), 2);
    });

    it("should return multiple random values from the set", async () => {
        let values = await set.random(2);
        assert.deepStrictEqual(values.sort(), ["Hello", "World"]);
        assert.strictEqual(await set.size(), 2);
    });

    it("should get the different values from another set", async () => {
        let _set = redis.Set.of("bar");
        await _set.add("Hello", "Ayon");
        assert.deepStrictEqual(await set.difference(_set), ["World"]);
        await _set.clear();
    });

    it("should get the different values from other sets", async () => {
        let _set = redis.Set.of("bar");
        let _set2 = redis.Set.of("bar2");
        await _set.add("Hello", "Ayon");
        await _set2.add("Hi", "Ayon");
        assert.deepStrictEqual(await set.difference(_set, _set2), ["World"]);
        await _set.clear();
        await _set2.clear();
    });

    it("should get the intersection values from another set", async () => {
        let _set = redis.Set.of("bar");
        await _set.add("Hello", "Ayon");
        assert.deepStrictEqual(await set.intersection(_set), ["Hello"]);
        await _set.clear();
    });

    it("should get the intersection values from other sets", async () => {
        let _set = redis.Set.of("bar");
        let _set2 = redis.Set.of("bar2");
        await _set.add("Hello", "Ayon");
        await _set2.add("Hello", "Ayon");
        assert.deepStrictEqual(await set.intersection(_set, _set2), ["Hello"]);
        await _set.clear();
        await _set2.clear();
    });

    it("should get the union values from another set", async () => {
        let _set = redis.Set.of("bar");
        await _set.add("Hello", "Ayon");
        assert.deepStrictEqual((await set.union(_set)).sort(), [
            "Ayon",
            "Hello",
            "World"
        ]);
        await _set.clear();
    });

    it("should get the union values from other sets", async () => {
        let _set = redis.Set.of("bar");
        let _set2 = redis.Set.of("bar2");
        await _set.add("Hello", "Ayon");
        await _set2.add("Hi", "Ayon");
        assert.deepStrictEqual((await set.union(_set)).sort(), [
            "Ayon",
            "Hello",
            "World"
        ]);
        await _set.clear();
        await _set2.clear();
    });

    it("should iterate all elements in the set", async () => {
        let values = [];
        let container = { values: [] };
        let _values = await set.values();

        await set.forEach((value) => {
            values.push(value);
        });
        await set.forEach(function (this: any, value) {
            this.values.push(value);
        }, container);

        assert.deepStrictEqual(values, _values);
        assert.deepStrictEqual(container, {
            values: _values,
        });
    });

    it("should refer to the same set when providing the same name", async () => {
        let _set = redis.Set.of("foo");
        assert.deepStrictEqual(await set.values(), await _set.values());
    });

    it("should clear the set", async () => {
        assert.strictEqual(await set.clear(), undefined);
        assert.strictEqual(await set.size(), 0);
    });
});

describe("RedisHashMap", () => {
    let map = redis.HashMap.of("foo");

    it("should set value to a key in the map", async () => {
        assert.strictEqual(await map.set("bar", "Hello, World!"), map);
    });

    it("should set values to multiple keys in the map", async () => {
        assert.strictEqual(await map.set({
            "greet": "Hello, World!",
            "answer": "Hi, Ayon!"
        }), map);
    });

    it("should check if a key exists in the map", async () => {
        assert.strictEqual(await map.has("bar"), true);
        assert.strictEqual(await map.has("foo"), false);
    });

    it("should get value by a key", async () => {
        assert.strictEqual(await map.get("bar"), "Hello, World!");
    });

    it("should delete a value by a key", async () => {
        assert.strictEqual(await map.delete("bar"), true);
        assert.strictEqual(await map.has("bar"), false);
    });

    it("should get the size of the map", async () => {
        assert.strictEqual(await map.size(), 2);
    });

    it("should get all the keys of the map", async () => {
        assert.deepStrictEqual(await map.keys(), ["greet", "answer"]);
    });

    it("should get all the values of the map", async () => {
        assert.deepStrictEqual(await map.values(), [
            "Hello, World!",
            "Hi, Ayon!"
        ]);
    });

    it("should get all key-value pairs of the map", async () => {
        assert.deepStrictEqual(await map.toObject(), {
            greet: "Hello, World!",
            answer: "Hi, Ayon!"
        });
    });

    it("should increase the value of a key", async () => {
        await map.set("count", "123");
        assert.strictEqual(await map.increase("count"), "124");
        assert.strictEqual(await map.increase("count", 2), "126");
        assert.strictEqual(await map.increase("count", 1.5), "127.5");
        assert.strictEqual(await map.get("count"), "127.5");
    });

    it("should decrease the value of a key", async () => {
        await map.set("count", "123");
        assert.strictEqual(await map.decrease("count"), "122");
        assert.strictEqual(await map.decrease("count", 2), "120");
        assert.strictEqual(await map.decrease("count", 1.5), "118.5");
        assert.strictEqual(await map.get("count"), "118.5");
    });

    it("should iterate all elements in the map", async () => {
        let data = {};
        let container = { data: {} };
        let _data = await map.toObject();

        await map.forEach((value, key) => {
            data[key] = value;
        });
        await map.forEach(function (this: any, value, key) {
            this.data[key] = value;
        }, container);

        assert.deepStrictEqual(data, _data);
        assert.deepStrictEqual(container, {
            data: _data,
        });
    });

    it("should refer to the same map when providing the same name", async () => {
        let _map = redis.HashMap.of("foo");
        assert.deepStrictEqual(await map.toObject(), await _map.toObject());
    });

    it("should clear the map", async () => {
        assert.strictEqual(await map.clear(), undefined);
        assert.strictEqual(await map.size(), 0);
    });
});

describe("RedisSortedSet", () => {
    let set = redis.SortedSet.of("foo");

    it("should add a value into the set", async () => {
        assert.strictEqual(await set.add("Hello"), set);
        assert.strictEqual(await set.add("World", 2), set);
    });

    it("should add multiple values into the set", async () => {
        assert.strictEqual(await set.add({
            "Hi": 3,
            "Ayon": 4
        }), set);
    });

    it("should check if a value exists in the set", async () => {
        assert.strictEqual(await set.has("Hello"), true);
        assert.strictEqual(await set.has("hello"), false);
    });

    it("should delete a value from the set", async () => {
        assert.strictEqual(await set.delete("Hello"), true);
        assert.strictEqual(await set.delete("Hello"), false);
        assert.strictEqual(await set.has("Hello"), false);
        await set.add("Hello", 1);
    });

    it("should get the index of a value in the set", async () => {
        assert.strictEqual(await set.indexOf("Hello"), 0);
        assert.strictEqual(await set.indexOf("World"), 1);
        assert.strictEqual(await set.indexOf("hello"), -1);
    });

    it("should get the score of a value in the set", async () => {
        assert.strictEqual(await set.scoreOf("Hello"), 1);
        assert.strictEqual(await set.scoreOf("World"), 2);
        assert.strictEqual(await set.scoreOf("hello"), null);
    });

    it("should get all scores of the set in a key-value pair", async () => {
        assert.deepStrictEqual(await set.scores(), {
            "Hello": 1,
            "World": 2,
            "Hi": 3,
            "Ayon": 4
        });
    });

    it("should get all values in the set", async () => {
        assert.deepStrictEqual(await set.values(), [
            "Hello",
            "World",
            "Hi",
            "Ayon"
        ]);
    });

    it("should get the size of the set", async () => {
        assert.strictEqual(await set.size(), 4);
    });

    it("should set the score of a value in the set", async () => {
        assert.strictEqual(await set.set("Ayon", 10), 10);
        assert.strictEqual(await set.scoreOf("Ayon"), 10);
        await set.set("Ayon", 4);
    });

    it("should increase the score of a value", async () => {
        assert.strictEqual(await set.increase("Ayon"), 5);
        assert.strictEqual(await set.scoreOf("Ayon"), 5);
    });

    it("should increase the score of a value with specified increment", async () => {
        assert.strictEqual(await set.increase("Ayon", 2), 7);
        assert.strictEqual(await set.scoreOf("Ayon"), 7);
    });

    it("should decrease the score of a value", async () => {
        assert.strictEqual(await set.decrease("Ayon"), 6);
        assert.strictEqual(await set.scoreOf("Ayon"), 6);
    });

    it("should decrease the score of a value with specified increment", async () => {
        assert.strictEqual(await set.decrease("Ayon", 2), 4);
        assert.strictEqual(await set.scoreOf("Ayon"), 4);
    });

    it("should pop the last value of the set", async () => {
        assert.strictEqual(await set.pop(), "Ayon");
        assert.deepStrictEqual(await set.values(), ["Hello", "World", "Hi"]);
        await set.add("Ayon", 4);
    });

    it("should pop the last value with score of the set", async () => {
        assert.deepStrictEqual(await set.pop(true), ["Ayon", 4]);
        assert.deepStrictEqual(await set.values(), ["Hello", "World", "Hi"]);
        await set.add("Ayon", 4);
    });

    it("should shift the last value of the set", async () => {
        assert.strictEqual(await set.shift(), "Hello");
        assert.deepStrictEqual(await set.values(), ["World", "Hi", "Ayon"]);
        await set.add("Hello", 1);
    });

    it("should shift the last value with score of the set", async () => {
        assert.deepStrictEqual(await set.shift(true), ["Hello", 1]);
        assert.deepStrictEqual(await set.values(), ["World", "Hi", "Ayon"]);
        await set.add("Hello", 1);
    });

    it("should slice the set with only start argument", async () => {
        assert.deepStrictEqual(await set.slice(1), ["World", "Hi", "Ayon"]);
        assert.deepStrictEqual(await set.values(), ["Hello", "World", "Hi", "Ayon"]);
    });

    it("should slice the set with start and end argument", async () => {
        assert.deepStrictEqual(await set.slice(1, 3), ["World", "Hi"]);
        assert.deepStrictEqual(await set.values(), ["Hello", "World", "Hi", "Ayon"]);
    });

    it("should slice the set with minus start argument", async () => {
        assert.deepStrictEqual(await set.slice(-2), ["Hi", "Ayon"]);
        assert.deepStrictEqual(await set.values(), ["Hello", "World", "Hi", "Ayon"]);
    });

    it("should slice the set with start end minus end argument", async () => {
        assert.deepStrictEqual(await set.slice(1, -1), ["World", "Hi"]);
        assert.deepStrictEqual(await set.values(), ["Hello", "World", "Hi", "Ayon"]);
    });

    it("should splice a value and return it from the list", async () => {
        assert.deepStrictEqual(await set.splice(1), ["World"]);
        assert.deepStrictEqual(await set.values(), ["Hello", "Hi", "Ayon"]);
        await set.add("World", 2);
    });

    it("should splice multiple values and return them from the list", async () => {
        assert.deepStrictEqual(await set.splice(1, 2), ["World", "Hi"]);
        assert.deepStrictEqual(await set.values(), ["Hello", "Ayon"]);
        await set.add({ "World": 2, "Hi": 3 });
    });

    it("should count the elements with a given score in the set", async () => {
        assert.strictEqual(await set.countByScore(1), 1);
    });

    it("should count the elements between two scores of the set", async () => {
        assert.strictEqual(await set.countByScore(1, 4), 4);
        assert.strictEqual(await set.countByScore(2, 3), 2);
    });

    it("should slice values between two scores of the set", async () => {
        assert.deepStrictEqual(await set.sliceByScore(2, 3), ["World", "Hi"]);
        assert.deepStrictEqual(await set.values(), ["Hello", "World", "Hi", "Ayon"]);
    });

    it("should splice values between two scores of the set", async () => {
        assert.deepStrictEqual(await set.spliceByScore(2, 3), ["World", "Hi"]);
        assert.deepStrictEqual(await set.values(), ["Hello", "Ayon"]);
    });

    it("should iterate all elements in the map", async () => {
        let data = {};
        let container = { data: {} };
        let _data = await set.scores();

        await set.forEach((value, score) => {
            data[value] = score;
        });
        await set.forEach(function (this: any, value, score) {
            this.data[value] = score;
        }, container);

        assert.deepStrictEqual(data, _data);
        assert.deepStrictEqual(container, {
            data: _data,
        });
    });

    it("should clear the set", async () => {
        assert.strictEqual(await set.clear(), undefined);
        assert.strictEqual(await set.size(), 0);
    });
});

describe("RedisLock", () => {
    it("should lock the key and release it", async () => {
        let key = "lockTest";
        let lock = redis.Lock.of(key);

        assert.strictEqual(await lock.acquire(), true);
        assert.strictEqual(await lock.acquire(), false);
        assert.strictEqual(await redis.Lock.has(key), true);

        await lock.release();
        assert.strictEqual(await redis.Lock.has(key), false);
        assert.strictEqual(await lock.acquire(), true);
        await lock.release();
    });

    it("should lock the key the force to release after timeout", async () => {
        let key = "lockTest2";
        let lock = redis.Lock.of(key);

        assert.strictEqual(await lock.acquire(1), true);

        await sleep(1005);
        assert.strictEqual(await lock.acquire(), true);
        await lock.release();
    });
});

describe("RedisQueue", () => {
    it("should run two tasks one by one", async () => {
        let queue = redis.Queue.of("test");
        let result: number[] = [];
        let jobs = [
            queue.run(async () => {
                await sleep(100);
                result.push(1);
                return 1;
            }),
            queue.run(async () => {
                // This task will only be run after the above one completes.
                result.push(2);
                return 2;
            })
        ];

        await sleep(100);
        assert.strictEqual(await redis.Queue.has("test"), true);

        let result2 = await Promise.all(jobs);

        assert.deepStrictEqual(result, [1, 2]);
        assert.deepStrictEqual(result2, [1, 2]);
    });
});

describe("RedisThrottle", () => {
    it("should pend multiple tasks but only run one of them", async () => {
        let throttle = redis.Throttle.of("test");
        let count = 0;
        let result = await Promise.all(
            new Array(10).fill(void 0).map(_ => throttle.run((firstName, lastName) => {
                count++;
                return firstName + " " + lastName;
            }, 1, "Ayon", "Lee"))
        );

        assert.deepStrictEqual(result, new Array(10).fill("Ayon Lee"));
        assert.strictEqual(count, 1);
        await throttle.clear();
    });

    it("should pend multiple tasks and run them accordingly", async function () {
        this.timeout(15000);
        let throttle = redis.Throttle.of("test");
        let count = 0;
        let result = [];

        for (let i = 0; i < 3; i++) {
            result.push(await throttle.run(async (firstName, lastName) => {
                count++;
                return firstName + " " + lastName;
            }, 1, "Ayon", "Lee"));
            await sleep(1005); // set +5 to ensure the previous job is finished
        }

        assert.deepStrictEqual(result, new Array(3).fill("Ayon Lee"));
        assert.strictEqual(count, 3);
        await throttle.clear();
    });

    it("should throw the same error if calls multiple times of a throttle", async function () {
        this.timeout(15000);
        let throttle = redis.Throttle.of("test");
        let count = 0;
        let result = [];

        for (let i = 0; i < 2; i++) {
            try {
                await throttle.run(async () => {
                    count++;
                    throw new Error("Something went wrong");
                }, 2);
            } catch (e) {
                result.push(e);
            }
        }

        assert.strictEqual(count, 1);
        assert.strictEqual(result.length, 2);
        assert.strictEqual(format(result[0]), format(result[1]));
        await throttle.clear();
    });
});

describe("RedisMessageQueue", () => {
    it("should subscribe a message channel and publish a message", async () => {
        let mq = redis.MessageQueue.of("foo");
        let result: string;

        mq.addListener(msg => {
            result = msg;
        });
        mq.publish("Hello, World!");

        while (true) {
            await sleep(50);
            if (!!result) {
                break;
            }
        }

        assert.strictEqual(result, "Hello, World!");
        assert.strictEqual(await redis.MessageQueue.has("foo"), true);
    });
});

describe("RedisFacadeUtils & RedisFacadeType", () => {
    it("should check if the two facades refer to the same data.", async () => {
        await new Promise(setImmediate);
        assert(redis.is(redis.String.of("foo"), redis.String.of("foo")));
        assert(redis.is(redis.List.of("foo"), redis.List.of("foo")));
        assert(redis.is(redis.HashMap.of("foo"), redis.HashMap.of("foo")));
        assert(redis.is(redis.Set.of("foo"), redis.Set.of("foo")));
        assert(redis.is(redis.SortedSet.of("foo"), redis.SortedSet.of("foo")));
        assert(!redis.is(redis.String.of("foo"), redis.String.of("bar")));
        assert(!redis.is(redis.List.of("foo"), redis.List.of("bar")));
        assert(!redis.is(redis.HashMap.of("foo"), redis.HashMap.of("bar")));
        assert(!redis.is(redis.Set.of("foo"), redis.Set.of("bar")));
        assert(!redis.is(redis.SortedSet.of("foo"), redis.SortedSet.of("bar")));
        assert(!redis.is(redis.String.of("foo"), <any>redis.List.of("foo")));
        assert(!redis.is(redis.List.of("foo"), <any>redis.HashMap.of("foo")));
        assert(!redis.is(redis.HashMap.of("foo"), <any>redis.Set.of("foo")));
        assert(!redis.is(redis.Set.of("foo"), <any>redis.SortedSet.of("foo")));
        assert(!redis.is(redis.SortedSet.of("foo"), <any>redis.String.of("foo")));
    });

    it("should check if a key exists in redis store", async () => {
        assert.strictEqual(await redis.has("foo"), false);
        await redis.String.of("foo").set("Hello, World!");
        assert.strictEqual(await redis.has("foo"), true);
    });

    it("should delete a key from the redis store", async () => {
        assert.strictEqual(await redis.delete("foo"), true);
        assert.strictEqual(await redis.delete("foo"), false);
        assert.strictEqual(await redis.has("foo"), false);
    });

    it("should get the type of a key in the redis store", async () => {
        assert.strictEqual(await redis.typeof("foo"), "none");

        await redis.String.of("foo").set("Hello, World!");
        assert.strictEqual(await redis.typeof("foo"), "string");

        await redis.delete("foo");
        await redis.List.of("foo").push("Hello", "World");
        assert.strictEqual(await redis.typeof("foo"), "list");

        await redis.delete("foo");
        await redis.Set.of("foo").add("Hello", "World");
        assert.strictEqual(await redis.typeof("foo"), "set");

        await redis.delete("foo");
        await redis.SortedSet.of("foo").add("Hello", 1);
        assert.strictEqual(await redis.typeof("foo"), "zset");

        await redis.delete("foo");
        await redis.HashMap.of("foo").set("Hello", "World");
        assert.strictEqual(await redis.typeof("foo"), "hash");
    });

    it("should execute a redis command", async () => {
        assert.strictEqual(await redis.exec("type", "foo"), "hash");
    });

    it("should check if a key exists as string type", async () => {
        assert.strictEqual(await redis.String.has("foo"), false);
        await redis.delete("foo");
        await redis.String.of("foo").set("Hello, World!");
        assert.strictEqual(await redis.String.has("foo"), true);
    });

    it("should check if a key exists as list type", async () => {
        assert.strictEqual(await redis.List.has("foo"), false);
        await redis.delete("foo");
        await redis.List.of("foo").push("Hello", "World!");
        assert.strictEqual(await redis.List.has("foo"), true);
    });

    it("should check if a key exists as set type", async () => {
        assert.strictEqual(await redis.Set.has("foo"), false);
        await redis.delete("foo");
        await redis.Set.of("foo").add("Hello", "World!");
        assert.strictEqual(await redis.Set.has("foo"), true);
    });

    it("should check if a key exists as sorted set type", async () => {
        assert.strictEqual(await redis.SortedSet.has("foo"), false);
        await redis.delete("foo");
        await redis.SortedSet.of("foo").add("Hello", 1);
        assert.strictEqual(await redis.SortedSet.has("foo"), true);
    });

    it("should check if a key exists as hash map type", async () => {
        assert.strictEqual(await redis.HashMap.has("foo"), false);
        await redis.delete("foo");
        await redis.HashMap.of("foo").set("Hello", "World!");
        assert.strictEqual(await redis.HashMap.has("foo"), true);
    });
});