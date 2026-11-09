/**
 * BolasPro v4.0 - Host Service
 * Bridge between panel and After Effects via CSInterface
 */

var HostService = (function() {
    'use strict';
    
    var csInterface = null;
    var jsxLoaded = false;
    
    return {
        init: function(cs) {
            csInterface = cs;
            console.log('[HostService] Initialized');
            this.loadAllJSX();
        },
        
        loadAllJSX: function() {
            var extensionPath = csInterface.getSystemPath('extension').replace(/\\/g, '/');
            var jsxPath = extensionPath + '/jsx';
            
            var modules = [
                // Core modules (order matters!)
                'core/JSONPolyfill.jsx',
                'core/Config.jsx',
                'core/Utils.jsx',
                'core/Cache.jsx',
                'core/Matrix.jsx',
                // Effects
                'effects/EffectsManager.jsx',
                // Controller Manager System (new)
                'core/DataLoader.jsx',
                'core/SensorSystem.jsx',
                'core/ExpressionEngine.jsx',
                'core/ControllerManager.jsx',
                'core/ChainRegistry.jsx',
                // Detection
                'detection/Detector.jsx',
                'detection/Validator.jsx',
                // Modules
                'modules/Expressions.jsx',
                'modules/Snag.jsx',
                'modules/Free.jsx',
                'modules/Chain.jsx',
                'modules/ChainInsertion.jsx',
                'modules/SmartChain.jsx',
                'modules/PreyControls.jsx',
                'modules/Anchor.jsx',
                'modules/LayerInspector.jsx',
                'modules/UndoHelper.jsx',
                // API
                'hostscript.jsx'
            ];
            
            var loadScript = '';
            for (var i = 0; i < modules.length; i++) {
                loadScript += '$.evalFile("' + jsxPath + '/' + modules[i] + '");';
            }
            
            csInterface.evalScript(loadScript, function(result) {
                if (result !== 'EvalScript error.') {
                    jsxLoaded = true;
                    console.log('[HostService] All JSX modules loaded');
                } else {
                    console.error('[HostService] Failed to load JSX modules');
                }
            });
        },
        
        evalScript: function(script) {
            return new Promise(function(resolve, reject) {
                if (!csInterface) {
                    reject(new Error('CSInterface not available'));
                    return;
                }
                csInterface.evalScript(script, function(result) {
                    if (result === 'EvalScript error.') {
                        reject(new Error('Script error'));
                    } else {
                        resolve(result);
                    }
                });
            });
        },
        
        getAllLayers: function() {
            return this.evalScript('$._BOLASPRO.getAllLayers()').then(function(result) {
                return JSON.parse(result);
            }).catch(function(e) {
                return { success: false, error: e.message, layers: [] };
            });
        },
        
        getSelectedLayers: function() {
            return this.evalScript('$._BOLASPRO.getSelectedLayers()').then(function(result) {
                return JSON.parse(result);
            }).catch(function(e) {
                return { success: false, error: e.message };
            });
        },
        
        createChainFromSelected: function(options) {
            var optionsJSON = JSON.stringify(options).replace(/'/g, "\\'");
            return this.evalScript("$._BOLASPRO.createChainFromSelected('" + optionsJSON + "')").then(function(result) {
                return JSON.parse(result);
            }).catch(function(e) {
                return { success: false, error: e.message };
            });
        },
        
        freeSelected: function() {
            return this.evalScript('$._BOLASPRO.freeSelected()').then(function(result) {
                return JSON.parse(result);
            }).catch(function(e) {
                return { success: false, error: e.message };
            });
        },
        
        /**
         * Free a specific layer by index
         */
        freeLayerByIndex: function(layerIndex) {
            return this.evalScript('$._BOLASPRO.freeLayerByIndex(' + layerIndex + ')').then(function(result) {
                return JSON.parse(result);
            }).catch(function(e) {
                return { success: false, error: e.message };
            });
        },
        
        setQuickAnchor: function(anchorNum) {
            return this.evalScript('$._BOLASPRO.setQuickAnchor(' + anchorNum + ')').then(function(result) {
                return JSON.parse(result);
            }).catch(function(e) {
                return { success: false, error: e.message };
            });
        },
        
        updateSnagPoint: function(value) {
            return this.evalScript('$._BOLASPRO.updateSnagPoint(' + value + ')').then(function(result) {
                return JSON.parse(result);
            }).catch(function(e) {
                return { success: false, error: e.message };
            });
        },
        
        updatePreyAnchor: function(value) {
            return this.evalScript('$._BOLASPRO.updatePreyAnchor(' + value + ')').then(function(result) {
                return JSON.parse(result);
            }).catch(function(e) {
                return { success: false, error: e.message };
            });
        },
        
        toggleLockOrientation: function() {
            return this.evalScript('$._BOLASPRO.toggleLockOrientation()').then(function(result) {
                return JSON.parse(result);
            }).catch(function(e) {
                return { success: false, error: e.message };
            });
        },
        
        updatePositionDelay: function(value) {
            return this.evalScript('$._BOLASPRO.updatePositionDelay(' + value + ')').then(function(result) {
                return JSON.parse(result);
            }).catch(function(e) {
                return { success: false, error: e.message };
            });
        },
        
        updateRotationDelay: function(value) {
            return this.evalScript('$._BOLASPRO.updateRotationDelay(' + value + ')').then(function(result) {
                return JSON.parse(result);
            }).catch(function(e) {
                return { success: false, error: e.message };
            });
        },
        
        getChainInfo: function(layerIndex) {
            return this.evalScript('$._BOLASPRO.getChainInfo(' + layerIndex + ')').then(function(result) {
                return JSON.parse(result);
            }).catch(function(e) {
                return { inChain: false };
            });
        },
        
        getChainInfoForSelected: function() {
            return this.evalScript('$._BOLASPRO.getChainInfoForSelected()').then(function(result) {
                return JSON.parse(result);
            }).catch(function(e) {
                return { success: false, inChain: false, error: e.message };
            });
        },
        
        selectChain: function(layerIndex) {
            return this.evalScript('$._BOLASPRO.selectChain(' + layerIndex + ')').then(function(result) {
                return JSON.parse(result);
            }).catch(function(e) {
                return { success: false };
            });
        },
        
        unchainLayer: function(layerIndex, mode) {
            return this.evalScript('$._BOLASPRO.unchainLayer(' + layerIndex + ', "' + (mode || 'this') + '")').then(function(result) {
                return JSON.parse(result);
            }).catch(function(e) {
                return { success: false };
            });
        },
        
        // ═══════════════════════════════════════════════════════════════
        // Layer Inspector API
        // ═══════════════════════════════════════════════════════════════
        
        getLayerType: function(layerIndex) {
            return this.evalScript('$._BOLASPRO.getLayerType(' + layerIndex + ')').then(function(result) {
                return JSON.parse(result);
            }).catch(function(e) {
                return { success: false, error: e.message };
            });
        },
        
        getLayerControls: function(layerIndex) {
            return this.evalScript('$._BOLASPRO.getLayerControls(' + layerIndex + ')').then(function(result) {
                return JSON.parse(result);
            }).catch(function(e) {
                return { success: false, error: e.message };
            });
        },
        
        updateLayerControl: function(layerIndex, controlName, value) {
            var valueStr = (typeof value === 'boolean') ? value : JSON.stringify(value);
            return this.evalScript('$._BOLASPRO.updateLayerControl(' + layerIndex + ', "' + controlName + '", ' + valueStr + ')').then(function(result) {
                return JSON.parse(result);
            }).catch(function(e) {
                return { success: false, error: e.message };
            });
        },
        
        getLayerFullInfo: function(layerIndex) {
            return this.evalScript('$._BOLASPRO.getLayerFullInfo(' + layerIndex + ')').then(function(result) {
                return JSON.parse(result);
            }).catch(function(e) {
                return { success: false, error: e.message };
            });
        },
        
        selectLayerByIndex: function(layerIndex) {
            return this.evalScript('$._BOLASPRO.selectLayerByIndex(' + layerIndex + ')').then(function(result) {
                return JSON.parse(result);
            }).catch(function(e) {
                return { success: false, error: e.message };
            });
        },
        
        // Alias for backward compatibility
        call: function(methodName, args) {
            console.log('[HostService] call() invoked with:', methodName, args);
            var script = '$._BOLASPRO.' + methodName + '(' + (args ? JSON.stringify(args) : '') + ')';
            return this.evalScript(script).then(function(result) {
                try {
                    return JSON.parse(result);
                } catch(e) {
                    return result;
                }
            }).catch(function(e) {
                return { success: false, error: e.message };
            });
        },
        
        // ═══════════════════════════════════════════════════════════════
        // SMART CHAIN OPERATIONS API
        // ═══════════════════════════════════════════════════════════════
        
        /**
         * Get available operations for a layer
         */
        getAvailableOperations: function(layerIndex) {
            return this.evalScript('$._BOLASPRO.getAvailableOperations(' + layerIndex + ')')
                .then(function(result) { return JSON.parse(result); })
                .catch(function(e) { return { success: false, error: e.message }; });
        },
        
        // Unchain Operations
        
        /**
         * Cut After - Free all followers of a layer
         */
        unchainCutAfter: function(layerIndex) {
            return this.evalScript('$._BOLASPRO.unchainCutAfter(' + layerIndex + ')')
                .then(function(result) { return JSON.parse(result); })
                .catch(function(e) { return { success: false, error: e.message }; });
        },
        
        /**
         * Bypass - Remove layer from chain, reconnect leader to follower
         */
        unchainBypass: function(layerIndex) {
            return this.evalScript('$._BOLASPRO.unchainBypass(' + layerIndex + ')')
                .then(function(result) { return JSON.parse(result); })
                .catch(function(e) { return { success: false, error: e.message }; });
        },
        
        /**
         * Split - Make layer a new Hunter
         */
        unchainSplit: function(layerIndex) {
            return this.evalScript('$._BOLASPRO.unchainSplit(' + layerIndex + ')')
                .then(function(result) { return JSON.parse(result); })
                .catch(function(e) { return { success: false, error: e.message }; });
        },
        
        // Delete Operations
        
        /**
         * Delete + Reconnect - Delete layer and reconnect follower to leader
         */
        deleteReconnect: function(layerIndex) {
            return this.evalScript('$._BOLASPRO.deleteReconnect(' + layerIndex + ')')
                .then(function(result) { return JSON.parse(result); })
                .catch(function(e) { return { success: false, error: e.message }; });
        },
        
        /**
         * Delete + Free - Delete layer and free all followers
         */
        deleteFree: function(layerIndex) {
            return this.evalScript('$._BOLASPRO.deleteFree(' + layerIndex + ')')
                .then(function(result) { return JSON.parse(result); })
                .catch(function(e) { return { success: false, error: e.message }; });
        },
        
        /**
         * Delete Cascade - Delete layer and all its followers
         */
        deleteCascade: function(layerIndex) {
            return this.evalScript('$._BOLASPRO.deleteCascade(' + layerIndex + ')')
                .then(function(result) { return JSON.parse(result); })
                .catch(function(e) { return { success: false, error: e.message }; });
        },
        
        /**
         * Delete + Promote - Delete layer and promote first follower as new Hunter
         */
        deletePromote: function(layerIndex) {
            return this.evalScript('$._BOLASPRO.deletePromote(' + layerIndex + ')')
                .then(function(result) { return JSON.parse(result); })
                .catch(function(e) { return { success: false, error: e.message }; });
        },
        
        // ═══════════════════════════════════════════════════════════════
        // CHAIN INSERTION API (with Branch Law)
        // ═══════════════════════════════════════════════════════════════
        
        /**
         * Validate if insertion is allowed
         */
        canInsertInChain: function(newLayerIndex, targetIndex, position) {
            return this.evalScript('$._BOLASPRO.canInsertInChain(' + newLayerIndex + ',' + targetIndex + ',"' + (position || 'after') + '")')
                .then(function(r) { return JSON.parse(r); })
                .catch(function(e) { return { valid: false, error: e.message }; });
        },
        
        /**
         * Insert layer after target
         */
        insertAfter: function(targetIndex, newLayerIndex, options) {
            var opts = options ? JSON.stringify(options) : '{}';
            return this.evalScript('$._BOLASPRO.insertAfter(' + targetIndex + ',' + newLayerIndex + ',\'' + opts + '\')')
                .then(function(r) { return JSON.parse(r); })
                .catch(function(e) { return { success: false, error: e.message }; });
        },
        
        /**
         * Insert layer before target
         */
        insertBefore: function(targetIndex, newLayerIndex, options) {
            var opts = options ? JSON.stringify(options) : '{}';
            return this.evalScript('$._BOLASPRO.insertBefore(' + targetIndex + ',' + newLayerIndex + ',\'' + opts + '\')')
                .then(function(r) { return JSON.parse(r); })
                .catch(function(e) { return { success: false, error: e.message }; });
        },
        
        /**
         * Append layer to end of branch
         */
        appendToBranch: function(hunterIndex, branchIndex, newLayerIndex, options) {
            var opts = options ? JSON.stringify(options) : '{}';
            return this.evalScript('$._BOLASPRO.appendToBranch(' + hunterIndex + ',' + branchIndex + ',' + newLayerIndex + ',\'' + opts + '\')')
                .then(function(r) { return JSON.parse(r); })
                .catch(function(e) { return { success: false, error: e.message }; });
        },
        
        /**
         * Add new branch to Hunter
         */
        addBranch: function(hunterIndex, newLayerIndex, options) {
            var opts = options ? JSON.stringify(options) : '{}';
            return this.evalScript('$._BOLASPRO.addBranch(' + hunterIndex + ',' + newLayerIndex + ',\'' + opts + '\')')
                .then(function(r) { return JSON.parse(r); })
                .catch(function(e) { return { success: false, error: e.message }; });
        },
        
        /**
         * Get branches of a Hunter
         */
        getBranches: function(hunterIndex) {
            return this.evalScript('$._BOLASPRO.getBranches(' + hunterIndex + ')')
                .then(function(r) { return JSON.parse(r); })
                .catch(function(e) { return { success: false, branches: [], error: e.message }; });
        },
        
        /**
         * Delete a branch
         */
        deleteBranch: function(hunterIndex, branchIndex) {
            return this.evalScript('$._BOLASPRO.deleteBranch(' + hunterIndex + ',' + branchIndex + ')')
                .then(function(r) { return JSON.parse(r); })
                .catch(function(e) { return { success: false, error: e.message }; });
        },
        
        /**
         * Get elements of a branch
         */
        getBranchElements: function(hunterIndex, branchIndex) {
            return this.evalScript('$._BOLASPRO.getBranchElements(' + hunterIndex + ',' + branchIndex + ')')
                .then(function(r) { return JSON.parse(r); })
                .catch(function(e) { return { success: false, elements: [], error: e.message }; });
        },
        
        /**
         * Get selected layer index
         */
        getSelectedLayerIndex: function() {
            return this.evalScript('$._BOLASPRO.getSelectedLayerIndex()')
                .then(function(r) { return JSON.parse(r); })
                .catch(function(e) { return { success: false, error: e.message }; });
        },
        
        /**
         * Swap two layers in chain
         */
        swapLayers: function(layerAIndex, layerBIndex) {
            return this.evalScript('$._BOLASPRO.swapLayers(' + layerAIndex + ',' + layerBIndex + ')')
                .then(function(r) { return JSON.parse(r); })
                .catch(function(e) { return { success: false, error: e.message }; });
        },
        
        // ═══════════════════════════════════════════════════════════════
        // SELECTION SYNC API
        // ═══════════════════════════════════════════════════════════════
        
        /**
         * Get comprehensive selection state (used by AESelectionSync)
         * Returns: { success, hasComp, compId, compName, numLayers, layers[], chainInfo }
         */
        getSelectionState: function() {
            return this.evalScript('$._BOLASPRO.getSelectionState()')
                .then(function(r) { return JSON.parse(r); })
                .catch(function(e) { 
                    return { 
                        success: false, 
                        hasComp: false,
                        compId: null,
                        compName: null,
                        numLayers: 0,
                        layers: [],
                        chainInfo: null,
                        error: e.message 
                    }; 
                });
        },
        
        // ═══════════════════════════════════════════════════════════════
        // UNDO SYSTEM API
        // ═══════════════════════════════════════════════════════════════
        
        /**
         * Capture state of multiple layers for undo
         * @param {Array} layerIndices - Array of layer indices
         */
        captureLayerStates: function(layerIndices) {
            var indicesJSON = JSON.stringify(layerIndices);
            return this.evalScript('$._BOLASPRO.captureLayerStates(\'' + indicesJSON + '\')')
                .then(function(r) { return JSON.parse(r); })
                .catch(function(e) { 
                    return { success: false, states: [], error: e.message }; 
                });
        },
        
        /**
         * Capture chain state starting from a layer
         * @param {number} layerIndex - Starting layer index
         */
        captureChainState: function(layerIndex) {
            return this.evalScript('$._BOLASPRO.captureChainState(' + layerIndex + ')')
                .then(function(r) { return JSON.parse(r); })
                .catch(function(e) { 
                    return { success: false, error: e.message }; 
                });
        },
        
        /**
         * Restore multiple layers to previous states
         * @param {Array} statesData - Array of layer states
         */
        restoreLayerStates: function(statesData) {
            var statesJSON = JSON.stringify(statesData);
            return this.evalScript('$._BOLASPRO.restoreLayerStates(\'' + statesJSON + '\')')
                .then(function(r) { return JSON.parse(r); })
                .catch(function(e) { 
                    return { success: false, error: e.message }; 
                });
        },
        
        /**
         * Validate that layers exist
         * @param {Array} layerIndices - Array of layer indices
         */
        validateLayersExist: function(layerIndices) {
            var indicesJSON = JSON.stringify(layerIndices);
            return this.evalScript('$._BOLASPRO.validateLayersExist(\'' + indicesJSON + '\')')
                .then(function(r) { return JSON.parse(r); })
                .catch(function(e) { 
                    return { allExist: false, error: e.message }; 
                });
        }
    };
})();
