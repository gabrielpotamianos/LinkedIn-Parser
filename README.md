# LinkedIn-Parser
This project is a Chrome extension that can be used to parse relevant data of a LinkedIn profile for easier management of Talent Acquisition

# LinkedIn Parser Chrome Extension

**Version:** 1.0.0  
**Author:** gabri.da.dev
**Date:** 2025-05-09

---

## Introduction

The **LinkedIn Parser** Chrome extension automates extraction of public LinkedIn profile data (name, headline, location, about, experience, education, skills) and persists it locally for downstream workflows. Built with Manifest V3, it leverages a content script for scraping, a background service worker for orchestration, and a popup UI for authentication and entry management.

---

## Key Features

- **Secure Authentication** via popup, with token persistence.
- **Dynamic Scraping** of LinkedIn profile fields, including “See more” expansions of Skills and Education.  
- **Animated Rendering** in a dedicated profile view, with parallel typewriter effects.  
- **Persistent Storage** using `chrome.storage.local`, surviving browser restarts.  
- **Theming**: light & dark modes with user-toggled preference saved.  
- **Robust Modularity** with shared utility modules for validation, theming, API, and UI.  


## Installation

  To be found in Chrome Web Store  

---

## Usage

1. **Authenticate**  
   - To be linked to an API and a Database
2. **Parse a Profile**  
   - Navigate to any LinkedIn profile   
   - Click *Parse Candidate* in the popup  
3. **Review & Save**  
   - Profile view opens  
   - Click *Save Candidate* to send to API or *Discard* to clear  

---

## Project Structure


```
📁 extension/
├── 📁 .github/
│   └── 📁 workflows/
├── 📁 auth/
├── 📁 cypress/
├── 📁 icons/
├── 📁 parse/
├── 📁 profile/
├── 📁 shared/
├── 📁 tests/
│   ├── 📁 auth/
│   ├── 📁 fixtures/
│   ├── 📁 profile/
│   └── 📁 shared/
├── 📄 background.test.js
├── 📄 content.test.js
├── 📄 .gitignore
├── 📄 background.js
├── 📄 content.js
├── 📄 cypress.config.js
├── 📄 jest.config.mjs
├── 📄 manifest.json
├── 📄 package-lock.json
├── 📄 package.json
└── 📄 README.md
```




## License

[MIT License](LICENSE) © 2025 gabri.da.dev

---

*“Quality is not an act, it is a habit.” — Aristotle*
