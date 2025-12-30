# ApologyRabbit 🐰

**Apology Analysis Assistant for X**

ApologyRabbit is a Chrome extension that analyzes public apology posts on X using AI-powered rubric-based evaluation.

![ApologyRabbit](./static/video/apologyRabbit.mp4)

---

## Features

- **Rubric-Based Analysis**: Evaluates apologies across 5 key dimensions
  - Responsibility & Ownership
  - Specificity
  - Victim Focus
  - Corrective Action
  - Timing & Context Alignment
  
- **Language Red Flag Detection**: Identifies PR-style wording, legal-safe phrasing, and minimization

- **Final Verdict**: Provides one of four assessments:
  - Genuine Accountability
  - Partial Accountability
  - PR-Oriented Apology
  - Insufficient Information to Judge

---

## Installation

### Developer Mode Installation

1. **Download/Clone** this repository to your computer

2. **Open Chrome** and navigate to `chrome://extensions/`

3. **Enable Developer Mode** by toggling the switch in the top-right corner

4. **Click "Load unpacked"** and select the `apologyrabbit` folder

5. The extension icon should appear in your Chrome toolbar

---

### Get Gemini API Key -> [Google AI Studio](https://aistudio.google.com/app/apikey)

---

## Usage

1. **Navigate to X/Twitter** and open a tweet you want to analyze

2. **Click the ApologyRabbit icon** in your Chrome toolbar

3. **Enter Gemini API Key** (first time only)
   - Click the settings gear icon
   - Paste your API key
   - Click "Save API Key"

4. **Click "Analyze Apology"**

---

## Principles

- Do not speculate beyond provided posts
- Do not assume intent
- Do not moralize or shame
- Critique the apology, not the person

---

## Privacy

- Your API key is stored locally in Chrome storage
- Tweet data is only sent to Google's Gemini API for analysis
- No data is collected or stored by the extension

---
