/**
 * CSInterface - Adobe CEP v11.0
 * Fixed version for After Effects
 */

var SystemPath = {
    USER_DATA: "userData",
    COMMON_FILES: "commonFiles", 
    MY_DOCUMENTS: "myDocuments",
    APPLICATION: "application",
    EXTENSION: "extension",
    HOST_APPLICATION: "hostApplication"
};

function CSInterface() {
    this.hostEnvironment = null;
    this.listeners = {};
}

CSInterface.prototype.getHostEnvironment = function() {
    try {
        if (window.__adobe_cep__ && window.__adobe_cep__.getHostEnvironment) {
            var env = window.__adobe_cep__.getHostEnvironment();
            return typeof env === "string" ? JSON.parse(env) : env;
        }
    } catch (e) { console.error('getHostEnvironment:', e); }
    return { appName: "AEFT", appVersion: "24.0", appLocale: "en_US" };
};

CSInterface.prototype.getSystemPath = function(pathType) {
    try {
        if (window.__adobe_cep__ && window.__adobe_cep__.getSystemPath) {
            return window.__adobe_cep__.getSystemPath(pathType);
        }
    } catch (e) { console.error('getSystemPath:', e); }
    return "";
};

CSInterface.prototype.evalScript = function(script, callback) {
    try {
        if (window.__adobe_cep__ && window.__adobe_cep__.evalScript) {
            window.__adobe_cep__.evalScript(script, callback);
            return;
        }
    } catch (e) {
        console.error('evalScript error:', e);
        if (callback) callback("Error: " + e.message);
        return;
    }
    console.log("[Mock] evalScript:", script.substring(0, 50));
    if (callback) callback("Mock: Not in CEP");
};

CSInterface.prototype.addEventListener = function(type, listener) {
    try {
        if (window.__adobe_cep__ && window.__adobe_cep__.addEventListener) {
            window.__adobe_cep__.addEventListener(type, listener);
            return;
        }
    } catch (e) { console.error('addEventListener:', e); }
    this.listeners[type] = this.listeners[type] || [];
    this.listeners[type].push(listener);
};

CSInterface.prototype.removeEventListener = function(type, listener) {
    try {
        if (window.__adobe_cep__ && window.__adobe_cep__.removeEventListener) {
            window.__adobe_cep__.removeEventListener(type, listener);
            return;
        }
    } catch (e) { console.error('removeEventListener:', e); }
};

CSInterface.prototype.dispatchEvent = function(event) {
    try {
        if (window.__adobe_cep__ && window.__adobe_cep__.dispatchEvent) {
            window.__adobe_cep__.dispatchEvent(event);
            return;
        }
    } catch (e) { console.error('dispatchEvent:', e); }
};

CSInterface.prototype.openURLInDefaultBrowser = function(url) {
    try {
        if (window.cep && window.cep.util) {
            window.cep.util.openURLInDefaultBrowser(url);
            return;
        }
    } catch (e) { console.error('openURL:', e); }
    window.open(url, "_blank");
};

CSInterface.prototype.getExtensionID = function() {
    try {
        if (window.__adobe_cep__ && window.__adobe_cep__.getExtensionId) {
            return window.__adobe_cep__.getExtensionId();
        }
    } catch (e) {}
    return "com.iconati.pro.panel";
};

CSInterface.prototype.closeExtension = function() {
    try {
        if (window.__adobe_cep__ && window.__adobe_cep__.closeExtension) {
            window.__adobe_cep__.closeExtension();
            return;
        }
    } catch (e) {}
    window.close();
};

CSInterface.prototype.getCurrentApiVersion = function() {
    return { major: 11, minor: 0, micro: 0 };
};

CSInterface.prototype.resizeContent = function(w, h) {};
CSInterface.prototype.setWindowTitle = function(t) { document.title = t; };
CSInterface.prototype.getWindowTitle = function() { return document.title; };
CSInterface.prototype.isWindowVisible = function() { return true; };

function CSEvent(type, scope) {
    this.type = type;
    this.scope = scope || "APPLICATION";
    this.data = "";
}
