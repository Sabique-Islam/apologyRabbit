(function () {
    'use strict';

    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log('Message received:', request);

        if (request.action === 'getTweetData') {
            const tweetData = extractTweetData();
            console.log('Extracted tweet data:', tweetData);
            sendResponse(tweetData);
        }
        return true; // Keep channel open for async response
    });

    function extractTweetData() {
        try {
            console.log('Starting tweet extraction...');

            // Method 1: Try to get the main article with data-testid="tweet"
            let mainTweet = document.querySelector('article[data-testid="tweet"]');

            // Method 2: If not found, get the first article (usually the focused tweet on status pages)
            if (!mainTweet) {
                const articles = document.querySelectorAll('article');
                mainTweet = articles[0];
                console.log('Using first article, found', articles.length, 'total articles');
            }

            if (!mainTweet) {
                console.error('No tweet article found');
                return null;
            }

            // Extract data
            const authorHandle = extractAuthorHandle(mainTweet);
            const tweetText = extractTweetText(mainTweet);
            const timestamp = extractTimestamp(mainTweet);
            const authorAvatar = extractAuthorAvatar(mainTweet);
            const contextPosts = extractContextPosts();

            const data = {
                authorHandle,
                text: tweetText,
                timestamp,
                authorAvatar,
                contextPosts
            };

            console.log('Extracted data:', data);
            return data;
        } catch (error) {
            console.error('ApologyRabbit: Error extracting tweet data', error);
            return null;
        }
    }

    function extractAuthorHandle(tweetElement) {
        // Get from URL first (most reliable, ig)
        const url = window.location.href;
        const match = url.match(/(?:twitter\.com|x\.com)\/([^\/]+)\/status/);
        if (match && match[1]) {
            console.log('Author from URL:', match[1]);
            return match[1];
        }

        // Find handle in the tweet element (logic -> start with @)
        if (tweetElement) {
            const links = tweetElement.querySelectorAll('a[href*="/"]');
            for (const link of links) {
                const href = link.getAttribute('href');
                if (href && href.startsWith('/') && !href.includes('/status/')) {
                    const handle = href.substring(1).split('/')[0];
                    if (handle && handle.length > 0) {
                        console.log('Author from link:', handle);
                        return handle;
                    }
                }
            }
        }
        return 'unknown';
    }

    function extractTweetText(tweetElement) {
        if (!tweetElement) {
            console.log('No tweet element for text extraction');
            return null;
        }

        // data-testid="tweetText"
        const textElement = tweetElement.querySelector('[data-testid="tweetText"]');
        if (textElement) {
            const text = textElement.innerText || textElement.textContent;
            console.log('Tweet text found:', text.substring(0, 50) + '...');
            return text.trim();
        }

        // Fallback: find any text content in the article
        const spans = tweetElement.querySelectorAll('div[lang] span');
        if (spans.length > 0) {
            const text = Array.from(spans).map(s => s.textContent).join(' ');
            console.log('Tweet text from spans:', text.substring(0, 50) + '...');
            return text.trim();
        }
        return null;
    }

    function extractTimestamp(tweetElement) {
        const timeElement = tweetElement ? tweetElement.querySelector('time') : document.querySelector('time');

        if (timeElement) {
            const datetime = timeElement.getAttribute('datetime');
            if (datetime) {
                return datetime;
            }

            const title = timeElement.getAttribute('title');
            if (title) {
                return title;
            }

            const text = timeElement.textContent;
            return text;
        }

        return null;
    }

    function extractAuthorAvatar(tweetElement) {
        const avatarSelectors = [
            'img[src*="profile_images"]',
            'img[alt*="profile"]',
            '[data-testid="Tweet-User-Avatar"] img'
        ];

        for (const selector of avatarSelectors) {
            const img = tweetElement ? tweetElement.querySelector(selector) : document.querySelector(selector);
            if (img && img.src) {
                return img.src;
            }
        }

        return null;
    }

    function extractContextPosts() {
        const context = [];

        const allTweetTexts = document.querySelectorAll('[data-testid="tweetText"]');

        console.log('Found', allTweetTexts.length, 'tweets for context');

        // skip the first one (main tweet) and get up to 5 context posts (patch work, can be improved, I couldnt think of a better method for the given timeframe)
        for (let i = 1; i < Math.min(allTweetTexts.length, 6); i++) {
            const text = allTweetTexts[i].innerText || allTweetTexts[i].textContent;
            if (text && text.trim().length > 10) {
                context.push(text.trim().substring(0, 280));
            }
        }

        return context;
    }
})();
