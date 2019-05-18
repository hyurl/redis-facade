import { RedisClient } from "redis";

export const key: unique symbol;

export interface RedisOperator {
    has(key: string): Promise<boolean>;
    delete(key: string): Promise<boolean>;
    typeof(key: string): Promise<"string" | "list" | "set" | "zset" | "hash" | "none">;
    exec(cmd: string, key: string, ...args: any[]): Promise<string | number | string[]>;
    exec(cmd: string, ...args: any[]): Promise<string | number | string[]>;
}

export interface RedisFacade {
    [key]: string;
    setTTL(seconds: number): Promise<void>;
    getTTL(): Promise<number>;
    clear(): Promise<void>;
    exec(cmd: string, ...args: any[]): Promise<string | number | string[]>;
}

export interface RedisFacadeType<T> {
    readonly prototype: T;
    of(key: string): T;
    has(key: string): Promise<boolean>;
}

export interface RedisString extends RedisFacade {
    set(value: string, ttl?: number): Promise<string>;
    get(): Promise<string>;
    slice(start: number, end?: number): Promise<string>;
    startsWith(value: string): Promise<boolean>;
    endsWith(value: string): Promise<boolean>;
    /**
     * Appends specified string at the end of the string. **NOTE:** this method
     * modifies the original string.
     */
    append(str: string): Promise<string>;
    increase(increment?: number): Promise<string>;
    decrease(decrement?: number): Promise<string>;
    length(): Promise<number>;
}

export interface RedisCompoundType extends RedisFacade {
    values(): Promise<string[]>;
}

export interface RedisList extends RedisCompoundType {
    pop(): Promise<string>;
    push(...values: string[]): Promise<number>;
    shift(): Promise<string>;
    unshift(...values: string[]): Promise<number>;
    includes(value: string): Promise<boolean>;
    indexOf(value: string): Promise<number>;
    valueAt(index: number, value?: string): Promise<string>;
    slice(start: number, end?: number): Promise<string[]>;
    splice(start: number, count?: number): Promise<string[]>;
    sort(order?: "asc" | "desc"): Promise<string[]>;
    reverse(): Promise<string[]>;
    length(): Promise<number>;
}

export interface RedisCollection extends RedisCompoundType {
    size(): Promise<number>;
}

export interface RedisSetKind extends RedisCollection {
    has(value: string): Promise<boolean>;
    delete(...values: string[]): Promise<boolean>;
}

export interface RedisSet extends RedisSetKind {
    add(...values: string[]): Promise<this>;
    pop(): Promise<string>;
    pop(count: number): Promise<string[]>;
    random(): Promise<string>;
    random(count: number): Promise<string[]>;
    difference(...sets: RedisSet[]): Promise<string[]>;
    intersection(...sets: RedisSet[]): Promise<string[]>;
    union(...sets: RedisSet[]): Promise<string[]>;
}

export interface RedisHashMap extends RedisCollection {
    set(key: string, value: string): Promise<this>;
    set(pairs: { [key: string]: string }): Promise<this>;
    get(key: string): Promise<string>;
    has(key: string): Promise<boolean>;
    delete(key: string): Promise<boolean>;
    keys(): Promise<string[]>;
    pairs(): Promise<{ [key: string]: string }>;
    increase(key: string, increment?: number): Promise<string>;
    decrease(key: string, decrement?: number): Promise<string>;
}

export interface RedisSortedSet extends RedisSetKind {
    add(value: string, score: number): Promise<this>;
    add(values: { [value: string]: number }): Promise<this>;
    /** A synonym of `RedisSortedSet.add()`.  */
    set(value: string, score: number): Promise<this>;
    set(values: { [value: string]: number }): Promise<this>;
    indexOf(value: string): Promise<number>;
    scoreOf(value: string): Promise<number>;
    scores(): Promise<{ [value: string]: number }>;
    /** Increases the score of the specified value. */
    increase(value: string, increment?: number): Promise<number>;
    /** Decreases the score of the specified value. */
    decrease(value: string, decrement?: number): Promise<number>;
    /**
     * Removes and returns the last element of the set, only available for
     * Redis v5.0+.
     */
    pop(): Promise<string>;
    pop(withScore: true): Promise<[string, number]>;
    /**
     * Removes and returns the first element of the set, only available for
     * Redis v5.0+.
     */
    shift(): Promise<string>;
    shift(withScore: true): Promise<[string, number]>;
    slice(start: number, end?: number): Promise<string[]>;
    splice(start: number, end?: number): Promise<string[]>;
    countBetween(minScore: number, maxScore: number): Promise<number>;
    sliceBetween(minScore: number, maxScore: number): Promise<string[]>;
    spliceBetween(minScore: number, maxScore: number): Promise<string[]>;
}

export default function createRedisFacade(redis: RedisClient): RedisOperator & {
    String: RedisFacadeType<RedisString>;
    List: RedisFacadeType<RedisList>;
    Set: RedisFacadeType<RedisSet>;
    SortedSet: RedisFacadeType<RedisSortedSet>;
    HashMap: RedisFacadeType<RedisHashMap>;
}