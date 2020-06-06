let settingsTab = chrome.runtime.getURL('settings.html');
chrome.browserAction.onClicked.addListener(function (tab) {
    chrome.tabs.query({url: settingsTab}, function (tabs) {
        if (tabs.length > 0) {
            chrome.tabs.update(tabs[0].id, {'active': true});
        } else {
            chrome.tabs.create({url: settingsTab});
        }
    });
});

chrome.runtime.onInstalled.addListener(function() {
    chrome.tabs.create({url: settingsTab});
});