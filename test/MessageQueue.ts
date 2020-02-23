import * as assert from "assert";
import sleep from "@hyurl/utils/sleep";
import redis from "./redis";

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