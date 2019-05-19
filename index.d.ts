import { RedisClient } from "redis";

export const redis: unique symbol;
export const key: unique symbol;

export interface RedisOperator {
    /** Checks if a key exists in the Redis store. */
    has(key: string): Promise<boolean>;
    /** Deletes a key from the Redis store. */
    delete(key: string): Promise<boolean>;
    /** Returns the data type of a key in Redis store. */
    typeof(key: string): Promise<"string" | "list" | "set" | "zset" | "hash" | "none">;
    /** Executes a Redis command on a key along with optional arguments. */
    exec(cmd: string, key: string, ...args: any[]): Promise<string | number | string[]>;
    /** Executes a Redis command related to the Redis server itself. */
    exec(cmd: string, ...args: any[]): Promise<string>;
}

export interface RedisFacade {
    [redis]: RedisClient;
    /** A key in the Redis store that this instance binds to. */
    [key]: string;
    /** Sets Time-To-Live on the current key in seconds. */
    setTTL(seconds: number): Promise<number>;
    /** Gets Time-To-Live on the current key in seconds. */
    getTTL(): Promise<number>;
    /** Clears data and deletes the current key from the Redis store. */
    clear(): Promise<void>;
    /** Executes a Redis command on the current key with optional arguments. */
    exec(cmd: string, ...args: any[]): Promise<string | number | string[]>;
}

export interface RedisFacadeType<T> {
    readonly prototype: T;
    /** Creates a facade instance and associates to a key in Redis store. */
    of(key: string): T;
    /** Checks if a key exists in Redis store and is of the current type. */
    has(key: string): Promise<boolean>;
}

export interface RedisString extends RedisFacade {
    /** Sets the value of the string. */
    set(value: string, ttl?: number): Promise<string>;
    /** Gets the value of the string. */
    get(): Promise<string>;
    /** Extracts and returns a section of the string without modification. */
    slice(start: number, end?: number): Promise<string>;
    /** Checks if the string starts with the search string. */
    startsWith(str: string): Promise<boolean>;
    /** Checks if the string ends with the search string. */
    endsWith(str: string): Promise<boolean>;
    /**
     * Appends a string to the end of the string. **NOTE:** this method modifies
     * the original string.
     */
    append(str: string): Promise<string>;
    /**
     * Increases the string if it's a numeric string. **NOTE:** this method 
     * modifies the original string.
     */
    increase(increment?: number): Promise<string>;
    /**
     * Decreases the string if it's a numeric string. **NOTE:** this method 
     * modifies the original string.
     */
    decrease(decrement?: number): Promise<string>;
    /** Gets the length of the string. */
    length(): Promise<number>;
}

export interface RedisCompoundType extends RedisFacade {
    /** Returns all the values in the instance. */
    values(): Promise<string[]>;
}

export interface RedisList extends RedisCompoundType {
    /** Removes and returns the last element of the list. */
    pop(): Promise<string>;
    /** Adds one or more elements into the end of the list. */
    push(...values: string[]): Promise<number>;
    /** Removes and returns the first element of the list. */
    shift(): Promise<string>;
    /** Adds one or more elements into the head of the list. */
    unshift(...values: string[]): Promise<number>;
    /** Checks if a value exists in the list. */
    includes(value: string): Promise<boolean>;
    /** Gets the index of the target element. */
    indexOf(value: string): Promise<number>;
    /**
     * Gets and sets the value at the given index, the index must exist before
     * modifying its value.
     */
    valueAt(index: number, value?: string): Promise<string>;
    /** Extracts and returns a section of the list without modification. */
    slice(start: number, end?: number): Promise<string[]>;
    /**
     * Removes and returns elements from the list, and if necessary, inserts new
     * elements in their place.
     * @param count Number of elements to be deleted, `1` by default.
     * @param items New elements to be inserted.
     */
    splice(start: number, count?: number, ...items?: string[]): Promise<string[]>;
    /** Sorts the list in ascending (`1`, default) or descending (`-1`) order. */
    sort(order?: 1 | -1): Promise<string[]>;
    /** Reverses the order of the list. */
    reverse(): Promise<string[]>;
    /** Gets the length of the list. */
    length(): Promise<number>;
}

export interface RedisCollection extends RedisCompoundType {
    /** Gets the size of the collection. */
    size(): Promise<number>;
}

export interface RedisSetKind extends RedisCollection {
    /** Checks if a value exists in the set. */
    has(value: string): Promise<boolean>;
    /** Deletes one or more elements from the set. */
    delete(...values: string[]): Promise<boolean>;
}

