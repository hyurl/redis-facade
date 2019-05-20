# Redis Facade

**Manipulates redis data in javascript vernacular.**

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
    console.log(await list.valueAt(0)); // Hello
    console.log(await list.length()); // 1
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
    console.log(await map.getAll()); // { bar: "World" }
    // ...
})();

(async () => {
    var set = redis.Set.of("mySet");

    await set.add("Hello", "World");
})();
```

For full API support, check [index.d.ts](./index.d.ts).