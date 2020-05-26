# Redis Facade

**Manipulates redis data in JavaScript vernacular.**

This package help you bind a Redis key to a JavaScript variable with precise
data type, and manipulate the specific data with similar methods borrowed from
common JavaScript types, which hides the implementation details and differences
between Redis commands and programmatic preferences.

## Install

(Install **redis** along with **redis-facade**.)

```
npm i redis redis-facade
```

## Example

```javascript
import { createClient } from "redis";
import createRedisFacade from "redis-facade";

const redis = createRedisFacade(createClient());

(async () => {
    var str = redis.String.of("myString");

    await str.set("Hello, World!");

    console.log(await str.get()); // Hello, World!
    console.log(await str.slice(7, -1)); // World
    console.log(await str.startsWith("Hello")); // true
    console.log(await str.endsWith("!")); // true
    // ...
})();

(async () => {
    var list = redis.List.of("myList");

    await list.push("Hello", "World");

    console.log(await list.values()); // ["Hello", "World"]
    console.log(await list.slice(1)); // ["World"]
    console.log(await list.pop()); // "World"
    console.log(await list.includes("Hello")); // true
    console.log(await list.indexOf("Hello")); // 0
    console.log(await list.get(0)); // Hello
    console.log(await list.size()); // 1
    // ...
})();

(async () => {
    var map = redis.HashMap.of("myMap");

    await map.set("foo", "Hello");
    await map.set("bar", "World");

    console.log(await map.get("foo")); // Hello
    console.log(await map.has("foo")); // true
    console.log(await map.delete("foo")); // true
    console.log(await map.keys()); // ["bar"]
    console.log(await map.values()); // ["World"]
    console.log(await map.toObject()); // { bar: "World" }
    // ...
})();

(async () => {
    var set = redis.Set.of("mySet");

    await set.add("Hello", "World");

    console.log(await set.values()); // ["Hello", "World"]
    console.log(await set.has("Hello")); // true
    console.log(await set.delete("World")); // true
    console.log(await set.size()); // 1
    console.log(await set.random()); // Hello
    // ...
})();

(async () => {
    var zset = redis.SortedSet.of("mySortedSet");

    await zset.add("Hello", 1);
    await zset.add("World", 2);

    console.log(await zset.indexOf("Hello")); // 0
    console.log(await zset.scoreOf("Hello")); // 1
    console.log(await zset.pop()); // World
    console.log(await zset.size()); // 1
    // ...
})();
```

For full API support, check [index.d.ts](./src/index.ts).