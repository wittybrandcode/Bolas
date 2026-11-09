/**
 * BolasPro Context Menu System
 * نظام قائمة سياق احترافي وقابل لإعادة الاستخدام
 * 
 * @version 1.0.0
 */
var ContextMenu = (function() {
    'use strict';
    
    // ═══════════════════════════════════════════════════════════
    // PRIVATE STATE
    // ═══════════════════════════════════════════════════════════
    
    var menuElement = null;
    var backdropElement = null;
    var currentConfig = null;
    var selectedIndex = -1;
    var isOpen = false;
    var flatItems = [];
    
    // ═══════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════
    
    function init() {
        if (menuElement) {
            console.warn('ContextMenu already initialized');
            return;
        }
        
        createElements();
        bindGlobalEvents();
        console.log('ContextMenu initialized');
    }
    
    function createElements() {
        // Backdrop
        backdropElement = document.createElement('div');
        backdropElement.className = 'context-menu-backdrop';
        document.body.appendChild(backdropElement);
        
        // Menu
        menuElement = document.createElement('div');
        menuElement.className = 'context-menu';
        menuElement.setAttribute('role', 'menu');
        menuElement.setAttribute('tabindex', '-1');
        document.body.appendChild(menuElement);
    }
    
    function bindGlobalEvents() {
        backdropElement.addEventListener('click', hide);
        backdropElement.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            hide();
        });
        
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('scroll', hide, true);
        window.addEventListener('resize', hide);
    }
    
    // ═══════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════
    
    function show(x, y, config) {
        if (!menuElement) {
            console.error('ContextMenu not initialized');
            return;
        }
        
        currentConfig = config;
        selectedIndex = -1;
        flatItems = [];
        
        render(config);
        positionMenu(x, y);
        
        backdropElement.classList.add('visible');
        menuElement.classList.add('visible');
        isOpen = true;
        menuElement.focus();
    }
    
    function hide() {
        if (!isOpen) return;
        
        backdropElement.classList.remove('visible');
        menuElement.classList.remove('visible');
        isOpen = false;
        currentConfig = null;
        selectedIndex = -1;
        flatItems = [];
    }
    
    function isVisible() {
        return isOpen;
    }
    
    // ═══════════════════════════════════════════════════════════
    // RENDERING
    // ═══════════════════════════════════════════════════════════
    
    function render(config) {
        var html = '';
        
        if (config.groups) {
            html = renderGroups(config.groups, config.data);
        } else if (config.items) {
            var items = typeof config.items === 'function' 
                ? config.items(config.data) 
                : config.items;
            html = renderItems(items);
        }
        
        menuElement.innerHTML = html;
        bindItemEvents();
    }
    
    function renderGroups(groups, data) {
        var html = '';
        
        groups.forEach(function(group, groupIndex) {
            if (groupIndex > 0) {
                html += '<div class="context-menu-separator"></div>';
            }
            
            if (group.label) {
                html += '<div class="context-menu-group-label">' + 
                        escapeHtml(group.label) + '</div>';
            }
            
            var items = typeof group.items === 'function' 
                ? group.items(data) 
                : group.items;
            
            html += renderItems(items);
        });
        
        return html;
    }
    
    function renderItems(items) {
        var html = '';
        
        items.forEach(function(item) {
            html += renderItem(item, flatItems.length);
            flatItems.push(item);
        });
        
        return html;
    }
    
    function renderItem(item, flatIndex) {
        var classes = ['context-menu-item'];
        
        if (item.disabled) classes.push('disabled');
        if (item.danger) classes.push('danger');
        if (item.checked) classes.push('checked');
        
        var html = '<div class="' + classes.join(' ') + '" ';
        html += 'data-action="' + escapeHtml(item.id) + '" ';
        html += 'data-index="' + flatIndex + '" ';
        html += 'role="menuitem"';
        if (item.disabled) html += ' aria-disabled="true"';
        html += '>';
        
        // Icon
        if (item.icon) {
            html += '<i class="context-menu-icon ' + escapeHtml(item.icon) + '"></i>';
        } else if (item.checked !== undefined) {
            html += '<i class="context-menu-icon ph-bold ' + 
                    (item.checked ? 'ph-check' : '') + '"></i>';
        } else {
            html += '<span class="context-menu-icon-placeholder"></span>';
        }
        
        // Label
        html += '<span class="context-menu-label">' + escapeHtml(item.label) + '</span>';
        
        // Shortcut
        if (item.shortcut) {
            html += '<span class="context-menu-shortcut">' + 
                    escapeHtml(item.shortcut) + '</span>';
        }
        
        html += '</div>';
        
        return html;
    }
    
    // ═══════════════════════════════════════════════════════════
    // POSITIONING
    // ═══════════════════════════════════════════════════════════
    
    function positionMenu(x, y) {
        menuElement.style.visibility = 'hidden';
        menuElement.style.display = 'block';
        
        var menuRect = menuElement.getBoundingClientRect();
        var viewportWidth = window.innerWidth;
        var viewportHeight = window.innerHeight;
        var padding = 10;
        
        if (x + menuRect.width > viewportWidth - padding) {
            x = viewportWidth - menuRect.width - padding;
        }
        if (x < padding) x = padding;
        
        if (y + menuRect.height > viewportHeight - padding) {
            y = viewportHeight - menuRect.height - padding;
        }
        if (y < padding) y = padding;
        
        menuElement.style.left = x + 'px';
        menuElement.style.top = y + 'px';
        menuElement.style.visibility = '';
        menuElement.style.display = '';
    }
    
    // ═══════════════════════════════════════════════════════════
    // EVENT HANDLING
    // ═══════════════════════════════════════════════════════════
    
    function bindItemEvents() {
        var items = menuElement.querySelectorAll('.context-menu-item:not(.disabled)');
        
        items.forEach(function(item) {
            item.addEventListener('click', handleItemClick);
            item.addEventListener('mouseenter', handleItemHover);
        });
    }
    
    function handleItemClick(e) {
        var actionId = e.currentTarget.getAttribute('data-action');
        var configCopy = currentConfig;
        
        hide();
        
        if (configCopy && configCopy.onAction) {
            configCopy.onAction(actionId, configCopy.data);
        }
    }
    
    function handleItemHover(e) {
        var index = parseInt(e.currentTarget.getAttribute('data-index'));
        updateSelection(index);
    }
    
    function handleKeyDown(e) {
        if (!isOpen) return;
        
        switch(e.key) {
            case 'Escape':
                e.preventDefault();
                hide();
                break;
            case 'ArrowDown':
                e.preventDefault();
                navigateNext();
                break;
            case 'ArrowUp':
                e.preventDefault();
                navigatePrev();
                break;
            case 'Enter':
            case ' ':
                e.preventDefault();
                executeSelected();
                break;
        }
    }
    
    function navigateNext() {
        var enabled = getEnabledIndices();
        if (enabled.length === 0) return;
        
        var pos = enabled.indexOf(selectedIndex);
        var next = (pos + 1) % enabled.length;
        updateSelection(enabled[next]);
    }
    
    function navigatePrev() {
        var enabled = getEnabledIndices();
        if (enabled.length === 0) return;
        
        var pos = enabled.indexOf(selectedIndex);
        var prev = pos <= 0 ? enabled.length - 1 : pos - 1;
        updateSelection(enabled[prev]);
    }
    
    function getEnabledIndices() {
        var enabled = [];
        flatItems.forEach(function(item, index) {
            if (!item.disabled) enabled.push(index);
        });
        return enabled;
    }
    
    function updateSelection(index) {
        var prev = menuElement.querySelector('.context-menu-item.selected');
        if (prev) prev.classList.remove('selected');
        
        selectedIndex = index;
        var next = menuElement.querySelector('[data-index="' + index + '"]');
        if (next) {
            next.classList.add('selected');
            next.scrollIntoView({ block: 'nearest' });
        }
    }
    
    function executeSelected() {
        if (selectedIndex < 0 || selectedIndex >= flatItems.length) return;
        
        var item = flatItems[selectedIndex];
        if (item.disabled) return;
        
        var configCopy = currentConfig;
        hide();
        
        if (configCopy && configCopy.onAction) {
            configCopy.onAction(item.id, configCopy.data);
        }
    }
    
    // ═══════════════════════════════════════════════════════════
    // UTILITIES
    // ═══════════════════════════════════════════════════════════
    
    function escapeHtml(text) {
        if (!text) return '';
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // ═══════════════════════════════════════════════════════════
    // PUBLIC INTERFACE
    // ═══════════════════════════════════════════════════════════
    
    return {
        init: init,
        show: show,
        hide: hide,
        isVisible: isVisible
    };
    
})();
