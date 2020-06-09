chrome.browserAction.onClicked.addListener(function (tab) {
    openSettingsTab();
});

chrome.runtime.onInstalled.addListener(function (details) {
    if (details.reason === 'install') {
        openSettingsTab();
    }
});

function openSettingsTab() {
    let settingsTab = chrome.runtime.getURL('settings.html');
    chrome.tabs.query({url: settingsTab}, function (tabs) {
        if (tabs.length > 0) {
            chrome.tabs.update(tabs[0].id, {'active': true});
        } else {
            chrome.tabs.create({url: settingsTab});
        }
    });
}