import * as assert from "assert";
import sleep from "@hyurl/utils/sleep";
import redis from "./redis";

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