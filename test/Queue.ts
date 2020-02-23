import * as assert from "assert";
import sleep from "@hyurl/utils/sleep";
import redis from "./redis";

describe("RedisQueue", () => {
    it("should run two tasks one by one", async () => {
        let queue = redis.Queue.of("test");
        let result: number[] = [];
        let jobs = [
            queue.run(async () => {
                await sleep(100);
                result.push(1);
                return 1;
            }),
            queue.run(async () => {
                // This task will only be run after the above one completes.
                result.push(2);
                return 2;
            })
        ];

        await sleep(100);
        assert.strictEqual(await redis.Queue.has("test"), true);

        let result2 = await Promise.all(jobs);

        assert.deepStrictEqual(result, [1, 2]);
        assert.deepStrictEqual(result2, [1, 2]);
    });
});