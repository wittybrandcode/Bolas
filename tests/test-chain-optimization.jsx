/**
 * BolasPro Chain Optimization Tests
 * اختبارات تحسين نظام السلاسل
 * 
 * Run in ExtendScript Toolkit or via evalFile
 */

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function assert(condition, message) {
    if (!condition) {
        throw new Error("ASSERTION FAILED: " + message);
    }
}

function countControllers(layer) {
    var count = 0;
    var effects = layer.property("ADBE Effect Parade");
    for (var i = 1; i <= effects.numProperties; i++) {
        var fx = effects.property(i);
        if (fx.name.indexOf("BolasPro") === 0) {
            count++;
        }
    }
    return count;
}

function getControllersByName(layer, name) {
    var found = [];
    var effects = layer.property("ADBE Effect Parade");
    for (var i = 1; i <= effects.numProperties; i++) {
        var fx = effects.property(i);
        if (fx.name === name) {
            found.push(fx);
        }
    }
    return found;
}

// ═══════════════════════════════════════════════════════════════
// UNIT TESTS
// ═══════════════════════════════════════════════════════════════

/**
 * Test: Cache Build
 */
function test_CacheBuild() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
        return "SKIP: No active composition";
    }
    
    // Act
    ChainRegistry._buildCache(comp);
    
    // Assert
    assert(ChainRegistry._cache.valid === true, "Cache should be valid");
    assert(ChainRegistry._cache.compId === comp.id, "CompId should match");
    
    $.writeln("  Cache built with " + ChainRegistry._countKeys(ChainRegistry._cache.byId) + " IDs");
    
    return "PASS";
}

/**
 * Test: Cache Invalidation
 */
function test_CacheInvalidation() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
        return "SKIP: No active composition";
    }
    
    // Setup
    ChainRegistry._buildCache(comp);
    assert(ChainRegistry._cache.valid === true, "Cache should be valid initially");
    
    // Act
    ChainRegistry.invalidateCache();
    
    // Assert
    assert(ChainRegistry._cache.valid === false, "Cache should be invalid");
    
    return "PASS";
}

/**
 * Test: Cache Auto-Rebuild
 */
function test_CacheAutoRebuild() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
        return "SKIP: No active composition";
    }
    
    // Setup
    ChainRegistry.invalidateCache();
    
    // Act - calling _ensureCache should rebuild
    ChainRegistry._ensureCache(comp);
    
    // Assert
    assert(ChainRegistry._cache.valid === true, "Cache should be rebuilt");
    
    return "PASS";
}

/**
 * Test: _findLayerById O(1)
 */
function test_FindLayerById() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
        return "SKIP: No active composition";
    }
    
    // Find a layer with ID
    var layer = null;
    var id = null;
    for (var i = 1; i <= comp.numLayers; i++) {
        var testId = Effects.getSliderValue(comp.layer(i), Config.EFFECTS.ID);
        if (testId && testId > 0) {
            layer = comp.layer(i);
            id = testId;
            break;
        }
    }
    
    if (!id) {
        return "SKIP: No layer with ID found";
    }
    
    // Act
    var found = ChainRegistry._findLayerById(comp, id);
    
    // Assert
    assert(found !== null, "Should find layer");
    assert(found.index === layer.index, "Should find correct layer");
    
    return "PASS";
}

/**
 * Test: _findFollowers O(k)
 */
function test_FindFollowers() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
        return "SKIP: No active composition";
    }
    
    // Find a hunter with ID
    var id = null;
    for (var i = 1; i <= comp.numLayers; i++) {
        var testId = Effects.getSliderValue(comp.layer(i), Config.EFFECTS.ID);
        if (testId && testId > 0) {
            id = testId;
            break;
        }
    }
    
    if (!id) {
        return "SKIP: No hunter with ID found";
    }
    
    // Act
    var followers = ChainRegistry._findFollowers(comp, id);
    
    // Assert
    assert(Array.isArray(followers), "Should return array");
    
    // Verify each follower has correct TARGET_ID
    for (var j = 0; j < followers.length; j++) {
        var targetId = Effects.getSliderValue(followers[j], Config.EFFECTS.TARGET_ID);
        assert(targetId === id, "Follower should have correct TARGET_ID");
    }
    
    $.writeln("  Found " + followers.length + " followers for ID " + id);
    
    return "PASS";
}

