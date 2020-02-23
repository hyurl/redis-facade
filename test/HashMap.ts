import * as assert from "assert";
import redis from "./redis";

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