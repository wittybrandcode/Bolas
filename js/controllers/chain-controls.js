/**
 * BolasPro v5.0 - Chain Controls Controller
 * Dynamic controls panel for selected chain layer
 * 
 * Integrated with AESelectionSync for automatic control updates
 */

var ChainControls = (function() {
    'use strict';

    // State
    var currentLayerIndex = null;
    var currentLayerData = null;

    // DOM Elements
    var elements = {
        panel: null,
        title: null,
        badge: null,
        body: null
    };

    // AESelectionSync unsubscribers
    var unsubscribers = [];

    // ═══════════════════════════════════════════════════════════════
    // Initialization
    // ═══════════════════════════════════════════════════════════════

    function init() {
        console.log('[ChainControls] Initializing...');
        
        // Get panel element
        elements.panel = document.getElementById('chainControlsPanel');
        
        if (!elements.panel) {
            console.warn('[ChainControls] Panel element not found');
            return;
        }

        elements.title = elements.panel.querySelector('.chain-controls-title span');
        elements.badge = elements.panel.querySelector('.chain-controls-badge');
        elements.body = elements.panel.querySelector('.chain-controls-body');

        // Subscribe to AESelectionSync for automatic updates
        subscribeToSelectionSync();

        console.log('[ChainControls] Initialized');
    }

    // ═══════════════════════════════════════════════════════════════
    // AESelectionSync Integration
    // ═══════════════════════════════════════════════════════════════

    function subscribeToSelectionSync() {
        if (typeof AESelectionSync === 'undefined') {
            console.log('[ChainControls] AESelectionSync not available');
            return;
        }

        // Subscribe to single layer selection - auto show controls
        unsubscribers.push(
            AESelectionSync.on('singleLayerSelected', handleSingleLayerSelected)
        );

        // Subscribe to chain detection - update controls with chain info
        unsubscribers.push(
            AESelectionSync.on('chainDetected', handleChainDetected)
        );

        // Subscribe to no selection - hide controls
        unsubscribers.push(
            AESelectionSync.on('noSelection', handleNoSelection)
        );

        console.log('[ChainControls] Subscribed to AESelectionSync');
    }

    function handleSingleLayerSelected(layer) {
        // Only show controls if we're on chain tab
        var currentTab = StateManager.get('currentTab');
        if (currentTab !== 'chain') return;

        // Only show controls for layers in chain (not free layers)
        if (!layer.isFree && (layer.isHunter || layer.isPrey)) {
            console.log('[ChainControls] Auto-showing controls for:', layer.name);
            showControls(layer.index);
        }
    }

    function handleChainDetected(chainInfo) {
        // Chain info available - controls will be updated via showControls
        console.log('[ChainControls] Chain detected, members:', chainInfo.chainLength);
    }

    function handleNoSelection() {
        var currentTab = StateManager.get('currentTab');
        if (currentTab !== 'chain') return;

        // Hide controls when no selection
        hideControls();
    }

    function unsubscribeFromSelectionSync() {
        for (var i = 0; i < unsubscribers.length; i++) {
            if (typeof unsubscribers[i] === 'function') {
                unsubscribers[i]();
            }
        }
        unsubscribers = [];
    }

    // ═══════════════════════════════════════════════════════════════
    // Public Methods
    // ═══════════════════════════════════════════════════════════════

    /**
     * Show controls for a layer
     */
    function showControls(layerIndex) {
        console.log('[ChainControls] Showing controls for layer:', layerIndex);
        
        // Ensure panel exists
        if (!elements.panel) {
            elements.panel = document.getElementById('chainControlsPanel');
            if (elements.panel) {
                elements.title = elements.panel.querySelector('.chain-controls-title span');
                elements.badge = elements.panel.querySelector('.chain-controls-badge');
                elements.body = elements.panel.querySelector('.chain-controls-body');
            }
        }
        
        if (!elements.panel) {
            console.error('[ChainControls] Panel element not found!');
            return;
        }

        currentLayerIndex = layerIndex;

        // Get layer info from AE (with proper type checking)
        if (typeof HostService !== 'undefined' && 
            HostService !== null && 
            typeof HostService === 'object') {
            HostService.getLayerControls(layerIndex).then(function(data) {
                console.log('[ChainControls] Layer data:', data);
                
                if (data && data.success) {
                    currentLayerData = data;
                    renderControls(data);
                    elements.panel.classList.add('active');
                    console.log('[ChainControls] Panel shown');
                } else {
                    console.log('[ChainControls] No controls for this layer');
                    hideControls();
                }
            }).catch(function(e) {
                console.error('[ChainControls] Error:', e);
                hideControls();
            });
        } else {
            console.error('[ChainControls] HostService not available');
        }
    }

    /**
     * Hide controls panel
     */
    function hideControls() {
        if (elements.panel) {
            elements.panel.classList.remove('active');
        }
        currentLayerIndex = null;
        currentLayerData = null;
        
        // Also hide Smart Chain Controls
        if (typeof SmartChainControls !== 'undefined' && SmartChainControls.hideControls) {
            SmartChainControls.hideControls();
        }
    }

    /**
     * Refresh current controls
     */
    function refresh() {
        if (currentLayerIndex !== null) {
            showControls(currentLayerIndex);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // Rendering
    // ═══════════════════════════════════════════════════════════════

    function renderControls(data) {
        if (!elements.body) return;

        // Store layer data
        currentLayerData = data;

        // Update header
        if (elements.title) {
            elements.title.textContent = truncate(data.layerName, 15);
        }
        
        if (elements.badge) {
            elements.badge.textContent = data.type;
            elements.badge.className = 'chain-controls-badge ' + data.type;
        }

        // Build body HTML based on type
        var html = '';

        if (data.type === 'clean') {
            html = '<div class="chain-controls-empty">No controls available</div>';
        } else if (data.type === 'hunter' && !data.leaderInfo) {
            // Root Hunter (no leader) - show Quick Anchor
            html = renderHunterInfo(data) + renderQuickAnchor();
        } else if (data.type === 'hunter-prey' && data.controls) {
            // Hunter+Prey (has leader) - show both info and prey controls
            html = renderHunterInfo(data) + renderPreyControls(data);
        } else if (data.controls) {
            // Prey - show controls
            html = renderPreyControls(data);
        } else if (data.type === 'hunter') {
            // Hunter with info only
            html = renderHunterInfo(data);
        } else {
            html = '<div class="chain-controls-empty">No controls available</div>';
        }

        elements.body.innerHTML = html;

        // Bind events
        bindControlEvents();
        
        // Show Smart Chain Operations if layer is in chain
        if (data.type !== 'clean' && typeof SmartChainControls !== 'undefined') {
            // Create a container for smart chain operations if not exists
            var smartOpsContainer = document.getElementById('smartChainOperations');
            if (!smartOpsContainer) {
                SmartChainControls.init();
            }
            SmartChainControls.showControls(currentLayerIndex, elements.body);
        }
    }

    function renderHunterInfo(data) {
        var html = '<div class="hunter-info-section">';
        html += '  <div class="hunter-info-row">';
        html += '    <i class="ph-fill ph-crown"></i>';
        html += '    <span class="hunter-info-label">Followers:</span>';
        html += '    <span class="hunter-info-value">' + (data.hunterInfo ? data.hunterInfo.followerCount : 0) + '</span>';
        html += '  </div>';
        
        if (data.hunterInfo && data.hunterInfo.followerNames && data.hunterInfo.followerNames.length > 0) {
            html += '  <div class="hunter-info-row">';
            html += '    <i class="ph ph-list"></i>';
            html += '    <span class="hunter-info-value">' + data.hunterInfo.followerNames.join(', ') + '</span>';
            html += '  </div>';
        }
        
        html += '</div>';
        return html;
    }

    /**
     * Render Quick Anchor grid for Root Hunter
     */
    function renderQuickAnchor() {
        var html = '<div class="quick-anchor-section">';
        html += '  <span class="quick-anchor-label">ANCHOR POINT</span>';
        html += '  <div class="quick-anchor-grid" id="quickAnchorGrid">';
        
        for (var i = 1; i <= 9; i++) {
            var icon = getPositionIcon(i);
            var isCenter = (i === 5);
            html += '    <button class="quick-anchor-dot' + (isCenter ? ' center' : '') + '" data-pos="' + i + '">';
            html += '      <i class="' + icon + '"></i>';
            html += '    </button>';
        }
        
        html += '  </div>';
        html += '</div>';
        return html;
    }

    function renderPreyControls(data) {
        var c = data.controls;
        var html = '';

        // Leader info if available
        if (data.leaderInfo) {
            html += '<div class="leader-info-row">';
            html += '  <i class="ph-fill ph-crown"></i>';
            html += '  <span>Leader:</span>';
            html += '  <strong>' + truncate(data.leaderInfo.name, 12) + '</strong>';
            html += '</div>';
        }

        // Mini grids for Snag Point and Prey Anchor (larger, full width)
        html += '<div class="control-grids-row">';
        html += renderMiniGrid('snag-point', 'Snag Point', c.snagPoint || 5);
        html += renderMiniGrid('prey-anchor', 'Prey Anchor', c.preyAnchor || 5);
        html += '</div>';

        // Update bottom delay inputs with current values
        updateBottomDelayInputs(c.positionDelay || 0, c.rotationDelay || 0);

        return html;
    }

    /**
     * Update the bottom delay inputs with layer values
     */
    function updateBottomDelayInputs(posDelay, rotDelay) {
        console.log('[ChainControls] Updating bottom inputs:', posDelay, rotDelay);
        
        var posInput = document.getElementById('positionDelayInput');
        var rotInput = document.getElementById('rotationDelayInput');
        
        if (posInput) {
            posInput.value = posDelay;
            console.log('[ChainControls] Position input updated to:', posDelay);
        }
        if (rotInput) {
            rotInput.value = rotDelay;
            console.log('[ChainControls] Rotation input updated to:', rotDelay);
        }
    }

    function renderMiniGrid(type, label, activePos) {
        var html = '<div class="control-grid-item ' + type + '">';
        html += '  <span class="control-grid-label">' + label + '</span>';
        html += '  <div class="control-mini-grid" data-control="' + type.replace('-', '') + '">';
        
        for (var i = 1; i <= 9; i++) {
            var isActive = (i === activePos);
            var icon = getPositionIcon(i);
            html += '    <button class="control-mini-dot' + (isActive ? ' active' : '') + '" data-pos="' + i + '">';
            html += '      <i class="' + icon + '"></i>';
            html += '    </button>';
        }
        
        html += '  </div>';
        html += '</div>';
        return html;
    }

    function getPositionIcon(pos) {
        var icons = {
            1: 'ph-bold ph-arrow-up-left',
            2: 'ph-bold ph-arrow-up',
            3: 'ph-bold ph-arrow-up-right',
            4: 'ph-bold ph-arrow-left',
            5: 'ph-fill ph-circle',
            6: 'ph-bold ph-arrow-right',
            7: 'ph-bold ph-arrow-down-left',
            8: 'ph-bold ph-arrow-down',
            9: 'ph-bold ph-arrow-down-right'
        };
        return icons[pos] || 'ph-fill ph-circle';
    }

    // ═══════════════════════════════════════════════════════════════
    // Event Handling
    // ═══════════════════════════════════════════════════════════════

    function bindControlEvents() {
        if (!elements.body) return;

        // Quick Anchor dots (for Root Hunter)
        var quickDots = elements.body.querySelectorAll('.quick-anchor-dot');
        quickDots.forEach(function(dot) {
            dot.addEventListener('click', function() {
                var pos = parseInt(dot.dataset.pos);
                
                // Execute Quick Anchor
                applyQuickAnchor(pos);
                
                // Update UI immediately
                var grid = dot.closest('.quick-anchor-grid');
                grid.querySelectorAll('.quick-anchor-dot').forEach(function(d) {
                    d.classList.remove('active');
                });
                dot.classList.add('active');
            });
        });

        // Mini grid dots (for Prey)
        var dots = elements.body.querySelectorAll('.control-mini-dot');
        dots.forEach(function(dot) {
            dot.addEventListener('click', function() {
                var grid = dot.closest('.control-mini-grid');
                var controlName = grid.dataset.control;
                var pos = parseInt(dot.dataset.pos);
                
                // Map control name
                var apiName = (controlName === 'snagpoint') ? 'snagPoint' : 'preyAnchor';
                
                updateControl(apiName, pos);
                
                // Update UI immediately
                grid.querySelectorAll('.control-mini-dot').forEach(function(d) {
                    d.classList.remove('active');
                });
                dot.classList.add('active');
            });
        });

        // Toggle buttons
        var toggles = elements.body.querySelectorAll('.control-toggle-btn');
        toggles.forEach(function(toggle) {
            toggle.addEventListener('click', function() {
                var controlName = toggle.dataset.control;
                var newValue = !toggle.classList.contains('active');
                
                updateControl(controlName, newValue);
                
                // Update UI immediately
                toggle.classList.toggle('active', newValue);
            });
        });
    }

    /**
     * Apply Quick Anchor to the selected layer with Undo support
     */
    function applyQuickAnchor(pos) {
        if (currentLayerIndex === null) return;

        console.log('[ChainControls] Applying Quick Anchor:', pos);

        if (typeof HostService !== 'undefined' && 
            HostService !== null && 
            typeof HostService === 'object') {
            
            // Begin undo recording
            if (typeof UndoManager !== 'undefined') {
                UndoManager.beginOperation('control', 'Quick Anchor → ' + pos, [currentLayerIndex]);
            }
            
            HostService.setQuickAnchor(pos).then(function(result) {
                console.log('[ChainControls] Quick Anchor result:', result);
                
                if (result && result.success) {
                    // End undo recording (success)
                    if (typeof UndoManager !== 'undefined') {
                        UndoManager.endOperation();
                    }
                    
                    if (typeof StatusBar !== 'undefined') {
                        StatusBar.success('Anchor → ' + pos);
                    }
                } else {
                    // Cancel undo recording (failure)
                    if (typeof UndoManager !== 'undefined') {
                        UndoManager.cancelOperation();
                    }
                    
                    if (typeof StatusBar !== 'undefined') {
                        StatusBar.error(result.error || 'Anchor failed');
                    }
                }
            }).catch(function(e) {
                // Cancel undo recording (error)
                if (typeof UndoManager !== 'undefined') {
                    UndoManager.cancelOperation();
                }
                console.error('[ChainControls] Quick Anchor error:', e);
            });
        }
    }

    function updateControl(controlName, value) {
        if (currentLayerIndex === null) return;

        console.log('[ChainControls] Updating:', controlName, '=', value);

        // Triple check for HostService
        if (typeof HostService !== 'undefined' && 
            HostService !== null && 
            typeof HostService === 'object') {
            
            // Begin undo recording
            if (typeof UndoManager !== 'undefined') {
                UndoManager.beginOperation('control', controlName + ' → ' + value, [currentLayerIndex]);
            }
            
            HostService.updateLayerControl(currentLayerIndex, controlName, value).then(function(result) {
                console.log('[ChainControls] Update result:', result);
                
                if (result && result.success) {
                    // End undo recording (success)
                    if (typeof UndoManager !== 'undefined') {
                        UndoManager.endOperation();
                    }
                    
                    if (typeof StatusBar !== 'undefined') {
                        StatusBar.success(controlName + ' → ' + value);
                    }
                } else {
                    // Cancel undo recording (failure)
                    if (typeof UndoManager !== 'undefined') {
                        UndoManager.cancelOperation();
                    }
                    
                    if (typeof StatusBar !== 'undefined') {
                        StatusBar.error(result.error || 'Update failed');
                    }
                }
            }).catch(function(e) {
                // Cancel undo recording (error)
                if (typeof UndoManager !== 'undefined') {
                    UndoManager.cancelOperation();
                }
                console.error('[ChainControls] Update error:', e);
            });
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // Utilities
    // ═══════════════════════════════════════════════════════════════

    function truncate(str, len) {
        if (!str) return '';
        return str.length > len ? str.substring(0, len) + '...' : str;
    }

    // ═══════════════════════════════════════════════════════════════
    // Public API
    // ═══════════════════════════════════════════════════════════════

    return {
        init: init,
        showControls: showControls,
        hideControls: hideControls,
        refresh: refresh,
        getCurrentLayerIndex: function() {
            return currentLayerIndex;
        },
        getCurrentLayerData: function() {
            return currentLayerData;
        },
        updateDelayInputs: updateBottomDelayInputs
    };

})();

// Export for debugging
if (typeof window !== 'undefined') {
    window.ChainControls = ChainControls;
}
