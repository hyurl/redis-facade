import { RedisClient } from "redis";

export interface RedisOperator {
    has(key: string): Promise<boolean>;
    delete(key: string): Promise<boolean>;
}

export interface RedisFacade {
    setTTL(seconds: number): Promise<void>;
    getTTL(): Promise<number>;
    clear(): Promise<void>;
}

export interface RedisFacadeType<T> {
    readonly prototype: T;
    of(key: string): T;
}

export interface RedisString extends RedisFacade {
    set(value: string, ttl?: number): Promise<string>;
    get(): Promise<string>;
    getLength(): Promise<number>;
    increase(increment?: number): Promise<string>;
    decrease(decrement?: number): Promise<string>;
}

export interface RedisCompoundType extends RedisFacade {
    values(): Promise<string[]>;
}

export interface RedisList extends RedisCompoundType {
    pop(): Promise<string>;
    push(...values: string[]): Promise<number>;
    shift(): Promise<string>;
    unshift(...values: string[]): Promise<number>;
    indexOf(value: string): Promise<number>;
    valueAt(index: number, value?: string): Promise<string>;
    slice(start: number, end?: number): Promise<string[]>;
    splice(start: number, count?: number): Promise<string[]>;
    reverse(): Promise<string[]>;
    getLength(): Promise<number>;
}

export interface RedisCollection extends RedisCompoundType {
    getSize(): Promise<number>;
}

export interface RedisSetKind extends RedisCollection {
    has(value: string): Promise<boolean>;
    delete(...values: string[]): Promise<boolean>;
}

export interface RedisSet extends RedisSetKind {
    add(...values: string[]): Promise<this>;
}

export interface RedisHashMap extends RedisCollection {
    set(key: string, value: string): Promise<this>;
    set(pairs: { [key: string]: string }): Promise<this>;
    get(key: string): Promise<string>;
    has(key: string): Promise<boolean>;
    delete(key: string): Promise<boolean>;
    increase(key: string, increment?: number): Promise<string>;
    decrease(key: string, decrement?: number): Promise<string>;
    keys(): Promise<string[]>;
    pairs(): Promise<{ [key: string]: string }>;
}

export interface RedisSortedSet extends RedisSetKind {
    add(value: string, score: number): Promise<this>;
    indexOf(value: string): Promise<number>;
    scoreOf(value: string): Promise<number>;
    scores(): Promise<{ [value: string]: number }>;
    /** Increases the score of the specified value. */
    increase(value: string, increment?: number): Promise<number>;
    /** Decreases the score of the specified value. */
    decrease(value: string, decrement?: number): Promise<number>;
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