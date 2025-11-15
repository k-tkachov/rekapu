# Contributing to Rekapu

Thank you for your interest in contributing to Rekapu! 

## Current Contribution Policy

**At this time, we are only accepting the following types of contributions:**

- 🌍 **Translations** - Help localize Rekapu for more languages
- 🐛 **Bug Fixes** - Fix existing issues and improve stability

**We are NOT currently accepting:**

- ❌ New features
- ❌ Major refactoring or architectural changes

This policy helps us maintain focus on stability and quality as we prepare for public release.

---

## How to Contribute

### 🌍 Contributing Translations

Rekapu supports multiple languages, and we welcome translations for additional languages!

#### Adding a New Language

1. Fork the repository and create a new branch
2. Navigate to `src/_locales/`
3. Copy the `en` folder and rename it to your language code (e.g., `fr` for French, `de` for German)
4. Translate all strings in `messages.json`
5. Add the same translation to `website/src/content/docs/{language}/` for documentation
6. Test your translations by loading the extension locally
7. Submit a pull request with your changes

#### Translation Guidelines

- Maintain the same JSON structure as the original files
- Keep placeholders (e.g., `$1`, `$count$`) unchanged
- Ensure translations fit within UI constraints (button labels should be concise)
- Use formal/informal tone consistently based on your language conventions
- Test the extension with your translations loaded

#### Existing Language Files

- Extension: `src/_locales/{language}/messages.json`
- Website: `website/src/content/docs/{language}/`
- Demo cards: `src/data/demoCards/{language}.json`

### 🐛 Reporting and Fixing Bugs

#### Before Submitting a Bug Report

1. Check existing issues to avoid duplicates
2. Ensure you're using the latest version
3. Test if the bug occurs in a clean browser profile

#### Bug Report Should Include

- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Browser version and OS
- Screenshots/console errors if applicable

#### Submitting a Bug Fix

1. Fork the repository and create a new branch
2. Write a failing test that demonstrates the bug (if applicable)
3. Fix the bug with minimal changes
4. Ensure all tests pass: `npm test`
5. Submit a pull request with a clear description

---

## Development Setup

### Prerequisites

- Node.js (v16 or higher)
- npm

### Installation

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/rekapu.git
cd rekapu

# Install dependencies
npm install

# Build the extension
npm run build
```

### Loading the Extension Locally

1. Build the extension using `npm run build`
2. Open your browser's extension management page:
   - Chrome: `chrome://extensions`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `dist` folder

### Running Tests

```bash
# Run all tests
npm test
```

### Project Structure

```
src/
├── background/      # Background service worker
├── content/         # Content scripts
├── dashboard/       # Main dashboard UI
├── popup/          # Browser popup UI
├── storage/        # Storage and data management
├── spaced-repetition/ # SR algorithm
├── tts/            # Text-to-speech functionality
├── utils/          # Utility functions
└── _locales/       # Translation files
```

---

## Code Style

- TypeScript is used throughout the project
- Follow existing code patterns and conventions
- Keep changes minimal and focused
- Write clear, self-documenting code
- Avoid unnecessary comments

---

## Pull Request Process

1. **Fork & Branch**: Create a feature branch from `master`
2. **Commit**: Use clear, descriptive commit messages
3. **Test**: Ensure all tests pass and the extension works locally
4. **Submit**: Open a PR with:
   - Clear title describing the change
   - Reference to any related issues
   - Description of what was changed and why
   - Screenshots for UI changes or translations
5. **Review**: Address any feedback from maintainers

### PR Title Format

- `fix: description` - for bug fixes
- `i18n: description` - for translations

---

## Questions?

If you have questions about contributing, feel free to open an issue with the "question" label.

Thank you for helping make Rekapu better! 🎉