// ═══════════════════════════════════════════════════════════════
// PERFORMANCE TESTS
// ═══════════════════════════════════════════════════════════════

/**
 * Test: Performance of _findLayerById
 */
function test_PerformanceFindById() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
        return "SKIP: No active composition";
    }
    
    var iterations = 1000;
    
    // Find a valid ID
    var id = null;
    for (var i = 1; i <= comp.numLayers; i++) {
        var testId = Effects.getSliderValue(comp.layer(i), Config.EFFECTS.ID);
        if (testId && testId > 0) {
            id = testId;
            break;
        }
    }
    
    if (!id) {
        return "SKIP: No ID found";
    }
    
    // Warm up cache
    ChainRegistry._ensureCache(comp);
    
    // Measure
    var start = new Date().getTime();
    for (var j = 0; j < iterations; j++) {
        ChainRegistry._findLayerById(comp, id);
    }
    var end = new Date().getTime();
    
    var totalMs = end - start;
    var avgMs = totalMs / iterations;
    
    $.writeln("  _findLayerById: " + iterations + " iterations in " + totalMs + "ms");
    $.writeln("  Average: " + avgMs.toFixed(4) + "ms per call");
    
    // Assert: Should be very fast (< 1ms average)
    assert(avgMs < 1, "Average should be < 1ms, got " + avgMs.toFixed(4) + "ms");
    
    return "PASS";
}

/**
 * Test: Performance of _findFollowers
 */
function test_PerformanceFindFollowers() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
        return "SKIP: No active composition";
    }
    
    var iterations = 1000;
    
    // Find a valid ID
    var id = null;
    for (var i = 1; i <= comp.numLayers; i++) {
        var testId = Effects.getSliderValue(comp.layer(i), Config.EFFECTS.ID);
        if (testId && testId > 0) {
            id = testId;
            break;
        }
    }
    
    if (!id) {
        return "SKIP: No ID found";
    }
    
    // Warm up cache
    ChainRegistry._ensureCache(comp);
    
    // Measure
    var start = new Date().getTime();
    for (var j = 0; j < iterations; j++) {
        ChainRegistry._findFollowers(comp, id);
    }
    var end = new Date().getTime();
    
    var totalMs = end - start;
    var avgMs = totalMs / iterations;
    
    $.writeln("  _findFollowers: " + iterations + " iterations in " + totalMs + "ms");
    $.writeln("  Average: " + avgMs.toFixed(4) + "ms per call");
    
    // Assert: Should be very fast (< 1ms average)
    assert(avgMs < 1, "Average should be < 1ms, got " + avgMs.toFixed(4) + "ms");
    
    return "PASS";
}

/**
 * Test: Cache build performance
 */
function test_PerformanceCacheBuild() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
        return "SKIP: No active composition";
    }
    
    var iterations = 100;
    
    // Measure
    var start = new Date().getTime();
    for (var i = 0; i < iterations; i++) {
        ChainRegistry._cache.valid = false;
        ChainRegistry._buildCache(comp);
    }
    var end = new Date().getTime();
    
    var totalMs = end - start;
    var avgMs = totalMs / iterations;
    
    $.writeln("  _buildCache: " + iterations + " iterations in " + totalMs + "ms");
    $.writeln("  Average: " + avgMs.toFixed(2) + "ms per build");
    $.writeln("  Layers in comp: " + comp.numLayers);
    
    // Assert: Should be reasonable (< 50ms for typical comp)
    assert(avgMs < 50, "Average should be < 50ms, got " + avgMs.toFixed(2) + "ms");
    
    return "PASS";
}

