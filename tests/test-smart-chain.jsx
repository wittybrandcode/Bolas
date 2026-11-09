/**
 * BolasPro v4.0 - Smart Chain Operations Test Script
 * Run this in After Effects ExtendScript Toolkit to test the operations
 * 
 * Usage:
 * 1. Open After Effects
 * 2. Create a composition with 5+ layers
 * 3. Create a chain using BolasPro
 * 4. Run this script to test all operations
 */

// ═══════════════════════════════════════════════════════════════
// TEST UTILITIES
// ═══════════════════════════════════════════════════════════════

function log(msg) {
    $.writeln("[TEST] " + msg);
}

function logResult(name, result) {
    if (result.success) {
        log("✓ " + name + " - SUCCESS: " + (result.message || JSON.stringify(result)));
    } else {
        log("✗ " + name + " - FAILED: " + (result.error || "Unknown error"));
    }
}

function createTestChain() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
        log("ERROR: No composition selected");
        return false;
    }
    
    // Create 5 test layers
    log("Creating test layers...");
    
    var layers = [];
    for (var i = 0; i < 5; i++) {
        var solid = comp.layers.addSolid(
            [Math.random(), Math.random(), Math.random()],
            "Test Layer " + (i + 1),
            100, 100, 1
        );
        solid.position.setValue([100 + i * 120, comp.height / 2]);
        layers.push(solid);
    }
    
    // Create chain
    log("Creating chain...");
    
    var indices = [];
    for (var j = 0; j < layers.length; j++) {
        indices.push(layers[j].index);
    }
    
    var result = Chain.create({
        layerIndices: indices,
        snagPoint: 5,
        preyAnchor: 5,
        lockOrientation: false
    });
    
    logResult("Create Chain", result);
    return result.success;
}

// ═══════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════

function testGetAvailableOperations() {
    log("\n=== Testing getAvailableOperations ===");
    
    var comp = app.project.activeItem;
    if (!comp) return;
    
    // Test on different layer types
    for (var i = 1; i <= Math.min(5, comp.numLayers); i++) {
        var result = SmartChain.getAvailableOperations(i);
        log("Layer " + i + " (" + comp.layer(i).name + "):");
        log("  Type: " + result.type);
        log("  canCutAfter: " + result.canCutAfter);
        log("  canBypass: " + result.canBypass);
        log("  canSplit: " + result.canSplit);
        log("  canDeleteReconnect: " + result.canDeleteReconnect);
        log("  canDeleteCascade: " + result.canDeleteCascade);
        log("  canDeletePromote: " + result.canDeletePromote);
    }
}

function testCutAfter() {
    log("\n=== Testing Cut After ===");
    
    var comp = app.project.activeItem;
    if (!comp || comp.numLayers < 3) {
        log("Need at least 3 layers in chain");
        return;
    }
    
    // Find a middle layer
    var middleIndex = 2;
    var result = SmartChain.cutAfter(middleIndex);
    logResult("Cut After on layer " + middleIndex, result);
    
    // Undo
    app.executeCommand(16); // Undo
    log("Undone");
}

function testBypass() {
    log("\n=== Testing Bypass ===");
    
    var comp = app.project.activeItem;
    if (!comp || comp.numLayers < 3) {
        log("Need at least 3 layers in chain");
        return;
    }
    
    // Find a middle layer (not hunter)
    var middleIndex = 3;
    var result = SmartChain.bypass(middleIndex);
    logResult("Bypass on layer " + middleIndex, result);
    
    // Undo
    app.executeCommand(16);
    log("Undone");
}

function testSplit() {
    log("\n=== Testing Split ===");
    
    var comp = app.project.activeItem;
    if (!comp || comp.numLayers < 3) {
        log("Need at least 3 layers in chain");
        return;
    }
    
    var middleIndex = 3;
    var result = SmartChain.split(middleIndex);
    logResult("Split on layer " + middleIndex, result);
    
    // Undo
    app.executeCommand(16);
    log("Undone");
}

function testDeleteReconnect() {
    log("\n=== Testing Delete + Reconnect ===");
    
    var comp = app.project.activeItem;
    if (!comp || comp.numLayers < 3) {
        log("Need at least 3 layers in chain");
        return;
    }
    
    var middleIndex = 3;
    var result = SmartChain.deleteReconnect(middleIndex);
    logResult("Delete+Reconnect on layer " + middleIndex, result);
    
    // Undo
    app.executeCommand(16);
    log("Undone");
}

function testDeleteCascade() {
    log("\n=== Testing Delete Cascade ===");
    
    var comp = app.project.activeItem;
    if (!comp || comp.numLayers < 3) {
        log("Need at least 3 layers in chain");
        return;
    }
    
    var middleIndex = 3;
    var result = SmartChain.deleteCascade(middleIndex);
    logResult("Delete Cascade on layer " + middleIndex, result);
    
    // Undo
    app.executeCommand(16);
    log("Undone");
}

function testDeletePromote() {
    log("\n=== Testing Delete + Promote ===");
    
    var comp = app.project.activeItem;
    if (!comp || comp.numLayers < 3) {
        log("Need at least 3 layers in chain");
        return;
    }
    
    var middleIndex = 2;
    var result = SmartChain.deletePromote(middleIndex);
    logResult("Delete+Promote on layer " + middleIndex, result);
    
    // Undo
    app.executeCommand(16);
    log("Undone");
}

// ═══════════════════════════════════════════════════════════════
// RUN ALL TESTS
// ═══════════════════════════════════════════════════════════════

function runAllTests() {
    log("═══════════════════════════════════════════════════════════");
    log("BolasPro Smart Chain Operations - Test Suite");
    log("═══════════════════════════════════════════════════════════");
    
    // Check if SmartChain is loaded
    if (typeof SmartChain === 'undefined') {
        log("ERROR: SmartChain module not loaded!");
        log("Make sure to load all JSX modules first.");
        return;
    }
    
    log("SmartChain module loaded ✓");
    
    // Run tests
    testGetAvailableOperations();
    testCutAfter();
    testBypass();
    testSplit();
    testDeleteReconnect();
    testDeleteCascade();
    testDeletePromote();
    
    log("\n═══════════════════════════════════════════════════════════");
    log("Tests Complete!");
    log("═══════════════════════════════════════════════════════════");
}

// Run
runAllTests();
