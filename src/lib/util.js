/* @flow */

export function isObject(item : mixed) : boolean {
    return (typeof item === 'object' && item !== null);
}

const REPLACE_OBJECT_RECURSION_LIMIT = 100;

export function replaceObject<T : mixed> (item : T, replacer : (item : mixed, key : number | string) => mixed, depth : number = 1) : T {

    if (!isObject(item)) {
        return item;
    }

    if (depth >= REPLACE_OBJECT_RECURSION_LIMIT) {
        throw new Error(`Recursion limit of ${ REPLACE_OBJECT_RECURSION_LIMIT } reached for replaceObject`);
    }

    // $FlowFixMe
    let keys   = Object.keys(item);
    let result = Array.isArray(item) ? [] : {};
    
    for (let i = 0; i < keys.length; i++) {
        let key = keys[i];

        // $FlowFixMe
        let child = item[key];

        let replaced = replacer(child, key);

        if (typeof replaced === 'undefined') {
            replaced = replaceObject(child, replacer, depth + 1);
        }

        // $FlowFixMe
        result[key] = replaced;
    }

    // $FlowFixMe
    return result;
}

// eslint-disable-next-line flowtype/no-weak-types
export function memoize<R>(method : (...args: Array<any>) => R) : ((...args: Array<any>) => R) {

    let cache: { [string] : R } = {};

    // eslint-disable-next-line no-unused-vars, flowtype/no-weak-types
    return function memoizedFunction(...args : Array<any>) : R {

        let key: string;

        try {
            key = JSON.stringify(Array.prototype.slice.call(arguments));
        } catch (err) {
            throw new Error(`Arguments not serializable -- can not be used to memoize`);
        }

        if (cache[key]) {
            return cache[key];
        }

        cache[key] = method.apply(this, arguments);

        return cache[key];
    };
}

export function values<T>(obj : { [string] : T }) : Array<T> {
    let result = [];
    for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
            result.push(obj[key]);
        }
    }
    return result;
}