// ═══════════════════════════════════════════════════════════════
// INTEGRATION TESTS
// ═══════════════════════════════════════════════════════════════

/**
 * Test: Chain detection
 */
function test_ChainDetection() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
        return "SKIP: No active composition";
    }
    
    // Find a layer in a chain
    var chainLayer = null;
    for (var i = 1; i <= comp.numLayers; i++) {
        var state = ChainRegistry.getLayerState(comp.layer(i));
        if (state !== 'free') {
            chainLayer = comp.layer(i);
            break;
        }
    }
    
    if (!chainLayer) {
        return "SKIP: No chain found";
    }
    
    // Act
    var chain = ChainRegistry.buildChain(chainLayer);
    
    // Assert
    assert(chain.success === true, "Chain should be detected");
    assert(chain.length > 0, "Chain should have members");
    
    $.writeln("  Chain detected: " + chain.length + " members");
    $.writeln("  Visualization: " + ChainRegistry.getChainVisualization(chainLayer));
    
    return "PASS";
}

/**
 * Test: Chain validation
 */
function test_ChainValidation() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
        return "SKIP: No active composition";
    }
    
    // Find a layer in a chain
    var chainLayer = null;
    for (var i = 1; i <= comp.numLayers; i++) {
        var state = ChainRegistry.getLayerState(comp.layer(i));
        if (state !== 'free') {
            chainLayer = comp.layer(i);
            break;
        }
    }
    
    if (!chainLayer) {
        return "SKIP: No chain found";
    }
    
    // Act
    var validation = ChainRegistry.validateChain(chainLayer);
    
    // Assert
    $.writeln("  Validation: " + (validation.valid ? "VALID" : "INVALID"));
    if (!validation.valid) {
        for (var j = 0; j < validation.issues.length; j++) {
            $.writeln("    Issue: " + validation.issues[j].message);
        }
    }
    
    return "PASS";
}

// ═══════════════════════════════════════════════════════════════
// TEST RUNNER
// ═══════════════════════════════════════════════════════════════

function runTests() {
    var tests = [
        { name: "Cache Build", fn: test_CacheBuild },
        { name: "Cache Invalidation", fn: test_CacheInvalidation },
        { name: "Cache Auto-Rebuild", fn: test_CacheAutoRebuild },
        { name: "Find Layer By ID", fn: test_FindLayerById },
        { name: "Find Followers", fn: test_FindFollowers },
        { name: "Performance: FindById", fn: test_PerformanceFindById },
        { name: "Performance: FindFollowers", fn: test_PerformanceFindFollowers },
        { name: "Performance: CacheBuild", fn: test_PerformanceCacheBuild },
        { name: "Chain Detection", fn: test_ChainDetection },
        { name: "Chain Validation", fn: test_ChainValidation }
    ];
    
    var passed = 0;
    var failed = 0;
    var skipped = 0;
    
    $.writeln("");
    $.writeln("═══════════════════════════════════════════════════════════════");
    $.writeln("  BOLASPRO CHAIN OPTIMIZATION TESTS");
    $.writeln("═══════════════════════════════════════════════════════════════");
    $.writeln("");
    
    for (var i = 0; i < tests.length; i++) {
        var test = tests[i];
        $.writeln("▶ " + test.name);
        
        try {
            var result = test.fn();
            if (result.indexOf("SKIP") === 0) {
                $.writeln("  ⏭️ SKIPPED: " + result.substring(6));
                skipped++;
            } else {
                $.writeln("  ✅ PASSED");
                passed++;
            }
        } catch(e) {
            $.writeln("  ❌ FAILED: " + e.message);
            failed++;
        }
        
        $.writeln("");
    }
    
    $.writeln("═══════════════════════════════════════════════════════════════");
    $.writeln("  RESULTS: " + passed + " passed, " + failed + " failed, " + skipped + " skipped");
    $.writeln("═══════════════════════════════════════════════════════════════");
    
    return {
        passed: passed,
        failed: failed,
        skipped: skipped,
        total: tests.length
    };
}

// Run tests
runTests();
