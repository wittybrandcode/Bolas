/**
 * BolasPro v5.0 - Rig Preset Manager (FEAT-03)
 * Built-in motion templates, export and import of custom chain rigs
 */

var PresetManager = (function() {
    'use strict';

    // Built-in motion rigging templates
    var BUILTIN_PRESETS = [
        {
            id: 'standard',
            name: 'Standard Chain',
            nameAr: 'سلسلة قياسية',
            desc: 'Direct follow without delay, smooth natural connection',
            icon: 'ph-bold ph-link',
            settings: {
                snagPoint: 5,
                preyAnchor: 5,
                lockOrientation: false,
                maintainOffset: false,
                positionDelay: 0,
                rotationDelay: 0,
                spring: 0,
                damping: 2
            }
        },
        {
            id: 'elastic-rope',
            name: 'Elastic Rope',
            nameAr: 'حبل مرن ونابض',
            desc: 'Secondary spring oscillation with realistic trailing elasticity',
            icon: 'ph-bold ph-waveform',
            settings: {
                snagPoint: 8,
                preyAnchor: 2,
                lockOrientation: true,
                maintainOffset: false,
                positionDelay: 0.12,
                rotationDelay: 0.08,
                spring: 3.5,
                damping: 1.8
            }
        },
        {
            id: 'lagging-tail',
            name: 'Lagging Tail',
            nameAr: 'ذيل انسيابي',
            desc: 'Smooth wave-like delay propagation perfect for tails & hair',
            icon: 'ph-bold ph-wave-sine',
            settings: {
                snagPoint: 5,
                preyAnchor: 5,
                lockOrientation: true,
                maintainOffset: false,
                positionDelay: 0.15,
                rotationDelay: 0.18,
                spring: 0,
                damping: 2
            }
        },
        {
            id: 'mechanical-joint',
            name: 'Mechanical Joint',
            nameAr: 'مفصل ميكانيكي',
            desc: 'Edge-to-edge attachment with locked rotation for robotic rigs',
            icon: 'ph-bold ph-gear-six',
            settings: {
                snagPoint: 6,
                preyAnchor: 4,
                lockOrientation: true,
                maintainOffset: false,
                positionDelay: 0,
                rotationDelay: 0,
                spring: 0,
                damping: 2
            }
        },
        {
            id: 'bouncy-antenna',
            name: 'Bouncy Antenna',
            nameAr: 'هوائي نطاط',
            desc: 'High-frequency bouncy reaction to sudden movements',
            icon: 'ph-bold ph-broadcast',
            settings: {
                snagPoint: 2,
                preyAnchor: 8,
                lockOrientation: true,
                maintainOffset: false,
                positionDelay: 0.08,
                rotationDelay: 0.12,
                spring: 5.0,
                damping: 1.2
            }
        }
    ];

    function init() {
        console.log('[PresetManager] Initializing...');
        bindUI();
        console.log('[PresetManager] Initialized with ' + BUILTIN_PRESETS.length + ' built-in templates');
    }

    function bindUI() {
        var presetsBtn = document.getElementById('presetsBtn');
        var presetsToolbarBtn = document.getElementById('presetsToolbarBtn');
        
        if (presetsBtn) {
            presetsBtn.addEventListener('click', showPresetsModal);
        }
        if (presetsToolbarBtn) {
            presetsToolbarBtn.addEventListener('click', showPresetsModal);
        }
    }

    function showPresetsModal() {
        if (typeof Modal === 'undefined') {
            alert('Modal system unavailable');
            return;
        }

        var html = [
            '<div class="presets-modal-container">',
            '  <p class="presets-modal-intro">Choose a built-in motion rig template or export/import custom rigs:</p>',
            '  <div class="presets-grid">'
        ];

        BUILTIN_PRESETS.forEach(function(p) {
            html.push(
                '<div class="preset-card" data-preset="' + p.id + '">',
                '  <div class="preset-card-header">',
                '    <i class="' + p.icon + '"></i>',
                '    <span class="preset-card-title">' + p.name + '</span>',
                '  </div>',
                '  <p class="preset-card-desc">' + p.desc + '</p>',
                '  <button class="preset-apply-btn" data-preset="' + p.id + '">Apply Template</button>',
                '</div>'
            );
        });

        html.push(
            '  </div>',
            '  <div class="presets-actions-footer">',
            '    <button class="modal-btn secondary" id="exportRigBtn"><i class="ph-bold ph-download-simple"></i> Export Current Rig</button>',
            '    <label class="modal-btn secondary file-input-label" for="importRigInput"><i class="ph-bold ph-upload-simple"></i> Import Rig JSON</label>',
            '    <input type="file" id="importRigInput" accept=".json,.bolasrig" style="display:none;">',
            '  </div>',
            '</div>'
        );

        Modal.show({
            title: 'Rig Presets & Motion Templates',
            content: html.join(''),
            buttons: [
                { id: 'close', label: 'Close', primary: false }
            ]
        });

        // Add event listeners within modal
        setTimeout(function() {
            var applyBtns = document.querySelectorAll('.preset-apply-btn');
            applyBtns.forEach(function(b) {
                b.addEventListener('click', function() {
                    var pId = b.dataset.preset;
                    applyPresetById(pId);
                    Modal.hide();
                });
            });

            var expBtn = document.getElementById('exportRigBtn');
            if (expBtn) {
                expBtn.addEventListener('click', exportCurrentRig);
            }

            var impInput = document.getElementById('importRigInput');
            if (impInput) {
                impInput.addEventListener('change', function(e) {
                    if (e.target.files && e.target.files[0]) {
                        importRigFile(e.target.files[0]);
                        Modal.hide();
                    }
                });
            }
        }, 100);
    }

    function applyPresetById(presetId) {
        var preset = BUILTIN_PRESETS.find(function(p) { return p.id === presetId; });
        if (!preset) return;
        applySettings(preset.settings, preset.name);
    }

    function applySettings(settings, name) {
        if (!settings) return;

        // Apply into StateManager
        if (typeof StateManager !== 'undefined') {
            if (settings.snagPoint) StateManager.set('positions.source', settings.snagPoint);
            if (settings.preyAnchor) StateManager.set('positions.attach', settings.preyAnchor);
            if (settings.lockOrientation !== undefined) StateManager.set('options.lockOrientation', settings.lockOrientation);
            if (settings.maintainOffset !== undefined) StateManager.set('options.maintainOffset', settings.maintainOffset);
            if (settings.positionDelay !== undefined) StateManager.set('options.positionDelay', settings.positionDelay);
            if (settings.rotationDelay !== undefined) StateManager.set('options.rotationDelay', settings.rotationDelay);
        }

        // Apply into UI
        var posDelayInput = document.getElementById('positionDelayInput');
        var rotDelayInput = document.getElementById('rotationDelayInput');
        var lockBtn = document.getElementById('lockOrientationBtn');
        var maintainBtn = document.getElementById('maintainOffsetBtn');

        if (posDelayInput && settings.positionDelay !== undefined) posDelayInput.value = settings.positionDelay;
        if (rotDelayInput && settings.rotationDelay !== undefined) rotDelayInput.value = settings.rotationDelay;
        if (lockBtn && settings.lockOrientation !== undefined) lockBtn.classList.toggle('active', settings.lockOrientation);
        if (maintainBtn && settings.maintainOffset !== undefined) maintainBtn.classList.toggle('active', settings.maintainOffset);

        if (typeof BolasGrid !== 'undefined') {
            if (settings.snagPoint) BolasGrid.selectPosition(settings.snagPoint, 'source');
            if (settings.preyAnchor) BolasGrid.selectPosition(settings.preyAnchor, 'attach');
        }

        if (typeof StatusBar !== 'undefined') {
            StatusBar.success('Applied Template: ' + (name || 'Custom Rig'));
        }
    }

    function exportCurrentRig() {
        var currentOptions = typeof StateManager !== 'undefined' ? StateManager.getSnagOptions() : {};
        var rigData = {
            format: 'BolasRig',
            version: '5.0.0',
            exportedAt: new Date().toISOString(),
            settings: {
                snagPoint: currentOptions.sourceAnchor || 5,
                preyAnchor: currentOptions.attachAnchor || 5,
                lockOrientation: currentOptions.lockOrientation || false,
                maintainOffset: currentOptions.maintainOffset || false,
                positionDelay: parseFloat(document.getElementById('positionDelayInput')?.value) || 0,
                rotationDelay: parseFloat(document.getElementById('rotationDelayInput')?.value) || 0
            }
        };

        var blob = new Blob([JSON.stringify(rigData, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'BolasRig_' + Date.now() + '.bolasrig';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        if (typeof StatusBar !== 'undefined') {
            StatusBar.success('Exported Rig Template');
        }
    }

    function importRigFile(file) {
        var reader = new FileReader();
        reader.onload = function(e) {
            try {
                var data = JSON.parse(e.target.result);
                if (data && data.settings) {
                    applySettings(data.settings, file.name.replace(/.[^/.]+$/, ''));
                } else {
                    alert('Invalid BolasRig file format');
                }
            } catch(err) {
                alert('Failed to parse rig file: ' + err.message);
            }
        };
        reader.readAsText(file);
    }

    return {
        init: init,
        showPresetsModal: showPresetsModal,
        getPresets: function() { return BUILTIN_PRESETS; },
        applyPresetById: applyPresetById
    };
})();

if (typeof window !== 'undefined') {
    window.PresetManager = PresetManager;
}
