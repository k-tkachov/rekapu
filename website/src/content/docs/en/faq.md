---
title: Frequently Asked Questions
description: Common questions about Rekapu
section: help
order: 1
draft: true
---

# Frequently Asked Questions

## General Questions

### What is Rekapu?

Rekapu is a browser extension that combines spaced repetition learning with website access control. It helps you learn effectively while maintaining focus by requiring you to answer questions before accessing specified websites.

### How does Rekapu differ from other website blockers?

Unlike traditional blockers that simply prevent access, Rekapu turns each blocked attempt into a learning opportunity. It uses a spaced repetition algorithm (similar to Anki) to schedule questions at optimal intervals for long-term retention.

### Is my data private?

Yes! All your data is stored locally in your browser using IndexedDB. Rekapu never sends your questions, answers, or browsing history to any server.

### What browsers are supported?

Rekapu currently supports Chrome, Brave, and Edge (Chromium-based browsers). Chrome version 88 or higher is required.

## Setup & Usage

### How many questions should I create?

Start with 10-20 quality questions. It's better to have fewer well-crafted questions than many low-quality ones. You can always add more later.

### Can I block specific pages within a domain?

Currently, Rekapu blocks entire domains including all subdomains. Page-level blocking may be added in a future update.

### What happens if I'm in the middle of something important?

Rekapu's overlay approach preserves your scroll position and page state. After answering the question, you'll continue exactly where you left off.

### Can I disable blocking temporarily?

Yes, you can deactivate domains in the Domains tab. The extension remembers your settings and you can reactivate them anytime.

## Questions & Learning

### What question types are supported?

Rekapu supports:
- **Single choice** (one correct answer from multiple options)
- **Multiple choice** (multiple correct answers)
- **Text input** (free-form text answer)
- **Show answer** (review only, no input required)

### How does spaced repetition work?

Rekapu uses an algorithm similar to Anki. Based on your difficulty rating (Again, Hard, Good, Easy), it calculates when you should see each question again for optimal retention.

### Can I import my Anki decks?

Yes! Rekapu supports importing from Anki. See the [Anki Import Guide](/docs/anki-import) for details.

### What is markdown and why should I use it?

Markdown is a simple formatting language that lets you add headings, lists, code blocks, images, and more to your questions. It makes your questions clearer and more engaging.

## Technical Questions

### How much storage does Rekapu use?

Rekapu uses IndexedDB which provides 100MB+ of storage on most browsers. The extension monitors usage and provides warnings if you're approaching limits.

### Can I backup my questions?

Yes! Use the backup feature in the Settings tab to export all your questions as JSON. You can import this file later if needed.

### Does Rekapu slow down my browser?

No. Rekapu is designed to be lightweight and efficient. The background service worker only activates when needed, and the content script has minimal performance impact.

### Can I sync across devices?

Not currently. All data is stored locally. Cloud sync is planned for a future Pro version.

## Troubleshooting

### The extension isn't blocking sites

- Verify the domain is in your block list and active
- Check that the cooldown period hasn't expired
- Make sure you have at least one question created
- Try disabling and re-enabling the extension

### Questions aren't appearing

- Verify you have questions with the 'pending' status
- Check that your questions aren't all scheduled far in the future
- Try creating a new question to test

### I see a "Storage quota exceeded" error

- Export your questions as backup
- Delete old or unnecessary questions
- See the [Storage Management](/docs/storage) guide for optimization tips

## Still Need Help?

If your question isn't answered here:

- Check the [Troubleshooting](/docs/troubleshooting) guide
- Contact support at support@rekapu.com
- Report bugs on GitHub (coming soon)

