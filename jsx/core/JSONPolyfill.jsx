/**
 * BolasPro v4.0 - JSON Polyfill for ExtendScript ES3
 * Provides JSON.parse and JSON.stringify for older ExtendScript versions
 */

if (typeof JSON === 'undefined') {
    JSON = {};
}

if (typeof JSON.parse !== 'function') {
    JSON.parse = function(text) {
        // Basic security check - validate JSON structure
        var sanitized = String(text)
            .replace(/\\["\\\/bfnrtu]/g, '@')
            .replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']')
            .replace(/(?:^|:|,)(?:\s*\[)+/g, '');
        
        if (/^[\],:{}\s]*$/.test(sanitized)) {
            return eval('(' + text + ')');
        }
        throw new SyntaxError('JSON.parse: Invalid JSON string');
    };
}

if (typeof JSON.stringify !== 'function') {
    JSON.stringify = function(obj, replacer, space) {
        var type = typeof obj;
        
        if (obj === null) return 'null';
        if (type === 'undefined') return undefined;
        if (type === 'number') return isFinite(obj) ? String(obj) : 'null';
        if (type === 'boolean') return String(obj);
        
        if (type === 'string') {
            return '"' + obj.replace(/[\\\"\x00-\x1f]/g, function(c) {
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
                if (obj.hasOwnProperty(key)) {
                    var val = JSON.stringify(obj[key]);
                    if (val !== undefined) {
                        objParts.push(JSON.stringify(key) + ':' + val);
                    }
                }
            }
            return '{' + objParts.join(',') + '}';
        }
        
        return undefined;
    };
}

$.writeln("[BolasPro] JSON Polyfill loaded");
