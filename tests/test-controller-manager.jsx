/**
 * BolasPro Controller Manager Tests
 * Run in ExtendScript Toolkit or After Effects
 */

// Test utilities
function assert(condition, message) {
    if (!condition) {
        throw new Error("ASSERTION FAILED: " + message);
    }
    $.writeln("  ✓ " + message);
}

function createTestComp() {
    return app.project.items.addComp("CM_Test_" + new Date().getTime(), 1920, 1080, 1, 10, 30);
}

function createLayer(comp, name) {
    return comp.layers.addSolid([1, 0, 0], name || "TestLayer", 100, 100, 1);
}

function cleanupComp(comp) {
    if (comp) comp.remove();
}

// ═══════════════════════════════════════════════════════════════
// DATALOADER TESTS
// ═══════════════════════════════════════════════════════════════

function test_DataLoader_init() {
    $.writeln("\n[TEST] DataLoader.init()");
    
    var result = DataLoader.init();
    assert(result === true, "DataLoader should initialize");
    assert(DataLoader.isInitialized(), "DataLoader should be marked as initialized");
    
    $.writeln("  PASSED");
}

function test_DataLoader_getController() {
    $.writeln("\n[TEST] DataLoader.getController()");
    
    var idCtrl = DataLoader.getController('ID');
    assert(idCtrl !== null, "ID controller should exist");
    assert(idCtrl.name === "BolasPro ID", "ID name should match");
    assert(idCtrl.type === "slider", "ID type should be slider");
    
    var targetCtrl = DataLoader.getController('TARGET_ID');
    assert(targetCtrl !== null, "TARGET_ID controller should exist");
    
    var lockCtrl = DataLoader.getController('LOCK_ORIENTATION');
    assert(lockCtrl !== null, "LOCK_ORIENTATION should exist");
    assert(lockCtrl.type === "checkbox", "LOCK_ORIENTATION should be checkbox");
    
    $.writeln("  PASSED");
}

function test_DataLoader_getGroup() {
    $.writeln("\n[TEST] DataLoader.getGroup()");
    
    var preyFull = DataLoader.getGroup('prey_full');
    assert(preyFull !== null, "prey_full group should exist");
    assert(preyFull.indexOf('TARGET_ID') !== -1, "Should contain TARGET_ID");
    assert(preyFull.indexOf('SNAG_POINT') !== -1, "Should contain SNAG_POINT");
    
    var all = DataLoader.getGroup('all');
    assert(all.length === 10, "all group should have 10 controllers");
    
    $.writeln("  PASSED");
}

// ═══════════════════════════════════════════════════════════════
// SENSORSYSTEM TESTS
// ═══════════════════════════════════════════════════════════════

function test_SensorSystem_quickScan() {
    $.writeln("\n[TEST] SensorSystem.quickScan()");
    
    var comp = createTestComp();
    var layer = createLayer(comp, "ScanTest");
    
    // Test FREE state
    var scan1 = SensorSystem.quickScan(layer);
    assert(scan1.state === 'free', "Clean layer should be FREE");
    assert(scan1.hasId === false, "Should not have ID");
    assert(scan1.hasTargetId === false, "Should not have TARGET_ID");
    
    // Test HUNTER state
    Effects.addSlider(layer, Config.EFFECTS.ID, 12345);
    var scan2 = SensorSystem.quickScan(layer);
    assert(scan2.state === 'hunter', "Layer with ID should be HUNTER");
    assert(scan2.hasId === true, "Should have ID");
    assert(scan2.id === 12345, "ID value should match");
    
    // Test HUNTER-PREY state
    Effects.addSlider(layer, Config.EFFECTS.TARGET_ID, 67890);
    var scan3 = SensorSystem.quickScan(layer);
    assert(scan3.state === 'hunter-prey', "Layer with both should be HUNTER-PREY");
    
    cleanupComp(comp);
    $.writeln("  PASSED");
}

