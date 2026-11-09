/**
 * BolasPro v5.0.0 - Bolas Grid Controller
 * 2 Tabs: Setup (Source+Attach), Chain
 * 
 * Integrated with AESelectionSync for automatic chain updates
 */

var BolasGrid = (function() {
    'use strict';

    // DOM Elements
    var elements = {
        section: null,
        tabs: null,
        gridContent: null,
        chainContent: null,
        // Setup mode elements
        setupGrids: null,
        sourceGrid: null,
        attachGrid: null,
        // Chain elements
        chainTimeline: null,
        chainEmpty: null
    };

    // AESelectionSync unsubscribers
    var unsubscribers = [];

    // ═══════════════════════════════════════════════════════════════
    // Initialization
    // ═══════════════════════════════════════════════════════════════

    function init() {
        console.log('[BolasGrid] Initializing...');
        
        // Cache DOM elements
        elements.section = document.getElementById('bolasSection');
        elements.tabs = document.querySelectorAll('.bolas-tab');
        elements.gridContent = document.getElementById('gridContent');
        elements.chainContent = document.getElementById('chainContent');
        
        // Setup mode
        elements.setupGrids = document.getElementById('setupGrids');
        elements.sourceGrid = document.getElementById('sourceGrid');
        elements.attachGrid = document.getElementById('attachGrid');
        
        // Chain
        elements.chainTimeline = document.getElementById('chainTimeline');
        elements.chainEmpty = document.getElementById('chainEmpty');

        // Bind events
        bindTabEvents();
        bindSetupGridEvents();
        bindChainEvents();

        // Subscribe to state changes
        StateManager.subscribe(onStateChange);

        // Subscribe to AESelectionSync for automatic updates
        subscribeToSelectionSync();

        // Apply initial state - show setup tab
        switchTab('setup');

        console.log('[BolasGrid] Initialized');
    }

    // ═══════════════════════════════════════════════════════════════
    // AESelectionSync Integration
    // ═══════════════════════════════════════════════════════════════

    function subscribeToSelectionSync() {
        if (typeof AESelectionSync === 'undefined') {
            console.log('[BolasGrid] AESelectionSync not available, using manual refresh');
            return;
        }

        // Subscribe to chain detection - auto refresh chain view
        unsubscribers.push(
            AESelectionSync.on('chainDetected', handleChainDetected)
        );

        // Subscribe to single layer selection - update chain selection
        unsubscribers.push(
            AESelectionSync.on('singleLayerSelected', handleSingleLayerSelected)
        );

        // Subscribe to no selection - clear chain view
        unsubscribers.push(
            AESelectionSync.on('noSelection', handleNoSelection)
        );

        // Subscribe to composition change - refresh chain
        unsubscribers.push(
            AESelectionSync.on('compositionChanged', handleCompositionChanged)
        );

        console.log('[BolasGrid] Subscribed to AESelectionSync');
    }

    function handleChainDetected(chainInfo) {
        // Only update if we're on the chain tab
        var currentTab = StateManager.get('currentTab');
        if (currentTab !== 'chain') return;

        console.log('[BolasGrid] Chain detected via sync:', chainInfo);

        // Transform chainInfo to match renderChainTimeline format
        if (chainInfo && chainInfo.members && chainInfo.members.length > 0) {
            var data = {
                success: true,
                inChain: true,
                chain: chainInfo.members,
                chainLength: chainInfo.chainLength || chainInfo.members.length
            };
            renderChainTimeline(data);
        }
    }

    function handleSingleLayerSelected(layer) {
        // Update chain item selection if we're on chain tab
        var currentTab = StateManager.get('currentTab');
        if (currentTab !== 'chain') return;

        // If layer is in chain, update selection highlight
        if (!layer.isFree && (layer.isHunter || layer.isPrey)) {
            updateChainSelection(layer.index);
        }
    }

    function handleNoSelection() {
        var currentTab = StateManager.get('currentTab');
        if (currentTab !== 'chain') return;

        // Don't clear immediately - user might be switching layers
        // renderChainEmpty();
    }

    function handleCompositionChanged() {
        var currentTab = StateManager.get('currentTab');
        if (currentTab === 'chain') {
            // Refresh chain when composition changes
            refreshChain();
        }
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
    // Tab Management
    // ═══════════════════════════════════════════════════════════════

    function bindTabEvents() {
        elements.tabs.forEach(function(tab) {
            tab.addEventListener('click', function() {
                var tabName = tab.dataset.tab;
                switchTab(tabName);
            });
        });
    }

    function switchTab(tabName) {
        console.log('[BolasGrid] Switching to tab:', tabName);
        
        // Update state
        StateManager.set('currentTab', tabName);

        // Update tab buttons
        elements.tabs.forEach(function(tab) {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Update section data attribute for CSS
        if (elements.section) {
            elements.section.setAttribute('data-current-tab', tabName);
        }

        // Show/hide content based on tab
        if (tabName === 'chain') {
            showChainContent();
        } else if (tabName === 'setup') {
            showSetupContent();
        }

        // Show status
        if (typeof StatusBar !== 'undefined') {
            StatusBar.info(StateManager.getTabLabel(tabName) + ' mode');
        }
    }

    function showSetupContent() {
        if (elements.gridContent) elements.gridContent.style.display = 'flex';
        if (elements.chainContent) elements.chainContent.classList.remove('active');
        if (elements.setupGrids) elements.setupGrids.style.display = 'flex';
        
        // Hide options section
        var optionsSection = document.getElementById('optionsSection');
        if (optionsSection) optionsSection.style.display = 'none';
        
        // Update selections
        updateSetupGridSelections();
    }

    function showChainContent() {
        if (elements.gridContent) elements.gridContent.style.display = 'none';
        if (elements.chainContent) elements.chainContent.classList.add('active');
        
        // Show options section
        var optionsSection = document.getElementById('optionsSection');
        if (optionsSection) optionsSection.style.display = 'block';
        
        // Refresh chain data
        refreshChain();
    }

    // ═══════════════════════════════════════════════════════════════
    // Setup Grid Management (Source + Attach)
    // ═══════════════════════════════════════════════════════════════

    function bindSetupGridEvents() {
        // Source Grid
        if (elements.sourceGrid) {
            var sourceDots = elements.sourceGrid.querySelectorAll('.bolas-dot');
            sourceDots.forEach(function(dot) {
                dot.addEventListener('click', function(e) {
                    var pos = parseInt(dot.dataset.pos);
                    selectSetupPosition('source', pos, elements.sourceGrid);
                    addRipple(dot, e);
                });
            });
        }
        
        // Attach Grid
        if (elements.attachGrid) {
            var attachDots = elements.attachGrid.querySelectorAll('.bolas-dot');
            attachDots.forEach(function(dot) {
                dot.addEventListener('click', function(e) {
                    var pos = parseInt(dot.dataset.pos);
                    selectSetupPosition('attach', pos, elements.attachGrid);
                    addRipple(dot, e);
                });
            });
        }
    }

    function selectSetupPosition(type, pos, gridElement) {
        // Update state
        StateManager.set('positions.' + type, pos);
        
        // Update UI
        var dots = gridElement.querySelectorAll('.bolas-dot');
        dots.forEach(function(dot) {
            var dotPos = parseInt(dot.dataset.pos);
            dot.classList.toggle('active', dotPos === pos);
        });
        
        // Show status
        if (typeof StatusBar !== 'undefined') {
            var label = type === 'source' ? 'Source' : 'Attach';
            StatusBar.success(label + ': ' + StateManager.getPositionName(pos));
        }
    }

    function updateSetupGridSelections() {
        // Update Source Grid
        if (elements.sourceGrid) {
            var sourcePos = StateManager.get('positions.source') || 5;
            var sourceDots = elements.sourceGrid.querySelectorAll('.bolas-dot');
            sourceDots.forEach(function(dot) {
                var pos = parseInt(dot.dataset.pos);
                dot.classList.toggle('active', pos === sourcePos);
            });
        }
        
        // Update Attach Grid
        if (elements.attachGrid) {
            var attachPos = StateManager.get('positions.attach') || 5;
            var attachDots = elements.attachGrid.querySelectorAll('.bolas-dot');
            attachDots.forEach(function(dot) {
                var pos = parseInt(dot.dataset.pos);
                dot.classList.toggle('active', pos === attachPos);
            });
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // Chain Management
    // ═══════════════════════════════════════════════════════════════

    function bindChainEvents() {
        // Select All
        var selectAllBtn = document.getElementById('selectAllChain');
        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', function(e) {
                addRipple(selectAllBtn, e);
                selectAllChain();
            });
        }

        // Unchain
        var unchainBtn = document.getElementById('unchainBtn');
        if (unchainBtn) {
            unchainBtn.addEventListener('click', function(e) {
                addRipple(unchainBtn, e);
                unchainSelected();
            });
        }

        // Refresh
        var refreshBtn = document.getElementById('refreshChain');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', function(e) {
                addRipple(refreshBtn, e);
                refreshChain();
            });
        }

        // Break All
        // Toggle Viewport Guides (FEAT-04)
        var guidesBtn = document.getElementById('guidesBtn');
        if (guidesBtn) {
            guidesBtn.addEventListener('click', function(e) {
                addRipple(guidesBtn, e);
                if (typeof HostService !== 'undefined' && HostService.toggleVisualGuides) {
                    HostService.toggleVisualGuides().then(function(res) {
                        if (res && res.success) {
                            guidesBtn.classList.toggle('active', res.enabled);
                            if (typeof StatusBar !== 'undefined') {
                                StatusBar.success(res.message);
                            }
                        } else if (res && typeof StatusBar !== 'undefined') {
                            StatusBar.warning(res.error || 'Guides unavailable');
                        }
                    });
                }
            });
        }

        var breakAllBtn = document.getElementById('breakAllBtn');
        if (breakAllBtn) {
            breakAllBtn.addEventListener('click', function(e) {
                addRipple(breakAllBtn, e);
                breakAllChains();
            });
        }

        // Event delegation for chain items
        var timeline = document.getElementById('chainTimeline');
        if (timeline) {
            timeline.addEventListener('click', function(e) {
                var chainItem = e.target.closest('.chain-item');
                if (chainItem) {
                    var layerIndex = parseInt(chainItem.dataset.index);
                    selectChainItem(layerIndex);
                }
            });
        }
    }

    function refreshChain() {
        console.log('[BolasGrid] Refreshing chain...');

        if (typeof HostService === 'undefined' || 
            HostService === null || 
            typeof HostService !== 'object') {
            renderChainEmpty();
            return;
        }

        HostService.getChainInfoForSelected().then(function(result) {
            console.log('[BolasGrid] Chain info:', result);
            if (result && result.success && result.inChain && result.members && result.members.length > 0) {
                result.chain = result.members;
                renderChainTimeline(result);
            } else {
                renderChainEmpty();
            }
        }).catch(function(error) {
            console.error('[BolasGrid] Chain error:', error);
            renderChainEmpty();
        });
    }

    function renderChainTimeline(data) {
        if (!elements.chainTimeline) return;

        if (elements.chainEmpty) elements.chainEmpty.style.display = 'none';

        var html = '<div class="chain-line"></div>';
        var totalItems = data.chain.length;

        data.chain.forEach(function(item, index) {
            var isSelected = item.isSelected;
            var isFirst = (index === 0);
            var isLast = (index === totalItems - 1);
            var isMiddle = !isFirst && !isLast;
            
            var roleType = 'prey';
            var roleLabel = 'Prey';
            
            if (isFirst) {
                roleType = 'root-hunter';
                roleLabel = 'Hunter';
            } else if (isMiddle) {
                roleType = 'hunter-prey';
                roleLabel = 'Hunter • Prey';
            }
            
            var classes = 'chain-item ' + roleType;
            if (isSelected) classes += ' selected';

            html += '<div class="' + classes + '" data-index="' + item.index + '" draggable="true" title="Drag to reorder chain">';
            html += '  <i class="ph-bold ph-dots-six-vertical drag-handle-icon"></i>';
            html += '  <div class="chain-marker">';
            
            if (isFirst) {
                html += '    <i class="ph-fill ph-crown"></i>';
            } else if (isMiddle) {
                html += '    <i class="ph-bold ph-link-simple"></i>';
            } else {
                html += '    <span class="chain-num">' + index + '</span>';
            }
            
            html += '  </div>';
            html += '  <div class="chain-info">';
            html += '    <span class="chain-name">' + escapeHtml(item.name) + '</span>';
            html += '    <span class="chain-role">' + roleLabel + (isSelected ? ' • Selected' : '') + '</span>';
            html += '  </div>';
            
            if (isSelected) {
                html += '  <div class="chain-indicator"></div>';
            }
            
            html += '</div>';
        });

        elements.chainTimeline.innerHTML = html;

        var chainItems = elements.chainTimeline.querySelectorAll('.chain-item');
        chainItems.forEach(function(item) {
            item.style.cursor = 'pointer';
            item.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                var layerIndex = parseInt(item.dataset.index);
                selectChainItem(layerIndex);
            });
            
            // Right-click context menu
            item.addEventListener('contextmenu', function(e) {
                e.preventDefault();
                e.stopPropagation();
                var layerIndex = parseInt(item.dataset.index);
                selectChainItem(layerIndex);
                showChainItemContextMenu(e.clientX, e.clientY, item, layerIndex);
            });
        });

        StateManager.set('currentChain', data);

        var selectedItem = data.chain.find(function(item) { return item.isSelected; });
        if (selectedItem && typeof ChainControls !== 'undefined') {
            ChainControls.showControls(selectedItem.index);
        }
    }

    function renderChainEmpty() {
        if (elements.chainTimeline) {
            elements.chainTimeline.innerHTML = '<div class="chain-line"></div>';
        }
        if (elements.chainEmpty) {
            elements.chainEmpty.style.display = 'flex';
        }
        StateManager.set('currentChain', null);
        
        if (typeof ChainControls !== 'undefined') {
            ChainControls.hideControls();
        }
    }

    function selectChainItem(layerIndex) {
        console.log('[BolasGrid] Selecting chain item:', layerIndex);

        updateChainSelection(layerIndex);

        if (typeof ChainControls !== 'undefined' && ChainControls !== null) {
            ChainControls.showControls(layerIndex);
        }

        if (HostService && typeof HostService.selectLayerByIndex === 'function') {
            HostService.selectLayerByIndex(layerIndex).then(function(result) {
                console.log('[BolasGrid] AE selection result:', result);
            }).catch(function(e) {
                console.warn('[BolasGrid] AE selection failed:', e);
            });
        }
    }

    function updateChainSelection(layerIndex) {
        if (!elements.chainTimeline) return;
        
        var items = elements.chainTimeline.querySelectorAll('.chain-item');
        items.forEach(function(item) {
            item.classList.remove('selected');
            var indicator = item.querySelector('.chain-indicator');
            if (indicator) indicator.remove();
            
            var roleSpan = item.querySelector('.chain-role');
            if (roleSpan) {
                roleSpan.textContent = roleSpan.textContent.replace(' • Selected', '');
            }
        });
        
        var selectedItem = elements.chainTimeline.querySelector('.chain-item[data-index="' + layerIndex + '"]');
        if (selectedItem) {
            selectedItem.classList.add('selected');
            
            var indicator = document.createElement('div');
            indicator.className = 'chain-indicator';
            selectedItem.appendChild(indicator);
            
            var roleSpan = selectedItem.querySelector('.chain-role');
            if (roleSpan && roleSpan.textContent.indexOf('Selected') === -1) {
                roleSpan.textContent += ' • Selected';
            }
        }
    }

    function selectAllChain() {
        var chain = StateManager.get('currentChain');
        if (!chain || !chain.chain) {
            if (typeof StatusBar !== 'undefined') StatusBar.warning('No chain to select');
            return;
        }

        var indices = chain.chain.map(function(item) { return item.index; });
        
        if (indices.length > 0 && HostService && typeof HostService.selectChain === 'function') {
            HostService.selectChain(indices[0]).then(function() {
                if (typeof StatusBar !== 'undefined') {
                    StatusBar.success('Selected ' + indices.length + ' layers');
                }
            }).catch(function(e) {
                console.error('[BolasGrid] Select chain error:', e);
            });
        }
    }

    function unchainSelected() {
        if (HostService && typeof HostService.freeSelected === 'function') {
            HostService.freeSelected().then(function() {
                if (typeof StatusBar !== 'undefined') {
                    StatusBar.success('Layer unchained');
                }
                refreshChain();
            }).catch(function(e) {
                console.error('[BolasGrid] Unchain error:', e);
            });
        }
    }

    function breakAllChains() {
        var chain = StateManager.get('currentChain');
        if (!chain || !chain.chain) {
            if (typeof StatusBar !== 'undefined') StatusBar.warning('No chain to break');
            return;
        }

        if (HostService && typeof HostService.freeSelected === 'function') {
            HostService.freeSelected().then(function() {
                if (typeof StatusBar !== 'undefined') {
                    StatusBar.warning('All chains broken');
                }
                refreshChain();
            }).catch(function(e) {
                console.error('[BolasGrid] Break all error:', e);
            });
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // State Change Handler
    // ═══════════════════════════════════════════════════════════════

    function onStateChange(key) {
        if (key === 'currentTab') {
            // Tab changed externally
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // Utilities
    // ═══════════════════════════════════════════════════════════════

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

    function escapeHtml(text) {
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ═══════════════════════════════════════════════════════════════
    // Context Menu
    // ═══════════════════════════════════════════════════════════════

    function showChainItemContextMenu(x, y, itemElement, layerIndex) {
        if (typeof ContextMenu === 'undefined') {
            console.warn('[BolasGrid] ContextMenu not available');
            return;
        }

        var chain = StateManager.get('currentChain');
        if (!chain || !chain.chain) return;

        var chainData = chain.chain;
        var itemIndex = chainData.findIndex(function(item) { return item.index === layerIndex; });
        var isFirst = (itemIndex === 0);
        var isLast = (itemIndex === chainData.length - 1);
        var isHunter = isFirst;
        
        // Check if pinned layer exists for swap
        var hasPinnedLayer = typeof SelectionWatcher !== 'undefined' && SelectionWatcher.hasPinnedLayer();

        var menuConfig = {
            groups: [
                {
                    label: 'SELECTION',
                    items: [
                        { id: 'select', icon: 'ph-bold ph-cursor', label: 'Select in AE' },
                        { id: 'selectAll', icon: 'ph-bold ph-selection-all', label: 'Select All Chain' }
                    ]
                },
                {
                    label: 'INSERT',
                    items: [
                        { id: 'insertBefore', icon: 'ph-bold ph-arrow-line-up', label: 'Insert Before' },
                        { id: 'insertAfter', icon: 'ph-bold ph-arrow-line-down', label: 'Insert After' }
                    ]
                },
                {
                    label: 'MODIFY',
                    items: [
                        { 
                            id: 'swap', 
                            icon: 'ph-bold ph-swap', 
                            label: 'Swap with Pinned',
                            disabled: !hasPinnedLayer
                        },
                        { id: 'unchain', icon: 'ph-bold ph-link-break', label: 'Unchain', disabled: isFirst }
                    ]
                },
                {
                    label: 'DANGER',
                    items: [
                        { id: 'breakChain', icon: 'ph-bold ph-trash', label: 'Break All Chain', danger: true }
                    ]
                }
            ],
            data: {
                layerIndex: layerIndex,
                itemIndex: itemIndex,
                isHunter: isHunter,
                isLast: isLast
            },
            onAction: handleChainContextAction
        };

        ContextMenu.show(x, y, menuConfig);
    }

    function handleChainContextAction(actionId, data) {
        console.log('[BolasGrid] Context action:', actionId, data);

        switch (actionId) {
            case 'select':
                selectChainItem(data.layerIndex);
                break;
            case 'selectAll':
                selectAllChain();
                break;
            case 'insertBefore':
                executeInsertBefore(data.layerIndex);
                break;
            case 'insertAfter':
                executeInsertAfter(data.layerIndex);
                break;
            case 'swap':
                executeSwap(data.layerIndex);
                break;
            case 'unchain':
                unchainSelected();
                break;
            case 'breakChain':
                breakAllChains();
                break;
        }
    }
    
    /**
     * تنفيذ Insert Before with Undo support
     * يدعم الطبقات الحرة والمرتبطة (المرتبطة يتم تحريرها أولاً)
     */
    function executeInsertBefore(targetIndex) {
        if (typeof SelectionWatcher === 'undefined' || !SelectionWatcher.hasPinnedLayer()) {
            if (typeof StatusBar !== 'undefined') {
                StatusBar.warning('Pin a layer first');
            }
            return;
        }
        
        var pinnedLayer = SelectionWatcher.getPinnedLayer();
        
        if (pinnedLayer.index === targetIndex) {
            if (typeof StatusBar !== 'undefined') {
                StatusBar.warning('Cannot insert layer before itself');
            }
            return;
        }
        
        // إذا كانت الطبقة مرتبطة، حررها أولاً
        var doInsert = function() {
            // Begin undo recording
            var affectedLayers = [targetIndex, pinnedLayer.index];
            if (typeof UndoManager !== 'undefined') {
                UndoManager.beginOperation('insert', 'Insert Before', affectedLayers);
            }
            
            HostService.insertBefore(targetIndex, pinnedLayer.index).then(function(res) {
                if (res.success) {
                    if (typeof UndoManager !== 'undefined') {
                        UndoManager.endOperation();
                    }
                    if (typeof StatusBar !== 'undefined') {
                        StatusBar.success(res.message);
                    }
                    SelectionWatcher.clearPinnedLayer();
                    refreshChain();
                } else {
                    if (typeof UndoManager !== 'undefined') {
                        UndoManager.cancelOperation();
                    }
                    if (typeof StatusBar !== 'undefined') {
                        StatusBar.error(res.error);
                    }
                }
            }).catch(function(e) {
                if (typeof UndoManager !== 'undefined') {
                    UndoManager.cancelOperation();
                }
                console.error('[BolasGrid] Insert Before error:', e);
            });
        };
        
        // تحقق إذا كانت الطبقة مرتبطة
        if (!pinnedLayer.isFree) {
            // حرر الطبقة أولاً ثم أدخلها
            HostService.freeLayerByIndex(pinnedLayer.index).then(function(freeRes) {
                if (freeRes.success) {
                    if (typeof StatusBar !== 'undefined') {
                        StatusBar.info('Layer freed, inserting...');
                    }
                    doInsert();
                } else {
                    if (typeof StatusBar !== 'undefined') {
                        StatusBar.error('Failed to free layer: ' + freeRes.error);
                    }
                }
            }).catch(function(e) {
                console.error('[BolasGrid] Free layer error:', e);
                if (typeof StatusBar !== 'undefined') {
                    StatusBar.error('Failed to free layer');
                }
            });
        } else {
            doInsert();
        }
    }
    
    /**
     * تنفيذ Insert After with Undo support
     * يدعم الطبقات الحرة والمرتبطة (المرتبطة يتم تحريرها أولاً)
     */
    function executeInsertAfter(targetIndex) {
        if (typeof SelectionWatcher === 'undefined' || !SelectionWatcher.hasPinnedLayer()) {
            if (typeof StatusBar !== 'undefined') {
                StatusBar.warning('Pin a layer first');
            }
            return;
        }
        
        var pinnedLayer = SelectionWatcher.getPinnedLayer();
        
        if (pinnedLayer.index === targetIndex) {
            if (typeof StatusBar !== 'undefined') {
                StatusBar.warning('Cannot insert layer after itself');
            }
            return;
        }
        
        // إذا كانت الطبقة مرتبطة، حررها أولاً
        var doInsert = function() {
            // Begin undo recording
            var affectedLayers = [targetIndex, pinnedLayer.index];
            if (typeof UndoManager !== 'undefined') {
                UndoManager.beginOperation('insert', 'Insert After', affectedLayers);
            }
            
            HostService.insertAfter(targetIndex, pinnedLayer.index).then(function(res) {
                if (res.success) {
                    if (typeof UndoManager !== 'undefined') {
                        UndoManager.endOperation();
                    }
                    if (typeof StatusBar !== 'undefined') {
                        StatusBar.success(res.message);
                    }
                    if (res.warning) {
                        setTimeout(function() {
                            StatusBar.warning(res.warning);
                        }, 1500);
                    }
                    SelectionWatcher.clearPinnedLayer();
                    refreshChain();
                } else {
                    if (typeof UndoManager !== 'undefined') {
                        UndoManager.cancelOperation();
                    }
                    if (typeof StatusBar !== 'undefined') {
                        StatusBar.error(res.error);
                    }
                }
            }).catch(function(e) {
                if (typeof UndoManager !== 'undefined') {
                    UndoManager.cancelOperation();
                }
                console.error('[BolasGrid] Insert After error:', e);
            });
        };
        
        // تحقق إذا كانت الطبقة مرتبطة
        if (!pinnedLayer.isFree) {
            // حرر الطبقة أولاً ثم أدخلها
            HostService.freeLayerByIndex(pinnedLayer.index).then(function(freeRes) {
                if (freeRes.success) {
                    if (typeof StatusBar !== 'undefined') {
                        StatusBar.info('Layer freed, inserting...');
                    }
                    doInsert();
                } else {
                    if (typeof StatusBar !== 'undefined') {
                        StatusBar.error('Failed to free layer: ' + freeRes.error);
                    }
                }
            }).catch(function(e) {
                console.error('[BolasGrid] Free layer error:', e);
                if (typeof StatusBar !== 'undefined') {
                    StatusBar.error('Failed to free layer');
                }
            });
        } else {
            doInsert();
        }
    }
    
    /**
     * تنفيذ Swap - تبديل الأماكن with Undo support
     */
    
    /**
     * Execute swap between two specific layers (for Drag & Drop Reordering - FEAT-01)
     */
    function executeSwapBetween(layerAIndex, layerBIndex) {
        if (!layerAIndex || !layerBIndex || layerAIndex === layerBIndex) return;

        if (typeof StatusBar !== 'undefined') {
            StatusBar.info('Reordering chain...');
        }

        var affectedLayers = [layerAIndex, layerBIndex];
        if (typeof UndoManager !== 'undefined') {
            UndoManager.beginOperation('swap', 'Reorder Chain (Swap)', affectedLayers);
        }

        HostService.swapLayers(layerAIndex, layerBIndex).then(function(res) {
            if (res && res.success) {
                if (typeof UndoManager !== 'undefined') {
                    UndoManager.endOperation();
                }
                if (typeof StatusBar !== 'undefined') {
                    StatusBar.success('Chain reordered successfully');
                }
                refreshChain();
            } else {
                if (typeof UndoManager !== 'undefined') {
                    UndoManager.cancelOperation();
                }
                if (typeof StatusBar !== 'undefined') {
                    StatusBar.error((res && res.error) ? res.error : 'Reorder failed');
                }
            }
        }).catch(function(e) {
            if (typeof UndoManager !== 'undefined') {
                UndoManager.cancelOperation();
            }
            console.error('[BolasGrid] Drag swap error:', e);
        });
    }

    function executeSwap(targetIndex) {
        if (typeof SelectionWatcher === 'undefined' || !SelectionWatcher.hasPinnedLayer()) {
            if (typeof StatusBar !== 'undefined') {
                StatusBar.warning('Pin a layer first to swap');
            }
            return;
        }
        
        var pinnedLayer = SelectionWatcher.getPinnedLayer();
        
        if (pinnedLayer.index === targetIndex) {
            if (typeof StatusBar !== 'undefined') {
                StatusBar.warning('Cannot swap layer with itself');
            }
            return;
        }
        
        // Begin undo recording
        var affectedLayers = [targetIndex, pinnedLayer.index];
        if (typeof UndoManager !== 'undefined') {
            UndoManager.beginOperation('swap', 'Swap Layers', affectedLayers);
        }
        
        HostService.swapLayers(targetIndex, pinnedLayer.index).then(function(res) {
            if (res.success) {
                // End undo recording (success)
                if (typeof UndoManager !== 'undefined') {
                    UndoManager.endOperation();
                }
                
                if (typeof StatusBar !== 'undefined') {
                    StatusBar.success(res.message || 'Layers swapped');
                }
                SelectionWatcher.clearPinnedLayer();
                refreshChain();
            } else {
                // Cancel undo recording (failure)
                if (typeof UndoManager !== 'undefined') {
                    UndoManager.cancelOperation();
                }
                
                if (typeof StatusBar !== 'undefined') {
                    StatusBar.error(res.error);
                }
            }
        }).catch(function(e) {
            // Cancel undo recording (error)
            if (typeof UndoManager !== 'undefined') {
                UndoManager.cancelOperation();
            }
            console.error('[BolasGrid] Swap error:', e);
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // Grid Position Selection API (FIX-04)
    // ═══════════════════════════════════════════════════════════════

    function selectPosition(pos, type) {
        type = type || 'source';
        var gridElement = type === 'source' ? elements.sourceGrid : elements.attachGrid;
        if (gridElement) {
            selectSetupPosition(type, pos, gridElement);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // Public API
    // ═══════════════════════════════════════════════════════════════

    return {
        init: init,
        switchTab: switchTab,
        refreshChain: refreshChain,
        selectPosition: selectPosition
    };

})();

// Export for debugging
if (typeof window !== 'undefined') {
    window.BolasGrid = BolasGrid;
}
