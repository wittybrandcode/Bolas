/**
 * BolasPro v4.0 - Status Bar
 * Manages status messages and notifications
 */

var StatusBar = (function() {
    'use strict';
    
    var element = null;
    var textElement = null;
    var indicatorElement = null;
    var timeout = null;
    
    return {
        init: function(el) {
            element = el;
            if (element) {
                // Support both old and new class names
                textElement = element.querySelector('.status-text') || element.querySelector('.status-message');
                indicatorElement = element.querySelector('.status-indicator');
            }
            console.log('[StatusBar] Initialized, text element:', textElement ? 'found' : 'not found');
        },
        
        set: function(message, type, duration) {
            if (!element) return;
            
            type = type || '';
            duration = duration !== undefined ? duration : 3000;
            
            if (timeout) {
                clearTimeout(timeout);
                timeout = null;
            }
            
            element.classList.remove('success', 'error', 'warning', 'info');
            if (type) {
                element.classList.add(type);
            }
            
            if (textElement) {
                textElement.textContent = message;
            }
            
            if (duration > 0) {
                timeout = setTimeout(function() {
                    StatusBar.ready();
                }, duration);
            }
        },
        
        success: function(message, duration) {
            this.set(message, 'success', duration || 3000);
        },
        
        error: function(message, duration) {
            this.set(message, 'error', duration || 5000);
        },
        
        warning: function(message, duration) {
            this.set(message, 'warning', duration || 3000);
        },
        
        info: function(message, duration) {
            this.set(message, 'info', duration || 2000);
        },
        
        ready: function() {
            this.set('BolasPro v5.0 ready', '', 0);
            if (indicatorElement) {
                indicatorElement.classList.remove('error', 'warning');
                indicatorElement.classList.add('online');
            }
        }
    };
})();