function test_SensorSystem_healthCheck() {
    $.writeln("\n[TEST] SensorSystem.healthCheck()");
    
    var comp = createTestComp();
    var layer = createLayer(comp, "HealthTest");
    
    // Add orphaned controllers (prey controls without TARGET_ID)
    Effects.addSlider(layer, Config.EFFECTS.SNAG_POINT, 5);
    Effects.addSlider(layer, Config.EFFECTS.PREY_ANCHOR, 5);
    
    var health = SensorSystem.healthCheck(layer);
    assert(health.status !== 'healthy', "Should detect issues");
    assert(health.issues.length > 0, "Should have issues");
    
    var orphanedIssues = [];
    for (var i = 0; i < health.issues.length; i++) {
        if (health.issues[i].type === 'ORPHANED_CONTROLLER') {
            orphanedIssues.push(health.issues[i]);
        }
    }
    assert(orphanedIssues.length >= 2, "Should detect orphaned controllers");
    
    cleanupComp(comp);
    $.writeln("  PASSED");
}

// ═══════════════════════════════════════════════════════════════
// CONTROLLERMANAGER TESTS
// ═══════════════════════════════════════════════════════════════

function test_ControllerManager_addController() {
    $.writeln("\n[TEST] ControllerManager.addController()");
    
    var comp = createTestComp();
    var layer = createLayer(comp, "AddCtrlTest");
    
    var result = ControllerManager.addController(layer, 'ID', 12345);
    assert(result === true, "Should succeed");
    assert(Effects.has(layer, Config.EFFECTS.ID), "ID should exist");
    assert(Effects.getSliderValue(layer, Config.EFFECTS.ID) === 12345, "Value should match");
    
    cleanupComp(comp);
    $.writeln("  PASSED");
}

function test_ControllerManager_cleanup_full() {
    $.writeln("\n[TEST] ControllerManager.cleanup('full')");
    
    var comp = createTestComp();
    var layer = createLayer(comp, "CleanupTest");
    
    // Add all controllers
    Effects.addSlider(layer, Config.EFFECTS.ID, 12345);
    Effects.addSlider(layer, Config.EFFECTS.TARGET_ID, 67890);
    Effects.addSlider(layer, Config.EFFECTS.SNAG_POINT, 5);
    
    var result = ControllerManager.cleanup(layer, 'full');
    
    assert(result.success === true, "Should succeed");
    assert(!Effects.has(layer, Config.EFFECTS.ID), "ID should be removed");
    assert(!Effects.has(layer, Config.EFFECTS.TARGET_ID), "TARGET_ID should be removed");
    assert(!Effects.has(layer, Config.EFFECTS.SNAG_POINT), "SNAG_POINT should be removed");
    
    cleanupComp(comp);
    $.writeln("  PASSED");
}

function test_ControllerManager_cleanup_unlink() {
    $.writeln("\n[TEST] ControllerManager.cleanup('unlink')");
    
    var comp = createTestComp();
    var layer = createLayer(comp, "UnlinkTest");
    
    // Add controllers
    Effects.addSlider(layer, Config.EFFECTS.ID, 12345);
    Effects.addSlider(layer, Config.EFFECTS.TARGET_ID, 67890);
    Effects.addSlider(layer, Config.EFFECTS.SNAG_POINT, 5);
    
    var result = ControllerManager.cleanup(layer, 'unlink');
    
    assert(result.success === true, "Should succeed");
    assert(Effects.has(layer, Config.EFFECTS.ID), "ID should be KEPT");
    assert(!Effects.has(layer, Config.EFFECTS.TARGET_ID), "TARGET_ID should be removed");
    assert(!Effects.has(layer, Config.EFFECTS.SNAG_POINT), "SNAG_POINT should be removed");
    
    cleanupComp(comp);
    $.writeln("  PASSED");
}

function test_ControllerManager_applyPreset_hunter() {
    $.writeln("\n[TEST] ControllerManager.applyPreset('hunter')");
    
    var comp = createTestComp();
    var layer = createLayer(comp, "HunterPresetTest");
    
    var result = ControllerManager.applyPreset(layer, 'hunter');
    
    assert(result.success === true, "Should succeed");
    assert(Effects.has(layer, Config.EFFECTS.ID), "ID should exist");
    
    var scan = SensorSystem.quickScan(layer);
    assert(scan.state === 'hunter', "State should be hunter");
    
    cleanupComp(comp);
    $.writeln("  PASSED");
}

