/**
 * BolasPro v5.0 - Hunter Bar Controller
 * Hunter selection and order management
 * 
 * Integrated with AESelectionSync for automatic layer updates
 */

var HunterBar = (function() {
    'use strict';

    // DOM Elements
    var elements = {
        hunterSelect: null,
        refreshBtn: null,
        orderBtns: null
    };

    // AESelectionSync unsubscribers
    var unsubscribers = [];

    // ═══════════════════════════════════════════════════════════════
    // Initialization
    // ═══════════════════════════════════════════════════════════════

    function init() {
        console.log('[HunterBar] Initializing...');

        // Cache DOM elements
        elements.hunterSelect = document.getElementById('hunterSelect');
        elements.refreshBtn = document.getElementById('refreshLayers');
        elements.orderBtns = document.querySelectorAll('.order-btn');

        // Bind events
        bindEvents();

        // Apply saved state
        applySavedState();

        // Subscribe to AESelectionSync for automatic updates
        subscribeToSelectionSync();

        console.log('[HunterBar] Initialized');
    }

    // ═══════════════════════════════════════════════════════════════
    // AESelectionSync Integration
    // ═══════════════════════════════════════════════════════════════

    function subscribeToSelectionSync() {
        if (typeof AESelectionSync === 'undefined') {
            console.log('[HunterBar] AESelectionSync not available, using manual refresh');
            return;
        }

        // Subscribe to selection changes - auto populate dropdown
        unsubscribers.push(
            AESelectionSync.on('selectionChanged', handleSelectionChanged)
        );

        // Subscribe to multiple layers selected
        unsubscribers.push(
            AESelectionSync.on('multipleLayersSelected', handleMultipleLayersSelected)
        );

        // Subscribe to no selection - clear dropdown
        unsubscribers.push(
            AESelectionSync.on('noSelection', handleNoSelection)
        );

        console.log('[HunterBar] Subscribed to AESelectionSync');
    }

    function handleSelectionChanged(data) {
        // Only update if we're on setup tab and have 2+ layers
        var currentTab = StateManager.get('currentTab');
        if (currentTab !== 'setup') return;

        if (data && data.count >= 2) {
            console.log('[HunterBar] Auto-updating with', data.count, 'layers');
            populateHunterSelect(data.layers);
            StateManager.set('layers', data.layers);
        }
    }

    function handleMultipleLayersSelected(data) {
        var currentTab = StateManager.get('currentTab');
        if (currentTab !== 'setup') return;

        if (data && data.count >= 2) {
            console.log('[HunterBar] Multiple layers selected:', data.count);
            populateHunterSelect(data.layers);
            StateManager.set('layers', data.layers);
        }
    }

    function handleNoSelection() {
        // Don't clear immediately - might be switching layers
        // clearHunterSelect();
    }

    function unsubscribeFromSelectionSync() {
        for (var i = 0; i < unsubscribers.length; i++) {
            if (typeof unsubscribers[i] === 'function') {
                unsubscribers[i]();
            }
        }
        unsubscribers = [];
    }

    function bindEvents() {
        // Hunter select change
        if (elements.hunterSelect) {
            elements.hunterSelect.addEventListener('change', onHunterChange);
        }

        // Refresh button
        if (elements.refreshBtn) {
            elements.refreshBtn.addEventListener('click', refreshLayers);
        }

        // Order buttons
        elements.orderBtns.forEach(function(btn) {
            btn.addEventListener('click', function() {
                setOrder(btn.dataset.order);
            });
        });
    }

    function applySavedState() {
        var savedOrder = StateManager.get('sortOrder');
        if (savedOrder) {
            setOrder(savedOrder, true);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // Hunter Selection
    // ═══════════════════════════════════════════════════════════════

    function onHunterChange() {
        var value = elements.hunterSelect.value;
        var selectedOption = elements.hunterSelect.options[elements.hunterSelect.selectedIndex];
        
        if (value) {
            var hunterIndex = parseInt(value);
            StateManager.set('hunterIndex', hunterIndex);
            StateManager.set('selectedHunter', selectedOption.textContent);
            
            if (typeof StatusBar !== 'undefined') {
                StatusBar.info('Hunter: ' + selectedOption.textContent);
            }
        } else {
            StateManager.set('hunterIndex', null);
            StateManager.set('selectedHunter', null);
        }
    }

    function refreshLayers() {
        console.log('[HunterBar] Refreshing layers...');

        if (typeof HostService === 'undefined') {
            console.warn('[HunterBar] HostService not available');
            return;
        }

        if (typeof StatusBar !== 'undefined') {
            StatusBar.info('Refreshing layers...');
        }

        // Use the correct HostService method (returns Promise)
        HostService.getSelectedLayers().then(function(result) {
            console.log('[HunterBar] Got layers:', result);
            
            if (result && result.success && result.layers && result.layers.length > 0) {
                populateHunterSelect(result.layers);
                StateManager.set('layers', result.layers);
                
                if (typeof StatusBar !== 'undefined') {
                    StatusBar.success('Found ' + result.layers.length + ' layers');
                }
            } else {
                clearHunterSelect();
                StateManager.set('layers', []);
                
                if (typeof StatusBar !== 'undefined') {
                    StatusBar.warning('Select 2+ layers in After Effects');
                }
            }
        }).catch(function(error) {
            console.error('[HunterBar] Error:', error);
            clearHunterSelect();
            
            if (typeof StatusBar !== 'undefined') {
                StatusBar.error('Failed to get layers');
            }
        });
    }

    function populateHunterSelect(layers) {
        if (!elements.hunterSelect) return;

        // Clear existing options
        elements.hunterSelect.innerHTML = '<option value="">Select Hunter...</option>';

        // Add layer options
        layers.forEach(function(layer, index) {
            var option = document.createElement('option');
            option.value = layer.index;
            option.textContent = layer.name;
            
            // Mark first layer with icon
            if (index === 0) {
                option.textContent = '⚡ ' + layer.name;
            }
            
            elements.hunterSelect.appendChild(option);
        });

        // Auto-select first if only one layer
        if (layers.length === 1) {
            elements.hunterSelect.value = layers[0].index;
            onHunterChange();
        }
    }

    function clearHunterSelect() {
        if (!elements.hunterSelect) return;
        elements.hunterSelect.innerHTML = '<option value="">Select 2+ layers...</option>';
    }

    // ═══════════════════════════════════════════════════════════════
    // Order Management
    // ═══════════════════════════════════════════════════════════════

    function setOrder(order, silent) {
        // Update state
        StateManager.set('sortOrder', order);

        // Update UI
        elements.orderBtns.forEach(function(btn) {
            btn.classList.toggle('active', btn.dataset.order === order);
        });

        // Show status
        if (!silent && typeof StatusBar !== 'undefined') {
            var orderText = order === 'asc' ? 'Ascending (صعوداً)' : 'Descending (نزولاً)';
            StatusBar.info('Order: ' + orderText);
        }
    }

    function getOrder() {
        return StateManager.get('sortOrder') || 'asc';
    }

    // ═══════════════════════════════════════════════════════════════
    // Public API
    // ═══════════════════════════════════════════════════════════════

    return {
        init: init,
        refreshLayers: refreshLayers,
        getOrder: getOrder,
        setOrder: setOrder,
        getSelectedHunter: function() {
            return StateManager.get('hunterIndex');
        },
        getLayers: function() {
            return StateManager.get('layers') || [];
        }
    };

})();

// Export for debugging
if (typeof window !== 'undefined') {
    window.HunterBar = HunterBar;
}
