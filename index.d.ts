import { RedisClient } from "redis";

interface RedisCollectionBase {
    values(): Promise<string[]>;
    clear(): Promise<void>;
}

interface RedisCollection extends RedisCollectionBase {
    getSize(): Promise<number>;
}

export interface RedisString {
    set(key: string, value: string, ttl?: number): Promise<string>;
    get(key: string): Promise<string>;
    delete(key: string): Promise<boolean>;
    incr(key: string, value?: number): Promise<string>;
    decr(key: string, value?: number): Promise<string>;
}

export interface RedisList extends RedisCollectionBase {
    pop(): Promise<string>;
    push(...values: string[]): Promise<number>;
    shift(): Promise<string>;
    unshift(...values: string[]): Promise<number>;
    valueAt(index: number, value?: string): Promise<string>;
    slice(start: number, end?: number): Promise<string[]>;
    splice(start: number, count?: number): Promise<string[]>;
    getLength(): Promise<number>;
}

export interface RedisSet extends RedisCollection {
    add(value: string): Promise<this>;
    has(value: string): Promise<boolean>;
    delete(value: string): Promise<boolean>;
}

export interface RedisHashMap extends RedisCollection {
    set(key: string, value: string): Promise<this>;
    get(key: string): Promise<string>;
    has(key: string): Promise<boolean>;
    delete(key: string): Promise<boolean>;
    keys(): Promise<string[]>;
    pairs(): Promise<{ [key: string]: string }>;
}

export interface RedisCompundType<T> extends Function {
    readonly prototype: T;
    of(name: string): T;
}

export default function createDataInterface(redis: RedisClient): {
    String: RedisString;
    List: RedisCompundType<RedisList>;
    Set: RedisCompundType<RedisSet>;
    HashMap: RedisCompundType<RedisHashMap>;
}