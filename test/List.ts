import * as assert from "assert";
import redis from "./redis";

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