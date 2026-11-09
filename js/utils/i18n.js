/**
 * BolasPro v5.0 - Internationalization (i18n) & RTL Engine (FEAT-05)
 * Seamless English & Arabic language support
 */

var I18n = (function() {
    'use strict';

    var currentLang = 'en';

    var DICTIONARY = {
        en: {
            app_title: 'BolasPro v5.0',
            settings: 'Settings',
            presets: 'Rig Presets & Templates',
            info: 'About BolasPro',
            tab_setup: 'Setup',
            tab_chain: 'Chain',
            hunter_title: 'HUNTER (Target Layer)',
            prey_title: 'PREY (Follower Layer)',
            btn_snag: 'Snag',
            btn_free: 'Free',
            pos_delay: 'Position Delay',
            rot_delay: 'Rotation Delay',
            lock_orient: 'Lock Orientation',
            maintain_offset: 'Maintain Offset',
            ready: 'Ready',
            chain_reordered: 'Chain reordered successfully',
            guides_enabled: 'Visual guides created in composition',
            guides_disabled: 'Visual guides removed',
            settings_title: 'BolasPro Settings',
            settings_lang: 'Panel Language / لغة الواجهة',
            settings_theme: 'Motion Defaults',
            settings_spring: 'Default Spring Oscillation',
            settings_damping: 'Default Decay Damping',
            settings_save: 'Save Settings',
            about_title: 'About BolasPro v5.0.0',
            about_desc: 'Next-Generation Inverse Kinematics & Modular Follow Rigging for Adobe After Effects.',
            about_features: 'Core Features: Atomic 3x3 Snag Matrix, Physics-Based Secondary Elasticity, Drag & Drop Topology, Rig Presets, Centralized History & Multi-Language Support.'
        },
        ar: {
            app_title: 'بولاس برو v5.0',
            settings: 'الإعدادات',
            presets: 'قوالب وهياكل الربط الجاهزة',
            info: 'حول الإضافة',
            tab_setup: 'الإعداد والربط',
            tab_chain: 'شجرة السلسلة',
            hunter_title: 'القائد (الطبقة المتبوعة)',
            prey_title: 'التابع (الطبقة التابعة)',
            btn_snag: 'ربط الحلقات',
            btn_free: 'فك الارتباط',
            pos_delay: 'تأخير الموقع (ثانية)',
            rot_delay: 'تأخير الدوران (ثانية)',
            lock_orient: 'قفل اتجاه الحركة',
            maintain_offset: 'الحفاظ على الإزاحة الحالية',
            ready: 'جاهز للعمل',
            chain_reordered: 'تمت إعادة ترتيب السلسلة بنجاح',
            guides_enabled: 'تم تفعيل خطوط الأدلة البصرية في AE',
            guides_disabled: 'تم إخفاء خطوط الأدلة البصرية',
            settings_title: 'إعدادات بولاس برو',
            settings_lang: 'لغة الواجهة / Panel Language',
            settings_theme: 'الإعدادات الفيزيائية الافتراضية',
            settings_spring: 'تردد المرونة الافتراضي (Spring)',
            settings_damping: 'معامل الإخماد الافتراضي (Damping)',
            settings_save: 'حفظ وتطبيق',
            about_title: 'عن إضافة BolasPro v5.0.0',
            about_desc: 'المحرك المتطور لبناء سلاسل الحركات التابعة والفيزيائية داخل أدوبي أفتر إفكتس.',
            about_features: 'الميزات: مصفوفة التقاط 3×3 فائقة الدقة، ارتداد وفيزياء مرنة مدمجة، إعادة ترتيب العقد بالسحب والإفلات، تصدير واستيراد القوالب الجاهزة، ودعم كامل للغتين العربية والإنجليزية.'
        }
    };

    function init() {
        try {
            var savedLang = localStorage.getItem('bolas_lang');
            if (savedLang && (savedLang === 'en' || savedLang === 'ar')) {
                currentLang = savedLang;
            }
        } catch(e) {}
        
        applyLanguage(currentLang);
    }

    function t(key) {
        if (DICTIONARY[currentLang] && DICTIONARY[currentLang][key]) {
            return DICTIONARY[currentLang][key];
        }
        if (DICTIONARY.en && DICTIONARY.en[key]) {
            return DICTIONARY.en[key];
        }
        return key;
    }

    function setLanguage(lang) {
        if (lang !== 'en' && lang !== 'ar') return;
        currentLang = lang;
        try {
            localStorage.setItem('bolas_lang', lang);
        } catch(e) {}
        applyLanguage(lang);
    }

    function applyLanguage(lang) {
        var isRtl = (lang === 'ar');
        document.documentElement.lang = lang;
        document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
        
        if (document.body) {
            document.body.classList.toggle('rtl-mode', isRtl);
        }

        // Translate known DOM elements if present
        var snagLabel = document.querySelector('#snagBtn .action-btn-label');
        if (snagLabel) snagLabel.textContent = t('btn_snag');

        var freeLabel = document.querySelector('#freeBtn .action-btn-label');
        if (freeLabel) freeLabel.textContent = t('btn_free');

        var setupTab = document.querySelector('.tab-btn[data-tab="setup"]');
        if (setupTab) setupTab.textContent = t('tab_setup');

        var chainTab = document.querySelector('.tab-btn[data-tab="chain"]');
        if (chainTab) chainTab.textContent = t('tab_chain');

        var settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) settingsBtn.title = t('settings');

        var presetsBtn = document.getElementById('presetsBtn');
        if (presetsBtn) presetsBtn.title = t('presets');

        var infoBtn = document.getElementById('infoBtn');
        if (infoBtn) infoBtn.title = t('info');

        var statusMsg = document.getElementById('statusMessage');
        if (statusMsg && statusMsg.textContent.trim() === 'Ready') {
            statusMsg.textContent = t('ready');
        }

        console.log('[I18n] Language applied: ' + lang + (isRtl ? ' (RTL)' : ' (LTR)'));
    }

    return {
        init: init,
        t: t,
        setLanguage: setLanguage,
        getLanguage: function() { return currentLang; }
    };
})();

if (typeof window !== 'undefined') {
    window.I18n = I18n;
}
