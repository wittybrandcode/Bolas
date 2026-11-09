/**
 * BolasPro v5.0 - Main Entry Point
 * Unified Bolas Grid UI
 */

(function() {
    'use strict';

    /**
     * Initialize application
     */
    function init() {
        console.log('═══════════════════════════════════════════════════════════');
        console.log('⚡ BolasPro v5.0 - Initializing...');
        console.log('═══════════════════════════════════════════════════════════');

        // Check CSInterface
        if (typeof CSInterface === 'undefined') {
            console.error('[BolasPro] CSInterface not available');
            showError('CSInterface not loaded');
            return;
        }

        // Initialize CSInterface
        var csInterface = new CSInterface();
        var hostEnv = csInterface.getHostEnvironment();
        console.log('[BolasPro] Host:', hostEnv ? hostEnv.appName : 'Unknown');

        // Initialize services
        if (typeof HostService !== 'undefined') {
            HostService.init(csInterface);
        }

        if (typeof StatusBar !== 'undefined') {
            var statusBar = document.getElementById('statusBar');
            StatusBar.init(statusBar);
        }

        // Initialize Modal system
        if (typeof Modal !== 'undefined') {
            Modal.init();
        }

        // Initialize Context Menu system
        if (typeof ContextMenu !== 'undefined') {
            ContextMenu.init();
        }

        // Initialize AE Selection Sync (centralized selection monitoring)
        if (typeof AESelectionSync !== 'undefined') {
            AESelectionSync.init({
                normalPollRate: 300,
                idlePollRate: 600,
                debug: false
            });
            console.log('[BolasPro] AESelectionSync initialized');
        }

        // Initialize Undo Manager (centralized undo/redo)
        if (typeof UndoManager !== 'undefined') {
            UndoManager.init({
                maxHistory: 50,
                debug: false
            });
            console.log('[BolasPro] UndoManager initialized');
        }

        // Initialize Selection Watcher (Pin system - uses AESelectionSync)
        if (typeof SelectionWatcher !== 'undefined') {
            SelectionWatcher.init({
                pollRate: 500,
                onFreeLayerSelected: function(layer) {
                    console.log('[BolasPro] Free layer ready:', layer.name);
                }
            });
        }

        // Load saved state
        StateManager.load();

        // Initialize controllers
        if (typeof BolasGrid !== 'undefined') {
            BolasGrid.init();
        }

        if (typeof HunterBar !== 'undefined') {
            HunterBar.init();
        }

        if (typeof OptionsController !== 'undefined') {
            OptionsController.init();
        }

        if (typeof KeyboardHandler !== 'undefined') {
            KeyboardHandler.init();
        }

        // Initialize Chain Controls
        if (typeof ChainControls !== 'undefined') {
            ChainControls.init();
        }

        // Initialize Smart Chain Controls
        if (typeof SmartChainControls !== 'undefined') {
            SmartChainControls.init();
        }

        // Bind action buttons
        bindActionButtons();
        
        // Bind undo/redo buttons and keyboard shortcuts
        bindUndoRedo();

        // Ready
        if (typeof StatusBar !== 'undefined') {
            StatusBar.ready();
        }

        console.log('═══════════════════════════════════════════════════════════');
        console.log('✓ BolasPro v5.0 - Ready!');
        console.log('═══════════════════════════════════════════════════════════');
    }

    /**
     * Bind main action buttons
     */
    function bindActionButtons() {
        // Snag button
        var snagBtn = document.getElementById('snagBtn');
        if (snagBtn) {
            snagBtn.addEventListener('click', function(e) {
                addRipple(snagBtn, e);
                executeSnag();
            });
        }

        // Free button
        var freeBtn = document.getElementById('freeBtn');
        if (freeBtn) {
            freeBtn.addEventListener('click', function(e) {
                addRipple(freeBtn, e);
                executeFree();
            });
        }
    }

    /**
     * Bind Undo/Redo buttons and keyboard shortcuts
     */
    function bindUndoRedo() {
        var undoBtn = document.getElementById('undoBtn');
        var redoBtn = document.getElementById('redoBtn');
        
        // Button clicks
        if (undoBtn) {
            undoBtn.addEventListener('click', function() {
                if (typeof UndoManager !== 'undefined') {
                    UndoManager.undo();
                }
            });
        }
        
        if (redoBtn) {
            redoBtn.addEventListener('click', function() {
                if (typeof UndoManager !== 'undefined') {
                    UndoManager.redo();
                }
            });
        }
        
        // Subscribe to state changes
        if (typeof UndoManager !== 'undefined') {
            UndoManager.on('stateChanged', function(state) {
                updateUndoButtons(state);
            });
            
            // Refresh UI after undo/redo
            UndoManager.on('undone', function() {
                refreshAfterUndoRedo();
            });
            
            UndoManager.on('redone', function() {
                refreshAfterUndoRedo();
            });
        }
        // Note: Keyboard shortcuts (Ctrl+Z / Ctrl+Y) are centralized in keyboard.js (REF-01)
    }
    
    /**
     * Update undo/redo button states
     */
    function updateUndoButtons(state) {
        var undoBtn = document.getElementById('undoBtn');
        var redoBtn = document.getElementById('redoBtn');
        
        if (undoBtn) {
            undoBtn.disabled = !state.canUndo;
            undoBtn.title = state.canUndo 
                ? 'Undo: ' + state.undoLabel + ' (Ctrl+Z)'
                : 'Nothing to undo (Ctrl+Z)';
            undoBtn.classList.toggle('has-history', state.canUndo);
        }
        
        if (redoBtn) {
            redoBtn.disabled = !state.canRedo;
            redoBtn.title = state.canRedo 
                ? 'Redo: ' + state.redoLabel + ' (Ctrl+Y)'
                : 'Nothing to redo (Ctrl+Y)';
            redoBtn.classList.toggle('has-history', state.canRedo);
        }
    }
    
    /**
     * Refresh UI after undo/redo
     */
    function refreshAfterUndoRedo() {
        // Refresh chain view
        if (typeof BolasGrid !== 'undefined') {
            BolasGrid.refreshChain();
        }
        
        // Force selection sync refresh
        if (typeof AESelectionSync !== 'undefined') {
            AESelectionSync.forceRefresh();
        }
    }

    /**
     * Execute Snag operation
     */
    function executeSnag() {
        console.log('[BolasPro] Executing Snag...');

        // Get hunter
        var hunterIndex = StateManager.get('hunterIndex') || 0;
        var layers = StateManager.get('layers') || [];

        if (layers.length < 2) {
            if (typeof StatusBar !== 'undefined') {
                StatusBar.warning('Select 2+ layers first');
            }
            return;
        }

        // Get layer indices for undo
        var layerIndices = layers.map(function(l) { return l.index; });

        // Get options from StateManager
        var options = StateManager.getSnagOptions();
        
        // Build chain options
        var chainOptions = {
            hunterIndex: hunterIndex,
            order: options.sortOrder || 'asc',
            snagPoint: options.sourceAnchor || 5,
            preyAnchor: options.attachAnchor || 5,
            lockOrientation: options.lockOrientation || false,
            maintainOffset: options.maintainOffset || false
        };

        console.log('[BolasPro] Chain options:', JSON.stringify(chainOptions));

        if (typeof HostService !== 'undefined') {
            if (typeof StatusBar !== 'undefined') {
                StatusBar.info('Snagging layers...');
            }
            
            // Begin undo recording
            if (typeof UndoManager !== 'undefined') {
                UndoManager.beginOperation('chain', 'Create Chain (' + layers.length + ')', layerIndices);
            }

            HostService.createChainFromSelected(chainOptions).then(function(result) {
                console.log('[BolasPro] Snag result:', result);
                if (result && result.success) {
                    // End undo recording (success)
                    if (typeof UndoManager !== 'undefined') {
                        UndoManager.endOperation();
                    }
                    
                    if (typeof StatusBar !== 'undefined') {
                        StatusBar.success('Snag complete! ' + (result.chainLength || '') + ' layers');
                    }
                    // Refresh chain view
                    if (typeof BolasGrid !== 'undefined') {
                        BolasGrid.refreshChain();
                    }
                    // Refresh layers list
                    if (typeof HunterBar !== 'undefined') {
                        HunterBar.refreshLayers();
                    }
                } else {
                    // Cancel undo recording (failure)
                    if (typeof UndoManager !== 'undefined') {
                        UndoManager.cancelOperation();
                    }
                    
                    if (typeof StatusBar !== 'undefined') {
                        StatusBar.error(result.error || 'Snag failed');
                    }
                }
            }).catch(function(error) {
                // Cancel undo recording (error)
                if (typeof UndoManager !== 'undefined') {
                    UndoManager.cancelOperation();
                }
                
                console.error('[BolasPro] Snag error:', error);
                if (typeof StatusBar !== 'undefined') {
                    StatusBar.error('Snag failed: ' + error.message);
                }
            });
        }
    }

    /**
     * Execute Free operation
     */
    function executeFree() {
        console.log('[BolasPro] Executing Free...');

        if (typeof HostService !== 'undefined') {
            if (typeof StatusBar !== 'undefined') {
                StatusBar.info('Freeing layers...');
            }
            
            // Get selected layers for undo
            var selection = typeof AESelectionSync !== 'undefined' ? AESelectionSync.getSelection() : null;
            var layerIndices = selection && selection.layers ? selection.layers.map(function(l) { return l.index; }) : [];
            
            // Begin undo recording
            if (typeof UndoManager !== 'undefined' && layerIndices.length > 0) {
                UndoManager.beginOperation('free', 'Free Layers', layerIndices);
            }

            HostService.freeSelected().then(function(result) {
                console.log('[BolasPro] Free result:', result);
                if (result && result.success) {
                    // End undo recording (success)
                    if (typeof UndoManager !== 'undefined') {
                        UndoManager.endOperation();
                    }
                    
                    if (typeof StatusBar !== 'undefined') {
                        StatusBar.success('Layers freed');
                    }
                    // Refresh chain view
                    if (typeof BolasGrid !== 'undefined') {
                        BolasGrid.refreshChain();
                    }
                } else {
                    // Cancel undo recording
                    if (typeof UndoManager !== 'undefined') {
                        UndoManager.cancelOperation();
                    }
                    
                    if (typeof StatusBar !== 'undefined') {
                        StatusBar.warning('No layers to free');
                    }
                }
            }).catch(function(error) {
                // Cancel undo recording (error)
                if (typeof UndoManager !== 'undefined') {
                    UndoManager.cancelOperation();
                }
                
                console.error('[BolasPro] Free error:', error);
                if (typeof StatusBar !== 'undefined') {
                    StatusBar.error('Free failed');
                }
            });
        }
    }

    /**
     * Show error message
     */
    function showError(message) {
        var statusMessage = document.getElementById('statusMessage');
        var statusIndicator = document.getElementById('statusIndicator');
        
        if (statusMessage) statusMessage.textContent = message;
        if (statusIndicator) {
            statusIndicator.classList.remove('online');
            statusIndicator.classList.add('error');
        }
    }

    /**
     * Add ripple effect
     */
    function addRipple(element, event) {
        var ripple = document.createElement('span');
        ripple.className = 'ripple';
        
        var rect = element.getBoundingClientRect();
        var size = Math.max(rect.width, rect.height);
        
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = (event.clientX - rect.left - size / 2) + 'px';
        ripple.style.top = (event.clientY - rect.top - size / 2) + 'px';
        
        element.appendChild(ripple);
        
        setTimeout(function() {
            ripple.remove();
        }, 400);
    }

    // Start when DOM ready
    document.addEventListener('DOMContentLoaded', init);

    // Auto-refresh layers on load - wait for JSX to load
    function handleJSXReady() {
        console.log('[BolasPro] JSX Ready event received - auto-refreshing layers...');
        if (typeof HunterBar !== 'undefined') {
            HunterBar.refreshLayers();
        }
        if (typeof BolasGrid !== 'undefined') {
            BolasGrid.refreshChain();
        }
    }

    document.addEventListener('bolas:jsx-ready', handleJSXReady);

    // Fallback if event already fired before listener attached
    window.addEventListener('load', function() {
        if (typeof HostService !== 'undefined' && HostService.isJSXLoaded && HostService.isJSXLoaded()) {
            handleJSXReady();
        }
    });

    // Expose for debugging
    window.BolasPro = {
        version: '5.0.0',
        StateManager: StateManager,
        UndoManager: typeof UndoManager !== 'undefined' ? UndoManager : null,
        BolasGrid: typeof BolasGrid !== 'undefined' ? BolasGrid : null,
        HunterBar: typeof HunterBar !== 'undefined' ? HunterBar : null,
        OptionsController: typeof OptionsController !== 'undefined' ? OptionsController : null,
        ChainControls: typeof ChainControls !== 'undefined' ? ChainControls : null,
        SmartChainControls: typeof SmartChainControls !== 'undefined' ? SmartChainControls : null
    };

})();
