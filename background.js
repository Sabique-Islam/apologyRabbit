chrome.runtime.onInstalled.addListener(() => {
    console.log('ApologyRabbit installed');
});

// Handle any background messages if needed
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'checkApiKey') {
        chrome.storage.local.get(['geminiApiKey'], (result) => {
            sendResponse({ hasKey: !!result.geminiApiKey });
        });
        return true;
    }
});
