import * as assert from "assert";
import { createClient } from "redis";
import createFacade from "..";

let redis = createFacade(createClient());

function sleep(timeout: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, timeout));
}

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
        assert.strictEqual(await str.getLength(), 13);
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
        await str.setTTL(1);
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
        let _str = await redis.String.of("foo");
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

    it("should get a value at a specified index of the list", async () => {
        assert.deepStrictEqual([
            await list.valueAt(0),
            await list.valueAt(1)
        ], ["Good", "Morning"]);
    });

    it("should get all values from the list", async () => {
        assert.deepStrictEqual(await list.values(), [
            "Good",
            "Morning",
            "Hello",
            "World",
            "Hi",
            "Ayon"
        ]);
    });

    it("should slice the list with only start position", async () => {
        assert.deepStrictEqual(await list.slice(1), [
            "Morning",
            "Hello",
            "World",
            "Hi",
            "Ayon"
        ]);
    });

    it("should slice the list with both start and end position", async () => {
        assert.deepStrictEqual(await list.slice(1, 4), [
            "Morning",
            "Hello",
            "World"
        ]);
    });

    it("should slice the list with minus end position", async () => {
        assert.deepStrictEqual(await list.slice(0, -2), [
            "Good",
            "Morning",
            "Hello",
            "World"
        ]);
    });

    it("should splice a value and return it from the list", async () => {
        assert.deepStrictEqual(await list.splice(1), ["Morning"]);
        assert.deepStrictEqual(await list.values(), [
            "Good",
            "Hello",
            "World",
            "Hi",
            "Ayon"
        ]);
    });

    it("should splice multiple values and return them from the list", async () => {
        assert.deepStrictEqual(await list.splice(1, 2), ["Hello", "World"]);
        assert.deepStrictEqual(await list.values(), ["Good", "Hi", "Ayon"]);
    });

    it("should get the length of the list", async () => {
        assert.strictEqual(await list.getLength(), 3);
    });

    it("should refer to the same list when providing the same name", async () => {
        let _list = await redis.List.of("foo");
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
        await set.add("Hello");
        await set.add("World");
        assert.strictEqual(await set.getSize(), 2);
    });

    it("should get all values of the set", async () => {
        assert.deepStrictEqual(await set.values(), ["Hello", "World"]);
    });

    it("should not add duplicate value into the set", async () => {
        await set.add("Hello");
        assert.deepStrictEqual(await set.values(), ["Hello", "World"]);
    });

    it("should refer to the same set when providing the same name", async () => {
        let _set = redis.Set.of("foo");
        assert.deepStrictEqual(await set.values(), await _set.values());
    });

    it("should clear the set", async () => {
        assert.strictEqual(await set.clear(), undefined);
        assert.strictEqual(await set.getSize(), 0);
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
        assert.strictEqual(await map.getSize(), 2);
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
        assert.deepStrictEqual(await map.pairs(), {
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

    it("should refer to the same map when providing the same name", async () => {
        let _map = redis.HashMap.of("foo");
        assert.deepStrictEqual(await map.pairs(), await _map.pairs());
    });

    it("should clear the map", async () => {
        assert.strictEqual(await map.clear(), undefined);
        assert.strictEqual(await map.getSize(), 0);
    });
});