function test_ControllerManager_applyPreset_prey() {
    $.writeln("\n[TEST] ControllerManager.applyPreset('prey')");
    
    var comp = createTestComp();
    var hunter = createLayer(comp, "Hunter");
    var prey = createLayer(comp, "Prey");
    
    // Setup hunter
    Effects.addSlider(hunter, Config.EFFECTS.ID, 12345);
    
    // Apply prey preset
    var result = ControllerManager.applyPreset(prey, 'prey', {
        targetId: 12345,
        hunter: hunter,
        values: { SNAG_POINT: 3, PREY_ANCHOR: 7 }
    });
    
    assert(result.success === true, "Should succeed");
    assert(Effects.has(prey, Config.EFFECTS.TARGET_ID), "TARGET_ID should exist");
    assert(Effects.getSliderValue(prey, Config.EFFECTS.SNAG_POINT) === 3, "SNAG_POINT value");
    assert(Effects.getSliderValue(prey, Config.EFFECTS.PREY_ANCHOR) === 7, "PREY_ANCHOR value");
    
    var scan = SensorSystem.quickScan(prey);
    assert(scan.state === 'prey', "State should be prey");
    
    cleanupComp(comp);
    $.writeln("  PASSED");
}

// ═══════════════════════════════════════════════════════════════
// INTEGRATION TESTS
// ═══════════════════════════════════════════════════════════════

function test_Swap_noAccumulation() {
    $.writeln("\n[TEST] Swap - No Accumulation (CRITICAL)");
    
    var comp = createTestComp();
    var layers = [];
    for (var i = 0; i < 5; i++) {
        layers.push(createLayer(comp, "Layer_" + (i + 1)));
    }
    
    // Create chain
    Chain.chain([1, 2, 3, 4, 5], 5, 5, false);
    
    // Verify initial health
    for (var j = 0; j < layers.length; j++) {
        var health = SensorSystem.healthCheck(layers[j]);
        var orphaned = [];
        for (var k = 0; k < health.issues.length; k++) {
            if (health.issues[k].type === 'ORPHANED_CONTROLLER') {
                orphaned.push(health.issues[k].controller);
            }
        }
        assert(orphaned.length === 0, "Layer " + (j+1) + " should have no orphaned controllers initially");
    }
    
    // Perform multiple swaps
    for (var s = 0; s < 5; s++) {
        ChainInsertion.swapLayers(2, 3);
        ChainInsertion.swapLayers(3, 2);
    }
    
    // Verify no accumulation after swaps
    var totalOrphaned = 0;
    for (var m = 0; m < layers.length; m++) {
        var healthAfter = SensorSystem.healthCheck(layers[m]);
        for (var n = 0; n < healthAfter.issues.length; n++) {
            if (healthAfter.issues[n].type === 'ORPHANED_CONTROLLER') {
                totalOrphaned++;
                $.writeln("    WARNING: Orphaned " + healthAfter.issues[n].controller + " on " + layers[m].name);
            }
        }
    }
    
    assert(totalOrphaned === 0, "No orphaned controllers after 10 swaps");
    
    cleanupComp(comp);
    $.writeln("  PASSED - NO ACCUMULATION!");
}

// ═══════════════════════════════════════════════════════════════
// RUN ALL TESTS
// ═══════════════════════════════════════════════════════════════

function runAllTests() {
    $.writeln("\n" + "=".repeat(60));
    $.writeln("BOLASPRO CONTROLLER MANAGER TESTS");
    $.writeln("=".repeat(60));
    
    var passed = 0;
    var failed = 0;
    var tests = [
        test_DataLoader_init,
        test_DataLoader_getController,
        test_DataLoader_getGroup,
        test_SensorSystem_quickScan,
        test_SensorSystem_healthCheck,
        test_ControllerManager_addController,
        test_ControllerManager_cleanup_full,
        test_ControllerManager_cleanup_unlink,
        test_ControllerManager_applyPreset_hunter,
        test_ControllerManager_applyPreset_prey,
        test_Swap_noAccumulation
    ];
    
    for (var i = 0; i < tests.length; i++) {
        try {
            tests[i]();
            passed++;
        } catch(e) {
            failed++;
            $.writeln("  ❌ FAILED: " + e.message);
        }
    }
    
    $.writeln("\n" + "=".repeat(60));
    $.writeln("RESULTS: " + passed + " passed, " + failed + " failed");
    $.writeln("=".repeat(60));
    
    return { passed: passed, failed: failed };
}

// Run tests
runAllTests();
