/**
 * BolasPro v5.0 - Polyfills for ExtendScript ES3 Environment
 * Provides bulletproof JSON, Object.keys, Date.now, and Array methods for Adobe ExtendScript
 */

// 1. JSON Polyfill
if (typeof JSON === 'undefined') {
    JSON = {};
}

// Bulletproof JSON.parse for ExtendScript
JSON.parse = function(text) {
    if (text === null || text === undefined || text === '') return null;
    try {
        return eval('(' + text + ')');
    } catch(e) {
        throw new SyntaxError('JSON.parse error: ' + (e ? (e.message || String(e)) : ''));
    }
};

if (typeof JSON.stringify !== 'function') {
    JSON.stringify = function(obj) {
        var type = typeof obj;
        
        if (obj === null) return 'null';
        if (type === 'undefined') return undefined;
        if (type === 'number') return isFinite(obj) ? String(obj) : 'null';
        if (type === 'boolean') return String(obj);
        
        if (type === 'string') {
            return '"' + obj.replace(/[\\"\x00-\x1f]/g, function(c) {
                var codes = {'"': '\\"', '\\': '\\\\', '\b': '\\b', 
                             '\f': '\\f', '\n': '\\n', '\r': '\\r', '\t': '\\t'};
                return codes[c] || '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4);
            }) + '"';
        }
        
        if (type === 'object') {
            if (obj instanceof Array) {
                var arrParts = [];
                for (var i = 0; i < obj.length; i++) {
                    var val = JSON.stringify(obj[i]);
                    arrParts.push(val === undefined ? 'null' : val);
                }
                return '[' + arrParts.join(',') + ']';
            }
            
            var objParts = [];
            for (var key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    var v = JSON.stringify(obj[key]);
                    if (v !== undefined) {
                        objParts.push(JSON.stringify(key) + ':' + v);
                    }
                }
            }
            return '{' + objParts.join(',') + '}';
        }
        return undefined;
    };
}

// 2. Date.now Polyfill
if (typeof Date.now !== 'function') {
    Date.now = function() {
        return new Date().getTime();
    };
}

// 3. Object.keys Polyfill
if (typeof Object.keys !== 'function') {
    Object.keys = function(obj) {
        if (obj !== Object(obj)) {
            return [];
        }
        var keys = [];
        for (var p in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, p)) {
                keys.push(p);
            }
        }
        return keys;
    };
}

// 4. Array.prototype.indexOf Polyfill
if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function(searchElement, fromIndex) {
        var k;
        if (this == null) throw new TypeError('"this" is null or not defined');
        var o = Object(this);
        var len = o.length >>> 0;
        if (len === 0) return -1;
        var n = fromIndex | 0;
        if (n >= len) return -1;
        k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);
        while (k < len) {
            if (k in o && o[k] === searchElement) return k;
            k++;
        }
        return -1;
    };
}

// 5. Array.prototype.forEach Polyfill
if (!Array.prototype.forEach) {
    Array.prototype.forEach = function(callback, thisArg) {
        if (this == null) throw new TypeError('Array.prototype.forEach called on null or undefined');
        if (typeof callback !== 'function') throw new TypeError(callback + ' is not a function');
        var o = Object(this);
        var len = o.length >>> 0;
        for (var i = 0; i < len; i++) {
            if (i in o) callback.call(thisArg, o[i], i, o);
        }
    };
}

// 6. Array.prototype.map Polyfill
if (!Array.prototype.map) {
    Array.prototype.map = function(callback, thisArg) {
        if (this == null) throw new TypeError('Array.prototype.map called on null or undefined');
        if (typeof callback !== 'function') throw new TypeError(callback + ' is not a function');
        var o = Object(this);
        var len = o.length >>> 0;
        var res = new Array(len);
        for (var i = 0; i < len; i++) {
            if (i in o) res[i] = callback.call(thisArg, o[i], i, o);
        }
        return res;
    };
}

// 7. Array.prototype.filter Polyfill
if (!Array.prototype.filter) {
    Array.prototype.filter = function(callback, thisArg) {
        if (this == null) throw new TypeError('Array.prototype.filter called on null or undefined');
        if (typeof callback !== 'function') throw new TypeError(callback + ' is not a function');
        var o = Object(this);
        var len = o.length >>> 0;
        var res = [];
        for (var i = 0; i < len; i++) {
            if (i in o) {
                var val = o[i];
                if (callback.call(thisArg, val, i, o)) res.push(val);
            }
        }
        return res;
    };
}

// 8. String.prototype.trim Polyfill
if (!String.prototype.trim) {
    String.prototype.trim = function() {
        return this.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
    };
}

$.writeln("[BolasPro] ES3 Polyfills initialized (Direct JSON.parse, Object.keys, Date.now, Array methods)");
