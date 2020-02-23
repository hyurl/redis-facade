import * as assert from "assert";
import redis from "./redis";

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