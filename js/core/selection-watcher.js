/**
 * BolasPro Selection Watcher
 * مراقبة التحديد في After Effects مع خاصية التثبيت (Pin)
 * 
 * - يستخدم AESelectionSync للمراقبة المركزية
 * - يحفظ أي طبقة (حرة أو مرتبطة)
 * - يمكن تثبيت الطبقة لمنع تغييرها
 * - الطبقات المرتبطة تظهر بلون مختلف
 */
var SelectionWatcher = (function() {
    'use strict';
    
    // ═══════════════════════════════════════════════════════════════
    // PRIVATE STATE
    // ═══════════════════════════════════════════════════════════════
    
    // Fallback polling (if AESelectionSync not available)
    var fallbackInterval = null;
    var useFallback = false;
    var pollRate = 500;
    
    // الطبقة الحرة المحفوظة
    var pinnedLayer = null;
    var isPinned = false;
    
    // آخر تحديد
    var lastSelection = null;
    
    // Callbacks
    var onPinnedLayerChanged = null;
    var onSelectionChanged = null;
    
    // UI Element
    var indicatorElement = null;
    
    // Unsubscribe functions
    var unsubscribers = [];
    
    // ═══════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════
    
    function init(options) {
        options = options || {};
        pollRate = options.pollRate || 500;
        onPinnedLayerChanged = options.onPinnedLayerChanged || null;
        onSelectionChanged = options.onSelectionChanged || null;
        
        createIndicator();
        
        // Check if AESelectionSync is available and initialized
        if (typeof AESelectionSync !== 'undefined') {
            subscribeToSync();
            console.log('[SelectionWatcher] Using AESelectionSync');
        } else {
            // Fallback to own polling
            useFallback = true;
            startFallbackPolling();
            console.log('[SelectionWatcher] Using fallback polling');
        }
        
        // Always attach to DOM
        attachToDOM();
        
        console.log('[SelectionWatcher] Initialized');
    }
    
    function subscribeToSync() {
        // Subscribe to AESelectionSync events
        unsubscribers.push(
            AESelectionSync.on('singleLayerSelected', handleSingleLayerSelected)
        );
        unsubscribers.push(
            AESelectionSync.on('freeLayerSelected', handleFreeLayerSelected)
        );
        unsubscribers.push(
            AESelectionSync.on('noSelection', handleNoSelection)
        );
        unsubscribers.push(
            AESelectionSync.on('selectionChanged', handleSelectionChanged)
        );
    }
    
    function handleSingleLayerSelected(layer) {
        updateLastSelection(layer);
        
        // إذا لم تكن مثبتة، حدّث العرض (أي طبقة - حرة أو مرتبطة)
        if (!isPinned) {
            updatePinnedLayer(layer, false);
        }
    }
    
    function handleFreeLayerSelected(layer) {
        // إذا لم تكن مثبتة، حدّث الطبقة
        if (!isPinned) {
            updatePinnedLayer(layer, false);
        }
    }
    
    function handleNoSelection() {
        updateLastSelection(null);
    }
    
    function handleSelectionChanged(data) {
        if (onSelectionChanged) {
            onSelectionChanged(data);
        }
    }

    function createIndicator() {
        // Try to find existing indicator in HTML first
        indicatorElement = document.getElementById('selectionIndicator');
        
        if (!indicatorElement) {
            // Create dynamically if not found
            indicatorElement = document.createElement('div');
            indicatorElement.className = 'selection-indicator';
            indicatorElement.id = 'selectionIndicator';
            indicatorElement.innerHTML = [
                '<i class="ph-bold ph-push-pin indicator-icon"></i>',
                '<span class="selection-name">Select layer to pin</span>',
                '<button class="clear-btn" title="Clear pinned layer">',
                '  <i class="ph-bold ph-x"></i>',
                '</button>',
                '<button class="pin-btn" title="Pin/Unpin layer">',
                '  <i class="ph-bold ph-push-pin"></i>',
                '</button>'
            ].join('');
        }
        
        // Bind click event
        indicatorElement.addEventListener('click', handleIndicatorClick);
        
        // Bind pin button
        var pinBtn = indicatorElement.querySelector('.pin-btn');
        if (pinBtn) {
            pinBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                togglePin();
            });
        }
        
        // Bind clear button
        var clearBtn = indicatorElement.querySelector('.clear-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                clearPinnedLayer();
                if (typeof StatusBar !== 'undefined') {
                    StatusBar.info('Layer cleared');
                }
            });
        }
        
        console.log('[SelectionWatcher] Indicator ready');
    }
    
    function attachToDOM() {
        // If indicator already exists in HTML, no need to attach
        if (indicatorElement && indicatorElement.parentNode) {
            console.log('[SelectionWatcher] Indicator already in DOM');
            return;
        }
        
        if (!indicatorElement) return;
        
        var container = document.querySelector('.chain-toolbar');
        if (container) {
            container.appendChild(indicatorElement);
            console.log('[SelectionWatcher] Indicator attached to DOM');
        }
    }
    
    // ═══════════════════════════════════════════════════════════════
    // FALLBACK POLLING (if AESelectionSync not available)
    // ═══════════════════════════════════════════════════════════════
    
    function startFallbackPolling() {
        if (fallbackInterval) return;
        
        fallbackInterval = setInterval(pollSelectionFallback, pollRate);
        attachToDOM();
    }
    
    function stopFallbackPolling() {
        if (fallbackInterval) {
            clearInterval(fallbackInterval);
            fallbackInterval = null;
        }
    }
    
    function pollSelectionFallback() {
        if (typeof HostService === 'undefined') return;
        
        HostService.getSelectedLayerIndex().then(function(result) {
            if (!result.success) {
                updateLastSelection(null);
                return;
            }
            
            var newSelection = {
                index: result.index,
                name: result.name,
                isFree: result.isFree
            };
            
            // تحقق من تغير التحديد
            if (!lastSelection || lastSelection.index !== newSelection.index) {
                updateLastSelection(newSelection);
                
                // إذا لم تكن مثبتة، حدّث العرض (أي طبقة)
                if (!isPinned) {
                    updatePinnedLayer(newSelection, false);
                }
            }
        }).catch(function() {});
    }
    
    // ═══════════════════════════════════════════════════════════════
    // CORE LOGIC
    // ═══════════════════════════════════════════════════════════════
    
    function start() {
        if (useFallback) {
            startFallbackPolling();
        }
        attachToDOM();
        console.log('[SelectionWatcher] Started');
    }
    
    function stop() {
        // Unsubscribe from AESelectionSync
        for (var i = 0; i < unsubscribers.length; i++) {
            unsubscribers[i]();
        }
        unsubscribers = [];
        
        // Stop fallback polling
        stopFallbackPolling();
        
        console.log('[SelectionWatcher] Stopped');
    }
    
    function updateLastSelection(selection) {
        lastSelection = selection;
        
        if (onSelectionChanged) {
            onSelectionChanged(selection);
        }
    }
    
    function updatePinnedLayer(layer, pinIt) {
        pinnedLayer = layer;
        isPinned = pinIt;
        updateIndicator();
        
        if (onPinnedLayerChanged) {
            onPinnedLayerChanged(layer, isPinned);
        }
        
        if (layer) {
            console.log('[SelectionWatcher] Layer ' + (isPinned ? 'pinned' : 'ready') + ':', layer.name);
        }
    }
    
    // ═══════════════════════════════════════════════════════════════
    // PIN FUNCTIONALITY
    // ═══════════════════════════════════════════════════════════════
    
    function handleIndicatorClick(e) {
        // تجاهل النقر على الأزرار
        if (e.target.closest('.pin-btn') || e.target.closest('.clear-btn')) return;
        
        // Toggle: إذا مثبت → حرر، إذا غير مثبت → ثبت
        if (isPinned) {
            clearPinnedLayer();
            if (typeof StatusBar !== 'undefined') {
                StatusBar.info('Layer cleared');
            }
        } else if (pinnedLayer) {
            pin();
        } else if (lastSelection) {
            // السماح بتثبيت أي طبقة (حرة أو مرتبطة)
            updatePinnedLayer(lastSelection, true);
        } else {
            if (typeof StatusBar !== 'undefined') {
                StatusBar.warning('Select a layer first');
            }
        }
    }
    
    function togglePin() {
        if (isPinned) {
            unpin();
        } else if (pinnedLayer) {
            pin();
        } else if (lastSelection) {
            // السماح بتثبيت أي طبقة (حرة أو مرتبطة)
            updatePinnedLayer(lastSelection, true);
        } else {
            if (typeof StatusBar !== 'undefined') {
                StatusBar.warning('Select a layer first');
            }
        }
    }
    
    function pin() {
        if (!pinnedLayer) {
            if (typeof StatusBar !== 'undefined') {
                StatusBar.warning('No layer to pin');
            }
            return;
        }
        
        isPinned = true;
        updateIndicator();
        
        if (typeof StatusBar !== 'undefined') {
            StatusBar.success('Layer pinned: ' + pinnedLayer.name);
        }
        
        console.log('[SelectionWatcher] Pinned:', pinnedLayer.name);
    }
    
    function unpin() {
        isPinned = false;
        updateIndicator();
        
        if (typeof StatusBar !== 'undefined') {
            StatusBar.info('Layer unpinned');
        }
        
        console.log('[SelectionWatcher] Unpinned');
    }
    
    // ═══════════════════════════════════════════════════════════════
    // UI UPDATE
    // ═══════════════════════════════════════════════════════════════
    
    function updateIndicator() {
        if (!indicatorElement) return;
        
        var nameSpan = indicatorElement.querySelector('.selection-name');
        var pinBtn = indicatorElement.querySelector('.pin-btn');
        
        // Update classes
        indicatorElement.classList.toggle('has-layer', !!pinnedLayer);
        indicatorElement.classList.toggle('is-pinned', isPinned);
        
        // تمييز الطبقات المرتبطة بلون مختلف
        var isInChain = pinnedLayer && !pinnedLayer.isFree;
        indicatorElement.classList.toggle('is-in-chain', isInChain);
        
        // Update text
        if (pinnedLayer) {
            var statusText = isInChain ? ' 🔗' : '';
            nameSpan.textContent = pinnedLayer.name + statusText;
            
            var typeLabel = isInChain ? '(in chain)' : '(free)';
            indicatorElement.title = isPinned 
                ? 'Pinned: ' + pinnedLayer.name + ' ' + typeLabel + ' (click to unpin)'
                : 'Ready: ' + pinnedLayer.name + ' ' + typeLabel + ' (click to pin)';
        } else {
            nameSpan.textContent = 'Select layer to pin';
            indicatorElement.title = 'Select any layer in AE';
        }
        
        // Update pin button
        if (pinBtn) {
            pinBtn.title = isPinned ? 'Unpin layer' : 'Pin layer';
            pinBtn.classList.toggle('active', isPinned);
        }
    }
    
    // ═══════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════
    
    function getPinnedLayer() {
        return pinnedLayer;
    }
    
    function hasPinnedLayer() {
        return pinnedLayer !== null;
    }
    
    function isPinnedState() {
        return isPinned;
    }
    
    function clearPinnedLayer() {
        pinnedLayer = null;
        isPinned = false;
        updateIndicator();
    }
    
    function getLastSelection() {
        return lastSelection;
    }
    
    // Aliases for backward compatibility
    function getLastFreeLayer() {
        return pinnedLayer;
    }
    
    function hasFreeLayer() {
        return pinnedLayer !== null;
    }
    
    function clearFreeLayer() {
        clearPinnedLayer();
    }
    
    // ═══════════════════════════════════════════════════════════════
    // PUBLIC INTERFACE
    // ═══════════════════════════════════════════════════════════════
    
    return {
        init: init,
        start: start,
        stop: stop,
        
        // Pin API
        pin: pin,
        unpin: unpin,
        togglePin: togglePin,
        isPinned: isPinnedState,
        getPinnedLayer: getPinnedLayer,
        hasPinnedLayer: hasPinnedLayer,
        clearPinnedLayer: clearPinnedLayer,
        
        // Selection API
        getLastSelection: getLastSelection,
        
        // Backward compatibility
        getLastFreeLayer: getLastFreeLayer,
        hasFreeLayer: hasFreeLayer,
        clearFreeLayer: clearFreeLayer
    };
    
})();