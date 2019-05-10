import * as assert from "assert";
import * as redis from "redis";
import createDataInterface from "..";

let con = redis.createClient();
let data = createDataInterface(con);

describe("RedisString", () => {
    it("should set a string with specified key as expected", async () => {
        let value = await data.String.set("foo", "Hello, World!");
        assert.strictEqual(value, "Hello, World!");
    });

    it("should get a string according to a specified key as expected", async () => {
        let value = await data.String.get("foo");
        assert.strictEqual(value, "Hello, World!");
    });
});