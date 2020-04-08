import * as assert from "assert";
import sleep from "@hyurl/utils/sleep";
import redis from "./redis";
import { format } from "util";

describe("RedisThrottle", () => {
    it("should append multiple tasks but only run one of them", async () => {
        let throttle = redis.Throttle.of("test");
        let count = 0;
        let result = await Promise.all(
            new Array(10).fill(void 0).map(_ => throttle.run((firstName, lastName) => {
                count++;
                return firstName + " " + lastName;
            }, 1, "Ayon", "Lee"))
        );

        assert.deepStrictEqual(result, new Array(10).fill("Ayon Lee"));
        assert.strictEqual(count, 1);
        await throttle.clear();
    });

    it("should append multiple tasks and run them accordingly", async function () {
        this.timeout(15000);
        let throttle = redis.Throttle.of("test");
        let count = 0;
        let result = [];

        for (let i = 0; i < 3; i++) {
            result.push(await throttle.run(async (firstName, lastName) => {
                count++;
                return firstName + " " + lastName;
            }, 1, "Ayon", "Lee"));
            await sleep(1005); // set +5 to ensure the previous job is finished
        }

        assert.deepStrictEqual(result, new Array(3).fill("Ayon Lee"));
        assert.strictEqual(count, 3);
        await throttle.clear();
    });

    it("should throw the same error if calls multiple times of a throttle", async function () {
        this.timeout(15000);
        let throttle = redis.Throttle.of("test");
        let count = 0;
        let result = [];

        for (let i = 0; i < 2; i++) {
            try {
                await throttle.run(async () => {
                    count++;
                    throw new Error("Something went wrong");
                }, 2);
            } catch (e) {
                result.push(e);
            }
        }

        assert.strictEqual(count, 1);
        assert.strictEqual(result.length, 2);
        assert.strictEqual(format(result[0]), format(result[1]));
        await throttle.clear();
    });
});