export interface RedisSet extends RedisSetKind {
    /**
     * Adds one or more elements into the set. **NOTE:** how these elements are 
     * placed in the set is not guaranteed.
     */
    add(...values: string[]): Promise<this>;
    /** Removes and returns a random element from the set. */
    pop(): Promise<string>;
    /**
     * Removes and returns multiple random elements from the set according to 
     * the given count.
     */
    pop(count: number): Promise<string[]>;
    /** Returns a random element from the set without removing it. */
    random(): Promise<string>;
    /**
     * Returns multiple random elements from the set according to the given
     * count without removing them.
     */
    random(count: number): Promise<string[]>;
    /**
     * Gets the elements of difference between the current set and the given
     * sets.
     */
    difference(...sets: RedisSet[]): Promise<string[]>;
    /**
     * Gets the intersection elements between the current set and the given sets.
     */
    intersection(...sets: RedisSet[]): Promise<string[]>;
    /** Gets the union elements between the current set and the given sets. */
    union(...sets: RedisSet[]): Promise<string[]>;
}

export interface RedisHashMap extends RedisCollection {
    /** Sets a value to a key in the map. */
    set(key: string, value: string): Promise<this>;
    /** Sets multiple key-value pairs in the map. */
    set(pairs: { [key: string]: string }): Promise<this>;
    /** Gets a value according to the key of the map. */
    get(key: string): Promise<string>;
    /** Checks if a key exists in the map. */
    has(key: string): Promise<boolean>;
    /** Deletes a key and its value from the map. */
    delete(key: string): Promise<boolean>;
    /** Returns all the keys of the map. */
    keys(): Promise<string[]>;
    /** Returns all key-value pairs of the map. */
    pairs(): Promise<{ [key: string]: string }>;
    /** Increases a key's value if it's a numeric string. */
    increase(key: string, increment?: number): Promise<string>;
    /** Decreases a key's value if it's a numeric string. */
    decrease(key: string, decrement?: number): Promise<string>;
}

export interface RedisSortedSet extends RedisSetKind {
    /**
     * Adds a new element into the set, if `score` is omitted, elements will be
     * sorted alphabetically; if the element already exists, change its score 
     * instead.
     */
    add(value: string, score?: number): Promise<this>;
    /**
     * Adds multiple elements into the set with a key-value pair where keys are
     * the elements and values are their scores.
     */
    add(values: { [value: string]: number }): Promise<this>;
    /** Gets the index of an element, elements are sorted by their scores. */
    indexOf(value: string): Promise<number>;
    /** Gets the score of an element. */
    scoreOf(value: string): Promise<number>;
    scores(): Promise<{ [value: string]: number }>;
    /**
     * Increases the score of the an element, and adds the element with the 
     * `increment` as its score if it does not exist, returns the new score.
     */
    increase(value: string, increment?: number): Promise<number>;
    /**
     * Decreases the score of the an element, and adds the element with the 
     * `increment` as its score if it does not exist, returns the new score.
     */
    decrease(value: string, decrement?: number): Promise<number>;
    /**
     * Sets the score of an element, and adds the the element if it does not
     * exist, returns the setting score.
     */
    set(value: string, score: number): Promise<number>;
    /**
     * Removes and returns the last element of set, elements are sorted by their
     * scores.
     */
    pop(): Promise<string>;
    /**
     * Removes and returns the last element with its score from set, elements
     * are sorted by their scores.
     */
    pop(withScore: true): Promise<[string, number]>;
    /**
     * Removes and returns the first element of set, elements are sorted by
     * their scores.
     */
    shift(): Promise<string>;
    /**
     * Removes and returns the first element with its score from set, elements
     * are sorted by their scores.
     */
    shift(withScore: true): Promise<[string, number]>;
    /** Extracts and returns a section of the set without modification. */
    slice(start: number, end?: number): Promise<string[]>;
    /**
     * Removes and returns elements from the set.
     * @param start The index of the first element to be deleted.
     * @param count Number of elements to be deleted, `1` by default
     */
    splice(start: number, count?: number): Promise<string[]>;
    /** Gets the number of elements with the specified scores. */
    countByScore(score: number): Promise<number>;
    /** Gets the number of elements between the minimum and maximum scores. */
    countByScore(minScore: number, maxScore: number): Promise<number>;
    /**
     * Extracts and returns a section of the set between the minimum and maximum
     * (included) scores without modification.
     */
    sliceByScore(minScore: number, maxScore: number): Promise<string[]>;
    /**
     * Removes and returns elements from the set between the minimum and maximum
     * (included) scores without modification.
     */
    spliceByScore(minScore: number, maxScore: number): Promise<string[]>;
}

export default function createRedisFacade(redis: RedisClient): RedisOperator & {
    String: RedisFacadeType<RedisString>;
    List: RedisFacadeType<RedisList>;
    Set: RedisFacadeType<RedisSet>;
    SortedSet: RedisFacadeType<RedisSortedSet>;
    HashMap: RedisFacadeType<RedisHashMap>;
}