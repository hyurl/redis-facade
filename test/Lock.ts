import * as assert from "assert";
import sleep from "@hyurl/utils/sleep";
import redis from "./redis";

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