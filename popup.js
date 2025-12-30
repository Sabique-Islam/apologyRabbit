import { GoogleGenAI } from "@google/genai";

const ANALYSIS_PROMPT = `You are ApologyRabbit, an apology analysis assistant. Analyze public apology posts on X (Twitter).

Rules: Do not speculate. Do not assume intent. Do not moralize. If evidence is weak, say so. Critique the apology, not the person.

Analyze using this structure:

## Phase 1: Context Snapshot
- What allegedly happened
- Who appears affected
- Why backlash occurred
- Whether claims are agreed upon or disputed
**Context confidence: High / Medium / Low**

## Phase 2: Apology Review

### 1. Responsibility & Ownership
**Rating: Strong / Mixed / Weak**
- Notes (1-2 bullets)

### 2. Specificity
**Rating: High / Medium / Low**
- Notes (1-2 bullets)

### 3. Victim Focus
**Rating: Victim-centered / Mixed / Self-centered**
- Flag: "This isn't who I am", "I've learned and grown", "Moving forward..."

### 4. Corrective Action
**Rating: Concrete / Vague / Missing**
- Notes (1-2 bullets)

### 5. Timing & Context Alignment
- Delay, consistency, escalation patterns

## Phase 3: Language Red Flags
Quote exact phrases if found (PR wording, legal-safe phrasing, minimization).

## Phase 4: Timeline
- **Incident:** ...
- **Backlash:** ...
- **Apology:** ...

## Phase 5: Final Verdict
Choose: **Genuine Accountability** / **Partial Accountability** / **PR-Oriented Apology** / **Insufficient Information to Judge**
Justify in 2-3 sentences.

---
Analyze this:
**Author:** {author}
**Timestamp:** {timestamp}
**Apology Post:** {apology_text}
{context_section}`;

const elements = {
    settingsBtn: document.getElementById('settingsBtn'),
    settingsPanel: document.getElementById('settingsPanel'),
    closeSettings: document.getElementById('closeSettings'),
    apiKeyInput: document.getElementById('apiKey'),
    toggleApiKey: document.getElementById('toggleApiKey'),
    saveApiKey: document.getElementById('saveApiKey'),
    statusSection: document.getElementById('statusSection'),
    tweetPreview: document.getElementById('tweetPreview'),
    authorName: document.getElementById('authorName'),
    tweetTime: document.getElementById('tweetTime'),
    tweetContent: document.getElementById('tweetContent'),
    authorAvatar: document.getElementById('authorAvatar'),
    analyzeBtn: document.getElementById('analyzeBtn'),
    loadingState: document.getElementById('loadingState'),
    resultsSection: document.getElementById('resultsSection'),
    resultsContent: document.getElementById('resultsContent'),
    copyResults: document.getElementById('copyResults'),
    newAnalysis: document.getElementById('newAnalysis'),
    errorState: document.getElementById('errorState'),
    errorTitle: document.getElementById('errorTitle'),
    errorMessage: document.getElementById('errorMessage'),
    retryBtn: document.getElementById('retryBtn')
};

let currentTweetData = null;
let analysisResult = null;

function showToast(message, type = 'success') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

function formatTimestamp(ts) {
    if (!ts) return 'Unknown time';
    try {
        return new Date(ts).toLocaleString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
            hour: 'numeric', minute: '2-digit', hour12: true
        });
    } catch { return ts; }
}

function parseMarkdown(md) {
    let html = md
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
        .replace(/^## (.*$)/gm, '<h2>$1</h2>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>')
        .replace(/^- (.*$)/gm, '<li>$1</li>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');

    html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>').replace(/<\/ul>\s*<ul>/g, '');

    const ratings = {
        'Strong': 'rating-strong', 'High': 'rating-high', 'Concrete': 'rating-concrete',
        'Victim-centered': 'rating-victim-centered', 'Mixed': 'rating-mixed', 'Medium': 'rating-medium',
        'Vague': 'rating-vague', 'Weak': 'rating-weak', 'Low': 'rating-low',
        'Missing': 'rating-missing', 'Self-centered': 'rating-self-centered'
    };

    Object.entries(ratings).forEach(([word, cls]) => {
        html = html.replace(new RegExp(`\\b${word}\\b`, 'g'), `<span class="${cls}">${word}</span>`);
    });

    return `<p>${html}</p>`;
}

async function loadApiKey() {
    try {
        const result = await chrome.storage.local.get(['geminiApiKey']);
        if (result.geminiApiKey) elements.apiKeyInput.value = result.geminiApiKey;
    } catch (e) { console.error('Error loading API key:', e); }
}

async function saveApiKey() {
    const key = elements.apiKeyInput.value.trim();
    if (!key) { showToast('Please enter an API key', 'error'); return; }

    try {
        await chrome.storage.local.set({ geminiApiKey: key });
        showToast('API key saved');
        elements.settingsPanel.classList.add('hidden');
    } catch (e) { showToast('Failed to save', 'error'); }
}

async function detectCurrentTweet() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.url?.includes('/status/')) return null;
        if (!tab.url.includes('twitter.com') && !tab.url.includes('x.com')) return null;

        // Send message and wait for response with timeout
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'getTweetData' });
        return response;
    } catch (e) {
        console.error('Error detecting tweet:', e);
        return null;
    }
}

