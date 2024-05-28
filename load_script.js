var s = document.createElement('script');
// Doit être listé dans web_accessible_resources dans manifest.json
s.src = chrome.runtime.getURL('data_interceptor.js');
s.onload = function() {
    this.remove();
};
(document.head || document.documentElement).appendChild(s);