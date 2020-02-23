import * as assert from "assert";
import redis from "./redis";

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