function updateTweetPreview(data) {
    if (!data) {
        elements.statusSection.classList.remove('hidden');
        elements.tweetPreview.classList.add('hidden');
        elements.analyzeBtn.disabled = true;
        return;
    }

    currentTweetData = data;
    elements.authorName.textContent = `@${data.authorHandle || 'unknown'}`;
    elements.tweetTime.textContent = formatTimestamp(data.timestamp);
    elements.tweetContent.innerHTML = `<p>${data.text || 'No content'}</p>`;
    if (data.authorAvatar) elements.authorAvatar.innerHTML = `<img src="${data.authorAvatar}" alt="">`;

    elements.statusSection.classList.add('hidden');
    elements.tweetPreview.classList.remove('hidden');
    elements.analyzeBtn.disabled = false;
}

async function analyzeApology() {
    if (!currentTweetData) { showToast('No tweet detected', 'error'); return; }

    const result = await chrome.storage.local.get(['geminiApiKey']);
    if (!result.geminiApiKey) {
        showToast('Set your API key first', 'error');
        elements.settingsPanel.classList.remove('hidden');
        return;
    }

    showLoadingState();

    try {
        const ctx = currentTweetData.contextPosts?.length
            ? `**Context:** ${currentTweetData.contextPosts.join(' | ')}` : '';

        const prompt = ANALYSIS_PROMPT
            .replace('{author}', currentTweetData.authorHandle || 'Unknown')
            .replace('{timestamp}', currentTweetData.timestamp || 'Unknown')
            .replace('{apology_text}', currentTweetData.text || '')
            .replace('{context_section}', ctx);

        // Initialize the Google GenAI client
        const ai = new GoogleGenAI({ apiKey: result.geminiApiKey });

        // Generate content using gemini-2.5-flash
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                temperature: 0.7
            }
        });

        const responseText = response.text; // Matching user example property access

        if (!responseText) {
            throw new Error('Invalid response from API');
        }

        analysisResult = responseText;
        showResults(analysisResult);
    } catch (e) {
        console.error('Analysis error:', e);
        showError('Analysis Failed', e.message || 'An error occurred during analysis');
    }
}

function showLoadingState() {
    ['statusSection', 'tweetPreview', 'analyzeBtn', 'resultsSection', 'errorState']
        .forEach(k => elements[k].classList.add('hidden'));
    elements.loadingState.classList.remove('hidden');
}

function showResults(md) {
    elements.loadingState.classList.add('hidden');
    elements.resultsContent.innerHTML = parseMarkdown(md);
    elements.resultsSection.classList.remove('hidden');
}

function showError(title, msg) {
    elements.loadingState.classList.add('hidden');
    elements.errorTitle.textContent = title;
    elements.errorMessage.textContent = msg;
    elements.errorState.classList.remove('hidden');
}

function reset() {
    ['loadingState', 'resultsSection', 'errorState'].forEach(k => elements[k].classList.add('hidden'));
    elements.analyzeBtn.classList.remove('hidden');
    detectCurrentTweet().then(updateTweetPreview);
}

async function copyResults() {
    if (!analysisResult) { showToast('Nothing to copy', 'error'); return; }
    try {
        await navigator.clipboard.writeText(analysisResult);
        showToast('Copied!');
    } catch { showToast('Copy failed', 'error'); }
}

function init() {
    elements.settingsBtn.addEventListener('click', () => elements.settingsPanel.classList.toggle('hidden'));
    elements.closeSettings.addEventListener('click', () => elements.settingsPanel.classList.add('hidden'));
    elements.toggleApiKey.addEventListener('click', () => {
        elements.apiKeyInput.type = elements.apiKeyInput.type === 'password' ? 'text' : 'password';
    });
    elements.saveApiKey.addEventListener('click', saveApiKey);
    elements.analyzeBtn.addEventListener('click', analyzeApology);
    elements.copyResults.addEventListener('click', copyResults);
    elements.newAnalysis.addEventListener('click', reset);
    elements.retryBtn.addEventListener('click', reset);

    loadApiKey();
    detectCurrentTweet().then(updateTweetPreview);
}

document.addEventListener('DOMContentLoaded', init);
