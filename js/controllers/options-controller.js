/**
 * BolasPro v5.0 - Options Controller
 * Lock, Offset, and Delay settings with smart inputs
 */

var OptionsController = (function() {
    'use strict';

    // DOM Elements
    var elements = {
        lockOrientationBtn: null,
        maintainOffsetBtn: null,
        positionDelayInput: null,
        rotationDelayInput: null
    };

    // Step value for increment/decrement
    var STEP = 0.1;

    // ═══════════════════════════════════════════════════════════════
    // Initialization
    // ═══════════════════════════════════════════════════════════════

    function init() {
        console.log('[OptionsController] Initializing...');

        // Cache DOM elements
        elements.lockOrientationBtn = document.getElementById('lockOrientationBtn');
        elements.maintainOffsetBtn = document.getElementById('maintainOffsetBtn');
        elements.positionDelayInput = document.getElementById('positionDelayInput');
        elements.rotationDelayInput = document.getElementById('rotationDelayInput');

        // Bind events
        bindEvents();

        // Apply saved state
        applySavedState();

        console.log('[OptionsController] Initialized');
    }

    function bindEvents() {
        // Lock Orientation toggle
        if (elements.lockOrientationBtn) {
            elements.lockOrientationBtn.addEventListener('click', function() {
                toggleLockOrientation();
            });
        }

        // Maintain Offset toggle
        if (elements.maintainOffsetBtn) {
            elements.maintainOffsetBtn.addEventListener('click', function() {
                toggleMaintainOffset();
            });
        }

        // Position Delay Input
        if (elements.positionDelayInput) {
            elements.positionDelayInput.addEventListener('change', function() {
                var value = parseFloat(elements.positionDelayInput.value) || 0;
                value = clamp(value, 0, 100);
                value = roundToStep(value);
                elements.positionDelayInput.value = value;
                applyPositionDelay(value);
            });

            // Scrubbing support
            setupScrubbing(elements.positionDelayInput, applyPositionDelay);
        }

        // Rotation Delay Input
        if (elements.rotationDelayInput) {
            elements.rotationDelayInput.addEventListener('change', function() {
                var value = parseFloat(elements.rotationDelayInput.value) || 0;
                value = clamp(value, 0, 100);
                value = roundToStep(value);
                elements.rotationDelayInput.value = value;
                applyRotationDelay(value);
            });

            // Scrubbing support
            setupScrubbing(elements.rotationDelayInput, applyRotationDelay);
        }

        // Smart buttons (increment/decrement)
        var smartBtns = document.querySelectorAll('.smart-btn');
        smartBtns.forEach(function(btn) {
            btn.addEventListener('click', function() {
                var target = btn.dataset.target;
                var isIncrement = btn.classList.contains('increment');
                handleSmartButton(target, isIncrement);
            });

            // Hold to repeat
            var holdInterval = null;
            btn.addEventListener('mousedown', function() {
                var target = btn.dataset.target;
                var isIncrement = btn.classList.contains('increment');
                
                // Start repeating after 300ms
                holdInterval = setTimeout(function() {
                    holdInterval = setInterval(function() {
                        handleSmartButton(target, isIncrement);
                    }, 50);
                }, 300);
            });

            btn.addEventListener('mouseup', function() {
                clearTimeout(holdInterval);
                clearInterval(holdInterval);
            });

            btn.addEventListener('mouseleave', function() {
                clearTimeout(holdInterval);
                clearInterval(holdInterval);
            });
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // Smart Button Handler
    // ═══════════════════════════════════════════════════════════════

    function handleSmartButton(target, isIncrement) {
        var input = null;
        var applyFn = null;

        if (target === 'positionDelay') {
            input = elements.positionDelayInput;
            applyFn = applyPositionDelay;
        } else if (target === 'rotationDelay') {
            input = elements.rotationDelayInput;
            applyFn = applyRotationDelay;
        }

        if (!input) return;

        var currentValue = parseFloat(input.value) || 0;
        var newValue = isIncrement ? currentValue + STEP : currentValue - STEP;
        newValue = clamp(newValue, 0, 100);
        newValue = roundToStep(newValue);

        input.value = newValue;
        applyFn(newValue);
    }

    // ═══════════════════════════════════════════════════════════════
    // Scrubbing (Adobe-style drag to change value)
    // ═══════════════════════════════════════════════════════════════

    function setupScrubbing(input, applyFn) {
        var startX = 0;
        var startValue = 0;
        var isDragging = false;

        input.addEventListener('mousedown', function(e) {
            if (document.activeElement !== input) {
                isDragging = true;
                startX = e.clientX;
                startValue = parseFloat(input.value) || 0;
                input.style.cursor = 'ew-resize';
                e.preventDefault();
            }
        });

        document.addEventListener('mousemove', function(e) {
            if (!isDragging) return;

            var delta = (e.clientX - startX) * STEP;
            var newValue = startValue + delta;
            newValue = clamp(newValue, 0, 100);
            newValue = roundToStep(newValue);

            input.value = newValue;
        });

        document.addEventListener('mouseup', function() {
            if (isDragging) {
                isDragging = false;
                input.style.cursor = '';
                var value = parseFloat(input.value) || 0;
                applyFn(value);
            }
        });
    }

    function applySavedState() {
        // Lock Orientation
        var lockOrientation = StateManager.get('lockOrientation');
        if (elements.lockOrientationBtn) {
            elements.lockOrientationBtn.classList.toggle('active', lockOrientation);
        }

        // Maintain Offset
        var maintainOffset = StateManager.get('maintainOffset');
        if (elements.maintainOffsetBtn) {
            elements.maintainOffsetBtn.classList.toggle('active', maintainOffset);
        }

        // Position Delay
        var posDelay = StateManager.get('positionDelay') || 0;
        if (elements.positionDelayInput) {
            elements.positionDelayInput.value = posDelay;
        }

        // Rotation Delay
        var rotDelay = StateManager.get('rotationDelay') || 0;
        if (elements.rotationDelayInput) {
            elements.rotationDelayInput.value = rotDelay;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // Toggle Functions
    // ═══════════════════════════════════════════════════════════════

    function toggleLockOrientation() {
        var current = StateManager.get('lockOrientation');
        var newValue = !current;

        StateManager.set('lockOrientation', newValue);

        if (elements.lockOrientationBtn) {
            elements.lockOrientationBtn.classList.toggle('active', newValue);
        }

        if (typeof HostService !== 'undefined') {
            // Get current layer for undo recording
            var layerIndex = null;
            if (typeof ChainControls !== 'undefined' && ChainControls.getCurrentLayerIndex) {
                layerIndex = ChainControls.getCurrentLayerIndex();
            }
            
            // Begin undo recording if layer is selected
            if (typeof UndoManager !== 'undefined' && layerIndex !== null) {
                UndoManager.beginOperation('control', 'Lock Orientation → ' + (newValue ? 'ON' : 'OFF'), [layerIndex]);
            }
            
            HostService.toggleLockOrientation().then(function(result) {
                if (result && result.success) {
                    // End undo recording (success)
                    if (typeof UndoManager !== 'undefined' && layerIndex !== null) {
                        UndoManager.endOperation();
                    }
                    
                    if (typeof StatusBar !== 'undefined') {
                        StatusBar.success(result.message || ('Lock Orientation: ' + (newValue ? 'ON' : 'OFF')));
                    }
                } else {
                    // Cancel undo recording (failure)
                    if (typeof UndoManager !== 'undefined' && layerIndex !== null) {
                        UndoManager.cancelOperation();
                    }
                    
                    if (typeof StatusBar !== 'undefined') {
                        StatusBar.info('Lock Orientation: ' + (newValue ? 'ON' : 'OFF') + ' (for new chains)');
                    }
                }
            }).catch(function() {
                // Cancel undo recording (error)
                if (typeof UndoManager !== 'undefined' && layerIndex !== null) {
                    UndoManager.cancelOperation();
                }
                
                if (typeof StatusBar !== 'undefined') {
                    StatusBar.info('Lock Orientation: ' + (newValue ? 'ON' : 'OFF') + ' (for new chains)');
                }
            });
        }
    }

    function toggleMaintainOffset() {
        var current = StateManager.get('maintainOffset');
        var newValue = !current;

        StateManager.set('maintainOffset', newValue);

        if (elements.maintainOffsetBtn) {
            elements.maintainOffsetBtn.classList.toggle('active', newValue);
        }

        if (typeof StatusBar !== 'undefined') {
            StatusBar.info('Maintain Offset: ' + (newValue ? 'ON' : 'OFF'));
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // Delay Functions
    // ═══════════════════════════════════════════════════════════════

    function applyPositionDelay(value) {
        StateManager.set('positionDelay', value);

        // Check if there's a selected layer in ChainControls
        if (typeof ChainControls !== 'undefined' && ChainControls.getCurrentLayerIndex && ChainControls.getCurrentLayerIndex() !== null) {
            // Update the selected layer's control
            var layerIndex = ChainControls.getCurrentLayerIndex();
            if (typeof HostService !== 'undefined' && HostService !== null && typeof HostService === 'object') {
                
                // Begin undo recording
                if (typeof UndoManager !== 'undefined') {
                    UndoManager.beginOperation('control', 'Position Delay → ' + value, [layerIndex]);
                }
                
                HostService.updateLayerControl(layerIndex, 'positionDelay', value).then(function(result) {
                    if (result && result.success) {
                        // End undo recording (success)
                        if (typeof UndoManager !== 'undefined') {
                            UndoManager.endOperation();
                        }
                        
                        if (typeof StatusBar !== 'undefined') {
                            StatusBar.success('Position Delay: ' + value);
                        }
                    } else {
                        // Cancel undo recording (failure)
                        if (typeof UndoManager !== 'undefined') {
                            UndoManager.cancelOperation();
                        }
                    }
                }).catch(function(e) {
                    // Cancel undo recording (error)
                    if (typeof UndoManager !== 'undefined') {
                        UndoManager.cancelOperation();
                    }
                    console.error('[OptionsController] Update error:', e);
                });
            }
        } else {
            // No layer selected, just update for new chains
            if (typeof HostService !== 'undefined') {
                HostService.updatePositionDelay(value).then(function(result) {
                    if (result && result.success) {
                        if (typeof StatusBar !== 'undefined') {
                            StatusBar.success('Position Delay: ' + value);
                        }
                    } else {
                        if (typeof StatusBar !== 'undefined') {
                            StatusBar.info('Position Delay: ' + value + ' (for new chains)');
                        }
                    }
                }).catch(function() {
                    if (typeof StatusBar !== 'undefined') {
                        StatusBar.info('Position Delay: ' + value + ' (for new chains)');
                    }
                });
            }
        }
    }

    function applyRotationDelay(value) {
        StateManager.set('rotationDelay', value);

        // Check if there's a selected layer in ChainControls
        if (typeof ChainControls !== 'undefined' && ChainControls.getCurrentLayerIndex && ChainControls.getCurrentLayerIndex() !== null) {
            // Update the selected layer's control
            var layerIndex = ChainControls.getCurrentLayerIndex();
            if (typeof HostService !== 'undefined' && HostService !== null && typeof HostService === 'object') {
                
                // Begin undo recording
                if (typeof UndoManager !== 'undefined') {
                    UndoManager.beginOperation('control', 'Rotation Delay → ' + value, [layerIndex]);
                }
                
                HostService.updateLayerControl(layerIndex, 'rotationDelay', value).then(function(result) {
                    if (result && result.success) {
                        // End undo recording (success)
                        if (typeof UndoManager !== 'undefined') {
                            UndoManager.endOperation();
                        }
                        
                        if (typeof StatusBar !== 'undefined') {
                            StatusBar.success('Rotation Delay: ' + value);
                        }
                    } else {
                        // Cancel undo recording (failure)
                        if (typeof UndoManager !== 'undefined') {
                            UndoManager.cancelOperation();
                        }
                    }
                }).catch(function(e) {
                    // Cancel undo recording (error)
                    if (typeof UndoManager !== 'undefined') {
                        UndoManager.cancelOperation();
                    }
                    console.error('[OptionsController] Update error:', e);
                });
            }
        } else {
            // No layer selected, just update for new chains
            if (typeof HostService !== 'undefined') {
                HostService.updateRotationDelay(value).then(function(result) {
                    if (result && result.success) {
                        if (typeof StatusBar !== 'undefined') {
                            StatusBar.success('Rotation Delay: ' + value);
                        }
                    } else {
                        if (typeof StatusBar !== 'undefined') {
                            StatusBar.info('Rotation Delay: ' + value + ' (for new chains)');
                        }
                    }
                }).catch(function() {
                    if (typeof StatusBar !== 'undefined') {
                        StatusBar.info('Rotation Delay: ' + value + ' (for new chains)');
                    }
                });
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // Utilities
    // ═══════════════════════════════════════════════════════════════

    function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    function roundToStep(value) {
        return Math.round(value * 10) / 10;
    }

    // ═══════════════════════════════════════════════════════════════
    // Public API
    // ═══════════════════════════════════════════════════════════════

    return {
        init: init,
        toggleLockOrientation: toggleLockOrientation,
        toggleMaintainOffset: toggleMaintainOffset,
        getOptions: function() {
            return {
                lockOrientation: StateManager.get('lockOrientation'),
                maintainOffset: StateManager.get('maintainOffset'),
                positionDelay: StateManager.get('positionDelay') || 0,
                rotationDelay: StateManager.get('rotationDelay') || 0
            };
        }
    };

})();

if (typeof window !== 'undefined') {
    window.OptionsController = OptionsController;
}
