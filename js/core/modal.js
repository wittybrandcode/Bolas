/**
 * BolasPro v4.0 - Modal System
 * Beautiful custom modals for confirmations and alerts
 */

var Modal = (function() {
    'use strict';

    var modalElement = null;
    var overlayElement = null;
    var currentResolve = null;
    var currentReject = null;

    /**
     * Initialize modal system
     */
    function init() {
        if (modalElement) return;
        
        // Create overlay
        overlayElement = document.createElement('div');
        overlayElement.className = 'modal-overlay';
        overlayElement.addEventListener('click', function(e) {
            if (e.target === overlayElement) {
                close(false);
            }
        });

        // Create modal container
        modalElement = document.createElement('div');
        modalElement.className = 'modal-container';
        modalElement.innerHTML = [
            '<div class="modal-header">',
            '  <div class="modal-icon"></div>',
            '  <h3 class="modal-title"></h3>',
            '  <button class="modal-close" title="Close">',
            '    <i class="ph-bold ph-x"></i>',
            '  </button>',
            '</div>',
            '<div class="modal-body"></div>',
            '<div class="modal-footer"></div>'
        ].join('');

        overlayElement.appendChild(modalElement);
        document.body.appendChild(overlayElement);

        // Bind close button
        modalElement.querySelector('.modal-close').addEventListener('click', function() {
            close(false);
        });

        // ESC key to close
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && overlayElement.classList.contains('active')) {
                close(false);
            }
        });

        console.log('[Modal] Initialized');
    }

    /**
     * Show confirmation modal
     */
    function confirm(options) {
        init();
        
        return new Promise(function(resolve, reject) {
            currentResolve = resolve;
            currentReject = reject;

            var icon = options.icon || 'warning';
            var title = options.title || 'Confirm';
            var message = options.message || 'Are you sure?';
            var confirmText = options.confirmText || 'Confirm';
            var cancelText = options.cancelText || 'Cancel';
            var type = options.type || 'warning'; // warning, danger, info

            // Set icon
            var iconHtml = getIconHtml(icon, type);
            modalElement.querySelector('.modal-icon').innerHTML = iconHtml;

            // Set title
            modalElement.querySelector('.modal-title').textContent = title;

            // Set body
            modalElement.querySelector('.modal-body').innerHTML = message;

            // Set footer buttons
            var footerHtml = [
                '<button class="modal-btn cancel">' + cancelText + '</button>',
                '<button class="modal-btn confirm ' + type + '">' + confirmText + '</button>'
            ].join('');
            modalElement.querySelector('.modal-footer').innerHTML = footerHtml;

            // Bind button events
            modalElement.querySelector('.modal-btn.cancel').addEventListener('click', function() {
                close(false);
            });
            modalElement.querySelector('.modal-btn.confirm').addEventListener('click', function() {
                close(true);
            });

            // Set modal type class
            modalElement.className = 'modal-container ' + type;

            // Show modal
            overlayElement.classList.add('active');
            
            // Focus confirm button
            setTimeout(function() {
                modalElement.querySelector('.modal-btn.confirm').focus();
            }, 100);
        });
    }

    /**
     * Show alert modal (single button)
     */
    function alert(options) {
        init();
        
        return new Promise(function(resolve) {
            currentResolve = resolve;

            var icon = options.icon || 'info';
            var title = options.title || 'Alert';
            var message = options.message || '';
            var buttonText = options.buttonText || 'OK';
            var type = options.type || 'info';

            // Set icon
            var iconHtml = getIconHtml(icon, type);
            modalElement.querySelector('.modal-icon').innerHTML = iconHtml;

            // Set title
            modalElement.querySelector('.modal-title').textContent = title;

            // Set body
            modalElement.querySelector('.modal-body').innerHTML = message;

            // Set footer button
            var footerHtml = '<button class="modal-btn confirm ' + type + '">' + buttonText + '</button>';
            modalElement.querySelector('.modal-footer').innerHTML = footerHtml;

            // Bind button event
            modalElement.querySelector('.modal-btn.confirm').addEventListener('click', function() {
                close(true);
            });

            // Set modal type class
            modalElement.className = 'modal-container ' + type;

            // Show modal
            overlayElement.classList.add('active');
        });
    }

    /**
     * Get icon HTML based on type
     */
    function getIconHtml(icon, type) {
        var iconClass = '';
        
        switch(icon) {
            case 'warning':
                iconClass = 'ph-fill ph-warning';
                break;
            case 'danger':
            case 'trash':
                iconClass = 'ph-fill ph-trash';
                break;
            case 'info':
                iconClass = 'ph-fill ph-info';
                break;
            case 'success':
                iconClass = 'ph-fill ph-check-circle';
                break;
            case 'question':
                iconClass = 'ph-fill ph-question';
                break;
            default:
                iconClass = 'ph-fill ph-' + icon;
        }

        return '<i class="' + iconClass + '"></i>';
    }

    /**
     * Close modal
     */
    function close(result) {
        overlayElement.classList.remove('active');
        
        if (currentResolve) {
            currentResolve(result);
            currentResolve = null;
            currentReject = null;
        }
    }

    /**
     * Check if modal is open
     */
    function isOpen() {
        return overlayElement && overlayElement.classList.contains('active');
    }

    return {
        init: init,
        confirm: confirm,
        alert: alert,
        close: close,
        isOpen: isOpen
    };

})();

// Export
if (typeof window !== 'undefined') {
    window.Modal = Modal;
}
