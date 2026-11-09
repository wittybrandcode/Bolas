/**
 * BolasPro v4.0 - Cache Module
 * Time-based caching system for performance optimization
 */

var Cache = {
    _store: {},
    
    /**
     * Get cached value if not expired
     */
    get: function(key) {
        if (!Config.CACHE.ENABLED) return null;
        var item = this._store[key];
        if (item && (Date.now() - item.time) < Config.CACHE.MAX_AGE) {
            return item.value;
        }
        return null;
    },
    
    /**
     * Store value in cache with timestamp
     */
    set: function(key, value) {
        if (!Config.CACHE.ENABLED) return;
        this._store[key] = { 
            value: value, 
            time: Date.now() 
        };
    },
    
    /**
     * Clear all cached data
     */
    clear: function() {
        this._store = {};
    },
    
    /**
     * Remove specific key from cache
     */
    remove: function(key) {
        delete this._store[key];
    },
    
    /**
     * Get cache statistics
     */
    stats: function() {
        var keys = [];
        for (var k in this._store) {
            if (this._store.hasOwnProperty(k)) keys.push(k);
        }
        return { size: keys.length, keys: keys };
    }
};
