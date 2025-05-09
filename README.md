# LinkedIn-Parser
This project is meant to create a Chrome extension that can be used to parse relevant data of a LinkedIn profile for easier management of Talent Acquisition

# LinkedIn Parser Chrome Extension

**Version:** 1.0.0  
**Author:** Your Name  
**Date:** 2025-05-09

---

## 📖 Table of Contents

1. [Introduction](#introduction)  
2. [Key Features](#key-features)  
3. [Architecture & Design](#architecture--design)  
4. [Installation](#installation)  
5. [Usage](#usage)  
6. [Development Workflow](#development-workflow)  
7. [Project Structure](#project-structure)  
8. [Coding Conventions](#coding-conventions)  
9. [Testing](#testing)  
10. [Troubleshooting](#troubleshooting)  
11. [Contributing](#contributing)  
12. [License](#license)  

---

## Introduction

The **LinkedIn Parser** Chrome extension automates extraction of public LinkedIn profile data (name, headline, location, about, experience, education, skills) and persists it locally for downstream workflows. Built with Manifest V3, it leverages a content script for scraping, a background service worker for orchestration, and a popup UI for authentication and entry management.

---

## Key Features

- **Secure Authentication** via popup, with token persistence in `chrome.storage.local`.  
- **Dynamic Scraping** of LinkedIn profile fields, including “See more” expansions.  
- **Animated Rendering** in a dedicated profile view, with parallel typewriter effects.  
- **Persistent Storage** using `chrome.storage.local`, surviving browser restarts.  
- **Theming**: light & dark modes with user-toggled preference saved.  
- **Robust Modularity** with shared utility modules for validation, theming, API, and UI.  
- **Interruptible Animations**: user can discard mid-animation, immediately revealing full data.

---

## Architecture & Design

```mermaid
flowchart LR
  A[Popup (auth.html)] -->|login/register| B[background.js]
  B -->|save token| C[chrome.storage.local]
  Popup -->|invoke| D[content.js]
  D -->|scrape & message| B
  B -->|persist profileData| C
  Profile UI -->|renderProfile| E[profile.html/js]
```

1. **Popup** (`auth.js`): Manages login/register, token & userId storage, and triggers scraping.  
2. **Background Worker** (`background.js`): Listens for storage changes, manages profileData lifecycle.  
3. **Content Script** (`content.js`): Scrapes DOM sections—About, Experience, Education, Skills—deduplicates & returns result.  
4. **Profile View** (`profile.js` + `profile.html`): Renders and animates scraped data; handles Save/Discard actions.  
5. **Shared Modules**:  
   - `validation.js`: Email, password, DNS checks.  
   - `api.js`: REST calls for login/register (stubbed for now).  
   - `themes.js`: Applies & persists light/dark themes.  
   - `ui.js`: Manages tab switching, form visibility, toast feedback.

---

## Installation

1. **Clone the repo**  
   ```bash
   git clone https://github.com/your-org/linkedin-parser.git
   cd linkedin-parser/extension
   ```
2. **Load unpacked**  
   - Open `chrome://extensions/`  
   - Enable *Developer mode*  
   - Click *Load unpacked*, select the `extension/` directory  
3. **Inspect & Debug**  
   - Background: “Service Worker” → *Inspect*  
   - Popup: open via toolbar icon → *Inspect*  
   - Profile view: navigate to `chrome-extension://<ID>/profile/profile.html` → *Inspect*  

---

## Usage

1. **Authenticate**  
   - Click the toolbar icon  
   - *Sign In* or *Register* (uses `api.login`/`api.register`)  
2. **Parse a Profile**  
   - Navigate to any LinkedIn profile (`/in/…`)  
   - Click *Parse Candidate* in the popup  
3. **Review & Save**  
   - Profile view opens, animates the data  
   - Click *Save Candidate* to persist or *Discard* to clear  

---

## Development Workflow

1. **Code Style & Linting**  
   - Prettier + ESLint with 2-space indent, semicolons enforced  
2. **Build & Bundling**  
   - No build step for now—module imports via native ES modules in Manifest V3  
3. **Versioning**  
   - Follow SemVer (MAJOR.MINOR.PATCH)  
   - Tag releases in Git: `git tag v1.0.0`  

---

## Project Structure

```
extension/
├─ auth/
│  ├─ auth.html
│  ├─ auth.css
│  └─ auth.js
├─ profile/
│  ├─ profile.html
│  ├─ profile.css
│  └─ profile.js
├─ shared/
│  ├─ api.js
│  ├─ themes.js
│  ├─ ui.js
│  ├─ validation.js
│  └─ (other utilities)
├─ content.js
├─ background.js
├─ manifest.json
└─ README.md
```

---

## Coding Conventions

- **Separation of concerns**: Each module handles a single responsibility.  
- **JSDoc comments** on all public functions & modules.  
- **No magic numbers**; CSS variables for colors/spacings.  
- **Async/Await** for all async flows; Promises in `typeWriter`.  
- **Error handling**: `.catch` blocks on messaging & storage calls.

---

## Testing

- **Manual**: Use Chrome DevTools network & storage inspectors.  
- **Unit**: Stub out `chrome.*` APIs in Jest with `jest-chrome` (future).  
- **Integration**: Automated E2E via Puppeteer (long-term roadmap).

---

## Troubleshooting

- **Content script not running**: Ensure `manifest.json` has correct `host_permissions` & use `chrome.scripting.executeScript`.  
- **Storage empty**: Inspect `chrome.storage.local` in the service worker DevTools.  
- **Animation jitter**: Adjust the `typeWriter` delay or use parallel execution (already implemented).

---

## Contributing

1. Fork & branch: `git checkout -b feat/new-parser`  
2. Commit: `git commit -m "feat(parser): add new section logic"`  
3. Push & PR: `git push origin feat/new-parser` → Open a Pull Request  
4. Review & merge after CI ✅  

---

## License

[MIT License](LICENSE) © 2025 Your Name

---

*“Quality is not an act, it is a habit.” — Aristotle*