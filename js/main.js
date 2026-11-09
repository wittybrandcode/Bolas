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

        // Initialize Internationalization (FEAT-05)
        if (typeof I18n !== "undefined") {
            I18n.init();
        }

        // Bind Settings and Info modals
        bindHeaderButtons();

        // Initialize Rig Presets & Templates (FEAT-03)
        if (typeof PresetManager !== "undefined") {
            PresetManager.init();
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
    
    /**
     * Bind Header Modals (Settings & Info)
     */
    function bindHeaderButtons() {
        var settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', function() {
                if (typeof Modal === 'undefined') return;
                var currentLang = (typeof I18n !== 'undefined') ? I18n.getLanguage() : 'en';
                var html = [
                    '<div class="settings-modal-content">',
                    '  <div class="settings-group">',
                    '    <label class="settings-label"><i class="ph-bold ph-translate"></i> ' + (typeof I18n !== 'undefined' ? I18n.t('settings_lang') : 'Language') + ':</label>',
                    '    <select id="langSelect" class="modal-select">',
                    '      <option value="en"' + (currentLang === 'en' ? ' selected' : '') + '>English (Default)</option>',
                    '      <option value="ar"' + (currentLang === 'ar' ? ' selected' : '') + '>العربية (Arabic - RTL)</option>',
                    '    </select>',
                    '  </div>',
                    '  <div class="settings-group">',
                    '    <label class="settings-label"><i class="ph-bold ph-waveform"></i> ' + (typeof I18n !== 'undefined' ? I18n.t('settings_spring') : 'Default Spring (Hz)') + ':</label>',
                    '    <input type="number" id="defaultSpringInput" class="modal-input" min="0" max="10" step="0.5" value="0">',
                    '  </div>',
                    '  <div class="settings-group">',
                    '    <label class="settings-label"><i class="ph-bold ph-sliders"></i> ' + (typeof I18n !== 'undefined' ? I18n.t('settings_damping') : 'Default Damping') + ':</label>',
                    '    <input type="number" id="defaultDampingInput" class="modal-input" min="0" max="10" step="0.5" value="2.0">',
                    '  </div>',
                    '  <div class="settings-actions">',
                    '    <button class="modal-btn primary" id="saveSettingsBtn">' + (typeof I18n !== 'undefined' ? I18n.t('settings_save') : 'Save') + '</button>',
                    '  </div>',
                    '</div>'
                ].join('');

                Modal.show({
                    title: typeof I18n !== 'undefined' ? I18n.t('settings_title') : 'Settings',
                    content: html,
                    buttons: [{ id: 'close', label: 'Close', primary: false }]
                });

                setTimeout(function() {
                    var saveBtn = document.getElementById('saveSettingsBtn');
                    if (saveBtn) {
                        saveBtn.addEventListener('click', function() {
                            var sel = document.getElementById('langSelect');
                            if (sel && typeof I18n !== 'undefined') {
                                I18n.setLanguage(sel.value);
                            }
                            Modal.hide();
                            if (typeof StatusBar !== 'undefined') {
                                StatusBar.success('Settings saved successfully');
                            }
                        });
                    }
                }, 100);
            });
        }

        var infoBtn = document.getElementById('infoBtn');
        if (infoBtn) {
            infoBtn.addEventListener('click', function() {
                if (typeof Modal === 'undefined') return;
                var html = [
                    '<div class="about-modal-content" style="text-align:center; padding: 10px;">',
                    '  <div style="font-size: 32px; color: #ffd700; margin-bottom: 8px;"><i class="ph-bold ph-link-simple"></i></div>',
                    '  <h2 style="margin: 0 0 6px 0; color: #fff;">BolasPro v5.0.0</h2>',
                    '  <p style="color: #888; font-size: 11px; margin-bottom: 12px;">Unified Bolas Grid & Follow Rigging Suite</p>',
                    '  <p style="font-size: 13px; line-height: 1.5; color: #ddd; margin-bottom: 15px;">' + (typeof I18n !== 'undefined' ? I18n.t('about_desc') : '') + '</p>',
                    '  <div style="text-align: left; background: rgba(0,0,0,0.25); border-radius: 6px; padding: 10px; font-size: 12px; color: #aaa; margin-bottom: 15px;">',
                    '    <strong>Features:</strong>',
                    '    <ul style="margin: 5px 0 0 15px; padding: 0;">',
                    '      <li>3x3 Anchor Snag Alignment & Matrix Transforms</li>',
                    '      <li>Real-time Drag & Drop Chain Reordering</li>',
                    '      <li>Damped Harmonic Oscillation (Spring Physics)</li>',
                    '      <li>Rig Presets (.bolasrig JSON Export/Import)</li>',
                    '      <li>Non-rendering Viewport Visual Guides</li>',
                    '      <li>Complete Bilingual English & Arabic Support</li>',
                    '    </ul>',
                    '  </div>',
                    '  <p style="font-size: 11px; color: #666;">Engineered for Adobe After Effects CC 2019 - 2026+</p>',
                    '</div>'
                ].join('');

                Modal.show({
                    title: typeof I18n !== 'undefined' ? I18n.t('about_title') : 'About BolasPro',
                    content: html,
                    buttons: [{ id: 'close', label: 'Close', primary: true }]
                });
            });
        }
    }

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

        if (typeof StatusBar !== 'undefined') {
            StatusBar.info('Checking selected layers in AE...');
        }

        // Direct query to HostService to get real-time active selection from AE
        HostService.getSelectedLayers().then(function(result) {
            var layers = (result && result.success && result.layers) ? result.layers : [];

            // Check if user has a pinned layer in SelectionWatcher
            var pinned = (typeof SelectionWatcher !== 'undefined') ? SelectionWatcher.getPinnedLayer() : null;

            // If 1 layer selected in AE and we have a different pinned layer, pair them!
            if (layers.length === 1 && pinned && pinned.index !== layers[0].index) {
                console.log('[BolasPro] Pairing pinned layer (' + pinned.name + ') as Hunter with selected layer (' + layers[0].name + ') as Prey');
                layers = [pinned, layers[0]];
            }

            if (layers.length < 2) {
                if (typeof StatusBar !== 'undefined') {
                    StatusBar.warning('Select 2+ layers in AE (or Pin 1 layer + Select another)');
                }
                return;
            }

            // Sync with StateManager
            StateManager.set('layers', layers);

            var hunterIndex = StateManager.get('hunterIndex');
            if (!hunterIndex && layers.length > 0) {
                hunterIndex = layers[0].index;
            }

            // Get layer indices for undo
            var layerIndices = layers.map(function(l) { return l.index; });

            // Get options from StateManager
            var options = StateManager.getSnagOptions();
            
            // Build chain options
            var chainOptions = {
                hunterIndex: hunterIndex,
                layerIndices: layerIndices,
                order: options.sortOrder || 'asc',
                snagPoint: options.sourceAnchor || 5,
                preyAnchor: options.attachAnchor || 5,
                lockOrientation: options.lockOrientation || false,
                maintainOffset: options.maintainOffset || false
            };

            console.log('[BolasPro] Chain options:', JSON.stringify(chainOptions));

            if (typeof StatusBar !== 'undefined') {
                StatusBar.info('Snagging layers...');
            }
            
            // Begin undo recording
            if (typeof UndoManager !== 'undefined') {
                UndoManager.beginOperation('chain', 'Create Chain (' + layers.length + ')', layerIndices);
            }

            HostService.createChainFromSelected(chainOptions).then(function(res) {
                console.log('[BolasPro] Snag result:', res);
                if (res && res.success) {
                    if (typeof UndoManager !== 'undefined') {
                        UndoManager.endOperation();
                    }
                    if (typeof StatusBar !== 'undefined') {
                        StatusBar.success(res.message || 'Chain created successfully');
                    }
                    if (typeof BolasGrid !== 'undefined') {
                        BolasGrid.refreshChain();
                    }
                } else {
                    if (typeof UndoManager !== 'undefined') {
                        UndoManager.cancelOperation();
                    }
                    if (typeof StatusBar !== 'undefined') {
                        StatusBar.error((res && res.error) ? res.error : 'Failed to create chain');
                    }
                }
            }).catch(function(err) {
                if (typeof UndoManager !== 'undefined') {
                    UndoManager.cancelOperation();
                }
                console.error('[BolasPro] Snag error:', err);
                if (typeof StatusBar !== 'undefined') {
                    StatusBar.error('Snag error: ' + (err.message || err));
                }
            });
        }).catch(function(err) {
            console.error('[BolasPro] Error querying layers:', err);
            if (typeof StatusBar !== 'undefined') {
                StatusBar.error('Failed to communicate with After Effects');
            }
        });
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
