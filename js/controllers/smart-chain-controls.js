/**
 * BolasPro v4.0 - Smart Chain Controls
 * UI Controller for Smart Chain Operations
 */

var SmartChainControls = (function() {
    'use strict';

    // State
    var currentLayerIndex = null;
    var availableOps = null;
    var isVisible = false;

    // DOM Elements
    var elements = {
        container: null,
        unchainSection: null,
        deleteSection: null
    };

    // ═══════════════════════════════════════════════════════════════
    // Initialization
    // ═══════════════════════════════════════════════════════════════

    function init() {
        console.log('[SmartChainControls] Initializing...');
        createUI();
        console.log('[SmartChainControls] Initialized');
    }

    /**
     * Create the Smart Chain Operations UI
     */
    function createUI() {
        // Check if container already exists
        if (document.getElementById('smartChainOperations')) {
            elements.container = document.getElementById('smartChainOperations');
            return;
        }

        // Create container
        var container = document.createElement('div');
        container.id = 'smartChainOperations';
        container.className = 'smart-chain-operations';
        container.style.display = 'none';

        // Unchain Section
        var unchainSection = document.createElement('div');
        unchainSection.className = 'operations-section unchain-section';
        unchainSection.innerHTML = [
            '<span class="operations-label"><i class="ph-bold ph-scissors"></i> UNCHAIN</span>',
            '<div class="operations-buttons">',
            '  <button class="op-btn" id="cutAfterBtn" title="Cut After - قطع ما بعد" disabled>',
            '    <i class="ph-bold ph-scissors"></i>',
            '    <span>Cut</span>',
            '  </button>',
            '  <button class="op-btn" id="bypassBtn" title="Bypass - تجاوز" disabled>',
            '    <i class="ph-bold ph-arrows-split"></i>',
            '    <span>Bypass</span>',
            '  </button>',
            '  <button class="op-btn" id="splitBtn" title="Split - تقسيم" disabled>',
            '    <i class="ph-bold ph-git-branch"></i>',
            '    <span>Split</span>',
            '  </button>',
            '</div>'
        ].join('');

        // Delete Section
        var deleteSection = document.createElement('div');
        deleteSection.className = 'operations-section delete-section';
        deleteSection.innerHTML = [
            '<span class="operations-label"><i class="ph-bold ph-trash"></i> DELETE</span>',
            '<div class="operations-buttons">',
            '  <button class="op-btn danger" id="deleteReconnectBtn" title="Delete + Reconnect - حذف وإعادة ربط" disabled>',
            '    <i class="ph-bold ph-link"></i>',
            '    <span>Reconnect</span>',
            '  </button>',
            '  <button class="op-btn danger" id="deleteFreeBtn" title="Delete + Free - حذف وتحرير" disabled>',
            '    <i class="ph-bold ph-link-break"></i>',
            '    <span>Free</span>',
            '  </button>',
            '  <button class="op-btn danger" id="deleteCascadeBtn" title="Delete Cascade - حذف متسلسل ⚠️" disabled>',
            '    <i class="ph-bold ph-trash"></i>',
            '    <span>Cascade</span>',
            '  </button>',
            '  <button class="op-btn danger" id="deletePromoteBtn" title="Delete + Promote - حذف وترقية" disabled>',
            '    <i class="ph-bold ph-crown"></i>',
            '    <span>Promote</span>',
            '  </button>',
            '</div>'
        ].join('');

        container.appendChild(unchainSection);
        container.appendChild(deleteSection);

        // Store references
        elements.container = container;
        elements.unchainSection = unchainSection;
        elements.deleteSection = deleteSection;

        // Bind events
        bindEvents();
    }

    /**
     * Bind button click events
     */
    function bindEvents() {
        // Unchain buttons
        bindButton('cutAfterBtn', handleCutAfter);
        bindButton('bypassBtn', handleBypass);
        bindButton('splitBtn', handleSplit);

        // Delete buttons
        bindButton('deleteReconnectBtn', handleDeleteReconnect);
        bindButton('deleteFreeBtn', handleDeleteFree);
        bindButton('deleteCascadeBtn', handleDeleteCascade);
        bindButton('deletePromoteBtn', handleDeletePromote);
        
        console.log('[SmartChainControls] Events bound');
    }

    function bindButton(id, handler) {
        // Query within container element first, fallback to document (REF-03)
        var btn = (elements.container && elements.container.querySelector) 
            ? elements.container.querySelector('#' + id) 
            : document.getElementById(id);
            
        if (btn) {
            btn.removeEventListener('click', handler);
            btn.addEventListener('click', handler);
        } else {
            console.warn('[SmartChainControls] Button not found:', id);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // Public Methods
    // ═══════════════════════════════════════════════════════════════

    /**
     * Show controls for a layer
     */
    function showControls(layerIndex, parentElement) {
        console.log('[SmartChainControls] Showing for layer:', layerIndex);
        
        currentLayerIndex = layerIndex;

        // Ensure UI is created
        if (!elements.container) {
            createUI();
        }

        // Append to parent FIRST (before getting operations)
        if (parentElement && elements.container) {
            if (!parentElement.contains(elements.container)) {
                parentElement.appendChild(elements.container);
            }
            elements.container.style.display = 'flex';
            isVisible = true;
            
            // Bind events AFTER adding to DOM
            bindEvents();
        }

        // Get available operations
        if (typeof HostService !== 'undefined' && HostService !== null) {
            console.log('[SmartChainControls] Calling getAvailableOperations for layer:', layerIndex);
            
            HostService.getAvailableOperations(layerIndex).then(function(ops) {
                console.log('[SmartChainControls] Available ops response:', JSON.stringify(ops));
                
                if (ops && ops.success) {
                    availableOps = ops;
                    updateButtonStates(ops);
                } else {
                    console.log('[SmartChainControls] No ops available or error:', ops ? ops.error : 'null response');
                    // Enable all buttons as fallback for testing
                    enableAllButtonsForTesting();
                }
            }).catch(function(e) {
                console.error('[SmartChainControls] Error getting ops:', e);
                // Enable all buttons as fallback for testing
                enableAllButtonsForTesting();
            });
        } else {
            console.error('[SmartChainControls] HostService not available');
            enableAllButtonsForTesting();
        }
    }
    
    /**
     * Enable all buttons for testing when API fails
     */
    function enableAllButtonsForTesting() {
        console.log('[SmartChainControls] Enabling all buttons for testing');
        var testOps = {
            canCutAfter: true,
            canBypass: true,
            canSplit: true,
            canDeleteReconnect: true,
            canDeleteFree: true,
            canDeleteCascade: true,
            canDeletePromote: true,
            followerCount: 0
        };
        updateButtonStates(testOps);
    }

    /**
     * Hide controls
     */
    function hideControls() {
        if (elements.container) {
            elements.container.style.display = 'none';
        }
        currentLayerIndex = null;
        availableOps = null;
        isVisible = false;
    }

    /**
     * Get the container element
     */
    function getContainer() {
        return elements.container;
    }

    /**
     * Check if controls are visible
     */
    function isControlsVisible() {
        return isVisible;
    }

    // ═══════════════════════════════════════════════════════════════
    // UI Updates
    // ═══════════════════════════════════════════════════════════════

    function updateButtonStates(ops) {
        console.log('[SmartChainControls] Updating button states:', ops);
        
        // Unchain buttons
        setButtonEnabled('cutAfterBtn', ops.canCutAfter);
        setButtonEnabled('bypassBtn', ops.canBypass);
        setButtonEnabled('splitBtn', ops.canSplit);

        // Delete buttons
        setButtonEnabled('deleteReconnectBtn', ops.canDeleteReconnect);
        setButtonEnabled('deleteFreeBtn', ops.canDeleteFree);
        setButtonEnabled('deleteCascadeBtn', ops.canDeleteCascade);
        setButtonEnabled('deletePromoteBtn', ops.canDeletePromote);

        // Add warning class to cascade if has followers
        var cascadeBtn = document.getElementById('deleteCascadeBtn');
        if (cascadeBtn && ops.followerCount > 0) {
            cascadeBtn.classList.add('warning');
            cascadeBtn.title = 'Delete Cascade - Will delete ' + (ops.followerCount + 1) + ' layers! ⚠️';
        } else if (cascadeBtn) {
            cascadeBtn.classList.remove('warning');
            cascadeBtn.title = 'Delete Cascade - حذف متسلسل';
        }
        
        console.log('[SmartChainControls] Button states updated');
    }

    function setButtonEnabled(id, enabled) {
        var btn = document.getElementById(id);
        if (btn) {
            btn.disabled = !enabled;
            if (enabled) {
                btn.classList.remove('disabled');
            } else {
                btn.classList.add('disabled');
            }
            console.log('[SmartChainControls] Button', id, 'enabled:', enabled);
        } else {
            console.warn('[SmartChainControls] Button not found for state update:', id);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // Operation Handlers
    // ═══════════════════════════════════════════════════════════════

    function handleCutAfter() {
        console.log('[SmartChainControls] Cut After clicked');
        executeOperation('unchainCutAfter', 'Cut After');
    }

    function handleBypass() {
        console.log('[SmartChainControls] Bypass clicked');
        executeOperation('unchainBypass', 'Bypass');
    }

    function handleSplit() {
        console.log('[SmartChainControls] Split clicked');
        executeOperation('unchainSplit', 'Split');
    }

    function handleDeleteReconnect() {
        console.log('[SmartChainControls] Delete Reconnect clicked');
        executeOperation('deleteReconnect', 'Delete + Reconnect');
    }

    function handleDeleteFree() {
        console.log('[SmartChainControls] Delete Free clicked');
        executeOperation('deleteFree', 'Delete + Free');
    }

    function handleDeleteCascade() {
        console.log('[SmartChainControls] Delete Cascade clicked');
        
        // Show beautiful confirmation modal
        if (availableOps && availableOps.followerCount > 0) {
            var total = availableOps.followerCount + 1;
            
            var message = [
                '<strong>This will permanently delete:</strong>',
                '<ul>',
                '  <li>' + availableOps.layerName + '</li>',
                '  <li>' + availableOps.followerCount + ' follower(s)</li>',
                '</ul>',
                '<div class="warning-text">',
                '  <i class="ph-bold ph-arrow-counter-clockwise"></i>',
                '  Can be undone with Ctrl+Z',
                '</div>'
            ].join('');
            
            if (typeof Modal !== 'undefined') {
                Modal.confirm({
                    icon: 'trash',
                    title: 'Delete ' + total + ' Layer(s)?',
                    message: message,
                    confirmText: 'Delete All',
                    cancelText: 'Cancel',
                    type: 'danger'
                }).then(function(confirmed) {
                    if (confirmed) {
                        executeOperation('deleteCascade', 'Delete Cascade');
                    }
                });
            } else {
                // Fallback to native confirm
                if (confirm('Delete ' + total + ' layer(s)?')) {
                    executeOperation('deleteCascade', 'Delete Cascade');
                }
            }
        } else {
            executeOperation('deleteCascade', 'Delete Cascade');
        }
    }

    function handleDeletePromote() {
        console.log('[SmartChainControls] Delete Promote clicked');
        executeOperation('deletePromote', 'Delete + Promote');
    }

    /**
     * Execute an operation with Undo support
     */
    function executeOperation(methodName, operationName) {
        console.log('[SmartChainControls] Executing:', methodName, 'for layer:', currentLayerIndex);
        
        if (currentLayerIndex === null) {
            showStatus('warning', 'No layer selected');
            return;
        }

        showStatus('info', operationName + '...');

        if (typeof HostService !== 'undefined' && HostService !== null) {
            // Check if method exists
            if (typeof HostService[methodName] !== 'function') {
                console.error('[SmartChainControls] Method not found:', methodName);
                showStatus('error', 'Method not available: ' + methodName);
                return;
            }
            
            // Determine if this is a delete operation (cannot be undone via our system)
            var isDeleteOp = methodName.indexOf('delete') === 0;
            
            // Get affected layers for undo recording
            var affectedLayers = [currentLayerIndex];
            if (availableOps && availableOps.affectedLayers) {
                affectedLayers = availableOps.affectedLayers;
            }
            
            // Begin undo recording
            if (typeof UndoManager !== 'undefined') {
                UndoManager.beginOperation(
                    isDeleteOp ? 'delete' : 'smartchain',
                    operationName,
                    affectedLayers,
                    { canUndo: !isDeleteOp }  // Delete ops marked as non-undoable
                );
            }
            
            HostService[methodName](currentLayerIndex).then(function(result) {
                console.log('[SmartChainControls] ' + operationName + ' result:', JSON.stringify(result));
                
                if (result && result.success) {
                    // End undo recording (success)
                    if (typeof UndoManager !== 'undefined') {
                        UndoManager.endOperation();
                    }
                    
                    showStatus('success', result.message || operationName + ' complete');
                    
                    // Refresh chain view if available
                    if (typeof BolasGrid !== 'undefined' && BolasGrid.refreshChain) {
                        BolasGrid.refreshChain();
                    }
                    
                    // Hide controls if layer was deleted
                    if (isDeleteOp) {
                        hideControls();
                        
                        // Also hide ChainControls if available
                        if (typeof ChainControls !== 'undefined' && ChainControls.hideControls) {
                            ChainControls.hideControls();
                        }
                    } else {
                        // Refresh controls for remaining operations
                        if (currentLayerIndex !== null) {
                            showControls(currentLayerIndex, elements.container.parentElement);
                        }
                    }
                } else {
                    // Cancel undo recording (failure)
                    if (typeof UndoManager !== 'undefined') {
                        UndoManager.cancelOperation();
                    }
                    
                    showStatus('error', result.error || operationName + ' failed');
                    
                    // Show suggestion if available
                    if (result && result.suggestion) {
                        console.log('[SmartChainControls] Suggestion:', result.suggestion);
                    }
                }
            }).catch(function(e) {
                // Cancel undo recording (error)
                if (typeof UndoManager !== 'undefined') {
                    UndoManager.cancelOperation();
                }
                
                console.error('[SmartChainControls] ' + operationName + ' error:', e);
                showStatus('error', operationName + ' error: ' + (e.message || e));
            });
        } else {
            console.error('[SmartChainControls] HostService not available for operation');
            showStatus('error', 'HostService not available');
        }
    }

    /**
     * Show status message
     */
    function showStatus(type, message) {
        if (typeof StatusBar !== 'undefined') {
            switch(type) {
                case 'success':
                    StatusBar.success(message);
                    break;
                case 'error':
                    StatusBar.error(message);
                    break;
                case 'warning':
                    StatusBar.warning(message);
                    break;
                default:
                    StatusBar.info(message);
            }
        } else {
            console.log('[SmartChainControls] ' + type + ': ' + message);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // Public API
    // ═══════════════════════════════════════════════════════════════

    return {
        init: init,
        showControls: showControls,
        hideControls: hideControls,
        getContainer: getContainer,
        isVisible: isControlsVisible,
        getCurrentLayerIndex: function() { return currentLayerIndex; },
        getAvailableOps: function() { return availableOps; }
    };

})();

// Export for debugging
if (typeof window !== 'undefined') {
    window.SmartChainControls = SmartChainControls;
}
