import "source-map-support/register";
import redis from "./redis";

import "./String";
import "./List";
import "./Set";
import "./SortedSet";
import "./HashMap";
import "./Lock";
import "./MessageQueue";
import "./Queue";
import "./Throttle";

after(async () => {
    await redis.delete("foo");
    await redis.disconnect();
});