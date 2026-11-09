/**
 * BolasPro v5.0.0 - Host Script API
 * Thin API layer for CEP communication
 * 
 * All modules are loaded by HostService.js BEFORE this file:
 * - Config, Utils, Cache, Matrix (core)
 * - Effects (effects)
 * - Detector, Validator (detection)
 * - Expressions, Snag, Free, Chain, PreyControls, Anchor, LayerInspector (modules)
 */

// ═══════════════════════════════════════════════════════════════════════
// API NAMESPACE
// ═══════════════════════════════════════════════════════════════════════
if (typeof $._BOLASPRO === "undefined") {
    $._BOLASPRO = {};
}

(function(api) {
    
    // ═══════════════════════════════════════════════════════════════════
    // INFO API - Read-only queries
    // ═══════════════════════════════════════════════════════════════════
    
    api.getVersion = function() {
        return JSON.stringify({ 
            version: Config.VERSION, 
            name: Config.NAME,
            architecture: "modular"
        });
    };
    
    api.getAllLayers = function() {
        return Utils.apiResponse(Detector.getAllLayers, Detector);
    };
    
    api.getSelectedLayers = function() {
        return Utils.apiResponse(Detector.getSelectedLayers, Detector);
    };
    
    api.getHunters = function() {
        return Utils.apiResponse(Detector.getHunters, Detector);
    };
    
    api.getChainInfo = function(layerIndex) {
        return Utils.apiResponse(Chain.getInfo, Chain, [layerIndex]);
    };
    
    api.getChainInfoForSelected = function() {
        return Utils.apiResponse(Chain.getChainInfoForSelected, Chain);
    };
    
    // ═══════════════════════════════════════════════════════════════════
    // CHAIN REGISTRY API - Central chain structure queries
    // ═══════════════════════════════════════════════════════════════════
    
    api.getLayerState = function(layerIndex) {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            return JSON.stringify({ success: false, error: 'No composition' });
        }
        var layer = comp.layer(layerIndex);
        if (!layer) {
            return JSON.stringify({ success: false, error: 'Invalid layer' });
        }
        return JSON.stringify({
            success: true,
            state: ChainRegistry.getLayerState(layer),
            info: ChainRegistry.getLayerInfo(layer)
        });
    };
    
    api.buildChain = function(layerIndex) {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            return JSON.stringify({ success: false, error: 'No composition' });
        }
        var layer = comp.layer(layerIndex);
        if (!layer) {
            return JSON.stringify({ success: false, error: 'Invalid layer' });
        }
        return JSON.stringify(ChainRegistry.buildChain(layer));
    };
    
    api.buildAllChains = function() {
        return JSON.stringify(ChainRegistry.buildAllChains());
    };
    
    api.getChainVisualization = function(layerIndex) {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            return JSON.stringify({ success: false, error: 'No composition' });
        }
        var layer = comp.layer(layerIndex);
        if (!layer) {
            return JSON.stringify({ success: false, error: 'Invalid layer' });
        }
        return JSON.stringify({
            success: true,
            visualization: ChainRegistry.getChainVisualization(layer),
            info: ChainRegistry.getChainInfoForUI(layer)
        });
    };
    
    api.validateChain = function(layerIndex) {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            return JSON.stringify({ success: false, error: 'No composition' });
        }
        var layer = comp.layer(layerIndex);
        if (!layer) {
            return JSON.stringify({ success: false, error: 'Invalid layer' });
        }
        return JSON.stringify(ChainRegistry.validateChain(layer));
    };
    
    api.getPreviousInChain = function(layerIndex) {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            return JSON.stringify({ success: false, error: 'No composition' });
        }
        var layer = comp.layer(layerIndex);
        if (!layer) {
            return JSON.stringify({ success: false, error: 'Invalid layer' });
        }
        var prev = ChainRegistry.getPrevious(layer);
        return JSON.stringify({
            success: true,
            hasPrevious: prev !== null,
            previous: prev ? { index: prev.index, name: prev.name } : null
        });
    };
    
    api.getNextInChain = function(layerIndex) {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            return JSON.stringify({ success: false, error: 'No composition' });
        }
        var layer = comp.layer(layerIndex);
        if (!layer) {
            return JSON.stringify({ success: false, error: 'Invalid layer' });
        }
        var nextLayers = ChainRegistry.getNext(layer);
        return JSON.stringify({
            success: true,
            hasNext: nextLayers.length > 0,
            next: nextLayers.map(function(l) { return { index: l.index, name: l.name }; })
        });
    };
    
    // ═══════════════════════════════════════════════════════════════════
    // CHAIN API - Create and manage chains
    // ═══════════════════════════════════════════════════════════════════
    
    api.createChainFromSelected = function(optionsJSON) {
        var options = JSON.parse(optionsJSON);
        return Utils.apiResponse(Chain.createFromSelection, Chain, [options]);
    };
    
    api.toggleVisualGuides = function() {
        return Utils.apiResponse(Chain.toggleVisualGuides, Chain);
    };
    
    api.selectChain = function(layerIndex) {
        return Utils.apiResponse(Chain.selectAll, Chain, [layerIndex]);
    };
    
    api.unchainLayer = function(layerIndex, mode) {
        return Utils.apiResponse(Chain.unchain, Chain, [layerIndex, mode || 'this']);
    };
    
    api.freeSelected = function() {
        return Utils.apiResponse(Free.executeSelected, Free);
    };
    
    api.freeLayerByIndex = function(layerIndex) {
        return Utils.apiResponse(Free.execute, Free, [layerIndex]);
    };
    
    // ═══════════════════════════════════════════════════════════════════
    // CONTROLS API - Update prey layer controls
    // ═══════════════════════════════════════════════════════════════════
    
    api.updateSnagPoint = function(value) {
        return Utils.apiResponse(PreyControls.updateSnagPoint, PreyControls, [value]);
    };
    
    api.updatePreyAnchor = function(value) {
        return Utils.apiResponse(PreyControls.updatePreyAnchor, PreyControls, [value]);
    };
    
    api.toggleLockOrientation = function() {
        return Utils.apiResponse(PreyControls.toggleLockOrientation, PreyControls);
    };
    
    api.updatePositionDelay = function(value) {
        return Utils.apiResponse(PreyControls.updatePositionDelay, PreyControls, [value]);
    };
    
    api.updateRotationDelay = function(value) {
        return Utils.apiResponse(PreyControls.updateRotationDelay, PreyControls, [value]);
    };
    
    // ═══════════════════════════════════════════════════════════════════
    // ANCHOR API - Quick anchor point manipulation
    // ═══════════════════════════════════════════════════════════════════
    
    api.setQuickAnchor = function(anchorNum) {
        return Utils.apiResponse(Anchor.setQuickAnchor, Anchor, [anchorNum]);
    };
    
    // ═══════════════════════════════════════════════════════════════════
    // INSPECTOR API - Layer inspection and control
    // ═══════════════════════════════════════════════════════════════════
    
    api.getLayerType = function(layerIndex) {
        return Utils.apiResponse(LayerInspector.getType, LayerInspector, [layerIndex]);
    };
    
    api.getLayerControls = function(layerIndex) {
        return Utils.apiResponse(LayerInspector.getControls, LayerInspector, [layerIndex]);
    };
    
    api.updateLayerControl = function(layerIndex, controlName, value) {
        return Utils.apiResponse(LayerInspector.updateControl, LayerInspector, [layerIndex, controlName, value]);
    };
    
    api.getLayerFullInfo = function(layerIndex) {
        return Utils.apiResponse(LayerInspector.getFullInfo, LayerInspector, [layerIndex]);
    };
    
    api.selectLayerByIndex = function(layerIndex) {
        return Utils.apiResponse(LayerInspector.selectLayer, LayerInspector, [layerIndex]);
    };
    
    // ═══════════════════════════════════════════════════════════════
    // SMART CHAIN OPERATIONS API
    // ═══════════════════════════════════════════════════════════════
    
    // Validation API
    api.getAvailableOperations = function(layerIndex) {
        return Utils.apiResponse(SmartChain.getAvailableOperations, SmartChain, [layerIndex]);
    };
    
    // Unchain Operations
    api.unchainCutAfter = function(layerIndex) {
        return Utils.apiResponse(SmartChain.cutAfter, SmartChain, [layerIndex]);
    };
    
    api.unchainBypass = function(layerIndex) {
        return Utils.apiResponse(SmartChain.bypass, SmartChain, [layerIndex]);
    };
    
    api.unchainSplit = function(layerIndex) {
        return Utils.apiResponse(SmartChain.split, SmartChain, [layerIndex]);
    };
    
    // Delete Operations
    api.deleteReconnect = function(layerIndex) {
        return Utils.apiResponse(SmartChain.deleteReconnect, SmartChain, [layerIndex]);
    };
    
    api.deleteFree = function(layerIndex) {
        return Utils.apiResponse(SmartChain.deleteFree, SmartChain, [layerIndex]);
    };
    
    api.deleteCascade = function(layerIndex) {
        return Utils.apiResponse(SmartChain.deleteCascade, SmartChain, [layerIndex]);
    };
    
    api.deletePromote = function(layerIndex) {
        return Utils.apiResponse(SmartChain.deletePromote, SmartChain, [layerIndex]);
    };
    
    // ═══════════════════════════════════════════════════════════════
    // CHAIN INSERTION API (with Branch Law)
    // ═══════════════════════════════════════════════════════════════
    
    // Validation
    api.canInsertInChain = function(newLayerIndex, targetIndex, position) {
        return Utils.apiResponse(ChainInsertion.canInsert, ChainInsertion, 
            [newLayerIndex, targetIndex, position || 'after']);
    };
    
    // Insert Operations
    api.insertAfter = function(targetIndex, newLayerIndex, optionsJSON) {
        var options = optionsJSON ? JSON.parse(optionsJSON) : {};
        return Utils.apiResponse(ChainInsertion.insertAfter, ChainInsertion, 
            [targetIndex, newLayerIndex, options]);
    };
    
    api.insertBefore = function(targetIndex, newLayerIndex, optionsJSON) {
        var options = optionsJSON ? JSON.parse(optionsJSON) : {};
        return Utils.apiResponse(ChainInsertion.insertBefore, ChainInsertion, 
            [targetIndex, newLayerIndex, options]);
    };
    
    api.appendToBranch = function(hunterIndex, branchIndex, newLayerIndex, optionsJSON) {
        var options = optionsJSON ? JSON.parse(optionsJSON) : {};
        return Utils.apiResponse(ChainInsertion.appendToBranch, ChainInsertion, 
            [hunterIndex, branchIndex, newLayerIndex, options]);
    };
    
    // Branch Operations
    api.addBranch = function(hunterIndex, newLayerIndex, optionsJSON) {
        var options = optionsJSON ? JSON.parse(optionsJSON) : {};
        return Utils.apiResponse(ChainInsertion.addBranch, ChainInsertion, 
            [hunterIndex, newLayerIndex, options]);
    };
    
    api.getBranches = function(hunterIndex) {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            return JSON.stringify({ success: false, error: "No composition" });
        }
        var hunterLayer = comp.layer(hunterIndex);
        if (!hunterLayer) {
            return JSON.stringify({ success: false, error: "Layer not found" });
        }
        var branches = Chain.getBranches(hunterLayer);
        // Convert to serializable format
        var result = [];
        for (var i = 0; i < branches.length; i++) {
            result.push({
                index: branches[i].index,
                firstElementIndex: branches[i].firstElementIndex,
                name: branches[i].name,
                length: branches[i].length
            });
        }
        return JSON.stringify({ success: true, branches: result });
    };
    
    api.deleteBranch = function(hunterIndex, branchIndex) {
        return Utils.apiResponse(Chain.deleteBranch, Chain, [hunterIndex, branchIndex]);
    };
    
    api.getBranchElements = function(hunterIndex, branchIndex) {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            return JSON.stringify({ success: false, error: "No composition" });
        }
        var hunterLayer = comp.layer(hunterIndex);
        if (!hunterLayer) {
            return JSON.stringify({ success: false, error: "Layer not found" });
        }
        var branches = Chain.getDirectFollowers(hunterLayer);
        
        if (branchIndex >= branches.length) {
            return JSON.stringify({ success: false, error: "Branch not found" });
        }
        
        var elements = Chain.getBranchElements(branches[branchIndex]);
        var result = [];
        for (var i = 0; i < elements.length; i++) {
            result.push({
                index: elements[i].index,
                name: elements[i].name,
                role: Chain.getLayerRole(elements[i]),
                hasFollowers: Chain.hasFollowers(elements[i])
            });
        }
        
        return JSON.stringify({ success: true, elements: result });
    };
    
    api.getSelectedLayerIndex = function() {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            return JSON.stringify({ success: false, error: "No active composition" });
        }
        
        var selected = comp.selectedLayers;
        if (selected.length === 0) {
            return JSON.stringify({ success: false, error: "No layer selected" });
        }
        
        if (selected.length > 1) {
            return JSON.stringify({ success: false, error: "Select only one layer" });
        }
        
        return JSON.stringify({ 
            success: true, 
            index: selected[0].index,
            name: selected[0].name,
            isFree: ChainInsertion.isLayerFree(selected[0])
        });
    };
    
    // ═══════════════════════════════════════════════════════════════
    // SELECTION SYNC API (Centralized Selection State)
    // ═══════════════════════════════════════════════════════════════
    
    /**
     * Get comprehensive selection state in a single call
     * Used by AESelectionSync for centralized polling
     */
    api.getSelectionState = function() {
        var comp = app.project.activeItem;
        
        // No composition
        if (!comp || !(comp instanceof CompItem)) {
            return JSON.stringify({
                success: false,
                hasComp: false,
                compId: null,
                compName: null,
                numLayers: 0,
                layers: [],
                chainInfo: null
            });
        }
        
        var result = {
            success: true,
            hasComp: true,
            compId: comp.id,
            compName: comp.name,
            numLayers: comp.numLayers,
            layers: [],
            chainInfo: null
        };
        
        // Get selected layers with full info
        var selected = comp.selectedLayers;
        for (var i = 0; i < selected.length; i++) {
            var layer = selected[i];
            var layerState = Detector.getState(layer);
            
            result.layers.push({
                index: layer.index,
                name: layer.name,
                isFree: layerState.isClean,
                isHunter: layerState.isHunter,
                isPrey: layerState.isPrey,
                is3D: layer.threeDLayer
            });
        }
        
        // Get chain info if single layer selected and in chain
        if (selected.length === 1) {
            var singleLayer = selected[0];
            var singleState = Detector.getState(singleLayer);
            
            if (!singleState.isClean) {
                // Layer is in a chain, get full chain info
                var chainData = Chain.getChainInfoForSelected();
                if (chainData && chainData.success && chainData.inChain) {
                    result.chainInfo = {
                        inChain: true,
                        members: chainData.members,
                        chainLength: chainData.chainLength,
                        selectedIndex: chainData.selectedIndex,
                        selectedRole: chainData.selectedRole
                    };
                }
            }
        }
        
        return JSON.stringify(result);
    };
    
    // Swap Layers
    api.swapLayers = function(layerAIndex, layerBIndex) {
        return Utils.apiResponse(ChainInsertion.swapLayers, ChainInsertion, [layerAIndex, layerBIndex]);
    };
    
    // ═══════════════════════════════════════════════════════════════
    // UNDO SYSTEM API
    // ═══════════════════════════════════════════════════════════════
    
    /**
     * Capture state of multiple layers for undo
     * @param {string} indicesJSON - JSON array of layer indices
     */
    api.captureLayerStates = function(indicesJSON) {
        var indices = JSON.parse(indicesJSON);
        return Utils.apiResponse(UndoHelper.captureMultipleLayerStates, UndoHelper, [indices]);
    };
    
    /**
     * Capture chain state starting from a layer
     * @param {number} layerIndex - Starting layer index
     */
    api.captureChainState = function(layerIndex) {
        return Utils.apiResponse(UndoHelper.captureChainState, UndoHelper, [layerIndex]);
    };
    
    /**
     * Restore multiple layers to previous states
     * @param {string} statesJSON - JSON array of layer states
     */
    api.restoreLayerStates = function(statesJSON) {
        var states = JSON.parse(statesJSON);
        return Utils.apiResponse(UndoHelper.restoreMultipleLayerStates, UndoHelper, [states]);
    };
    
    /**
     * Validate that layers exist
     * @param {string} indicesJSON - JSON array of layer indices
     */
    api.validateLayersExist = function(indicesJSON) {
        var indices = JSON.parse(indicesJSON);
        return Utils.apiResponse(UndoHelper.validateLayersExist, UndoHelper, [indices]);
    };
    
    // ═══════════════════════════════════════════════════════════════
    // CONTROLLER MANAGER API (New System)
    // ═══════════════════════════════════════════════════════════════
    
    /**
     * Get layer health check using SensorSystem
     * @param {number} layerIndex - Layer index
     */
    api.getLayerHealth = function(layerIndex) {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            return JSON.stringify({ success: false, error: "No composition" });
        }
        var layer = comp.layer(layerIndex);
        if (!layer) {
            return JSON.stringify({ success: false, error: "Layer not found" });
        }
        
        var health = SensorSystem.healthCheck(layer);
        return JSON.stringify({ success: true, health: health });
    };
    
    /**
     * Get full layer scan using SensorSystem
     * @param {number} layerIndex - Layer index
     */
    api.scanLayer = function(layerIndex) {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            return JSON.stringify({ success: false, error: "No composition" });
        }
        var layer = comp.layer(layerIndex);
        if (!layer) {
            return JSON.stringify({ success: false, error: "Layer not found" });
        }
        
        var scan = SensorSystem.scanLayer(layer);
        return JSON.stringify({ success: true, scan: scan });
    };
    
    /**
     * Cleanup layer using ControllerManager
     * @param {number} layerIndex - Layer index
     * @param {string} mode - Cleanup mode (full, unlink, soft)
     */
    api.cleanupLayer = function(layerIndex, mode) {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            return JSON.stringify({ success: false, error: "No composition" });
        }
        var layer = comp.layer(layerIndex);
        if (!layer) {
            return JSON.stringify({ success: false, error: "Layer not found" });
        }
        
        app.beginUndoGroup(Config.NAME + ": Cleanup");
        var result = ControllerManager.cleanup(layer, mode || 'full');
        app.endUndoGroup();
        
        return JSON.stringify({ success: true, result: result });
    };
    
    /**
     * Run Controller Manager tests
     */
    api.runCMTests = function() {
        try {
            $.evalFile($.fileName.replace('hostscript.jsx', '../tests/test-controller-manager.jsx'));
            return JSON.stringify({ success: true, message: "Tests executed - check console" });
        } catch(e) {
            return JSON.stringify({ success: false, error: e.toString() });
        }
    };

})($._BOLASPRO);

// ═══════════════════════════════════════════════════════════════════════
// INITIALIZATION - Initialize DataLoader
// ═══════════════════════════════════════════════════════════════════════
try {
    DataLoader.init();
} catch(e) {
    $.writeln("[BolasPro] DataLoader init error: " + (e ? (e.message || String(e)) : "unknown"));
}

// ═══════════════════════════════════════════════════════════════════════
// INITIALIZATION LOG
// ═══════════════════════════════════════════════════════════════════════
$.writeln("[BolasPro] API v" + Config.VERSION + " ready - " + 
    (function(obj){ var c=0; for(var k in obj){ if(Object.prototype.hasOwnProperty.call(obj, k)) c++; } return c; })($._BOLASPRO) + " endpoints");
