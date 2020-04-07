import * as assert from "assert";
import sleep from "@hyurl/utils/sleep";
import redis from "./redis";
import timestamp from "@hyurl/utils/timestamp";

describe("RedisThrottleQueue", () => {
    it("should start a queue and push data into it", async function () {
        this.timeout(5000);

        let queue = redis.ThrottleQueue.of("test");
        let user1 = { name: "Ayon", age: 24 };
        let user2 = { name: "Luna", age: 36 };
        let result: any[] = [];

        await queue.start(async (data: { name: string, age: number }) => {
            result.push(data);
        });

        assert.strictEqual(await queue.push(user1), true);
        assert.strictEqual(await queue.push(user2, {
            start: timestamp() + 1
        }), true);

        // ensure no duplicates
        assert.strictEqual(await queue.push(user1), false);
        assert.strictEqual(await queue.push(user2, {
            start: timestamp() + 1
        }), false);

        await sleep(3000);

        assert.deepStrictEqual(result, [user1, user2]);

        await queue.stop();
    });

    it("should start a queue with 2 tasks of concurrency", async function () {
        this.timeout(5000);

        let queue = redis.ThrottleQueue.of("test");
        let user1 = { name: "Ayon", age: 24 };
        let user2 = { name: "Luna", age: 36 };
        let result: any[] = [];

        await queue.start(async (data: { name: string, age: number }) => {
            result.push(data);
        }, 2);

        assert.strictEqual(await queue.push(user1), true);
        assert.strictEqual(await queue.push(user2), true);

        await sleep(4000);

        assert.deepStrictEqual(
            result.sort((a, b) => a.age - b.age),
            [user1, user2]
        );

        await queue.stop();
    });

    it("should start a queue with 2 seconds of interval", async function () {
        this.timeout(5000);

        let queue = redis.ThrottleQueue.of("test");
        let user1 = { name: "Ayon", age: 24 };
        let user2 = { name: "Luna", age: 36 };
        let result: any[] = [];

        await queue.start(async (data: { name: string, age: number }) => {
            result.push(data);
        }, 1, 2);

        assert.strictEqual(await queue.push(user1), true);
        assert.strictEqual(await queue.push(user2), true);

        await sleep(1500);
        assert.strictEqual(result.length, 0);

        await sleep(1000);
        assert.strictEqual(result.length, 1);

        await sleep(2000);
        assert.deepStrictEqual(
            result.sort((a, b) => a.age - b.age),
            [user1, user2]
        );

        await queue.stop();
    });
});