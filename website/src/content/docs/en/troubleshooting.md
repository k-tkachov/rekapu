---
title: Troubleshooting
description: Solutions to common problems with Rekapu
section: help
order: 2
draft: true
---

# Troubleshooting

This guide covers common issues and their solutions.

## Extension Not Blocking Sites

### Problem
You navigate to a blocked domain but the site loads normally without showing a question.

### Solutions

1. **Verify the domain is active**
   - Open the Rekapu popup
   - Go to the Domains tab
   - Check that the domain is listed and the toggle is ON

2. **Check cooldown period**
   - If you recently answered a question for this domain, it may still be in cooldown
   - Wait for the cooldown period to expire, or adjust the cooldown in settings

3. **Verify you have questions**
   - Go to the Questions tab
   - Make sure you have at least one question created
   - Check that questions have status 'pending' or are due for review

4. **Reload the extension**
   - Go to `chrome://extensions/`
   - Find Rekapu and click the reload icon
   - Try accessing the blocked site again

## Questions Not Appearing

### Problem
The blocking overlay appears but no question is shown.

### Solutions

1. **Check question schedule**
   - All questions might be scheduled for future review
   - Create a new question to test immediately

2. **Verify question format**
   - Ensure questions have both front and back content
   - For single/multiple choice, verify options are properly set

3. **Clear extension data and reimport**
   - Export your questions as backup
   - Clear extension data in settings
   - Import your questions back

## Performance Issues

### Problem
Browser becomes slow or unresponsive when Rekapu is active.

### Solutions

1. **Check storage usage**
   - Go to Settings > Storage
   - If you have thousands of questions, consider archiving old ones
   - Export and delete unused questions

2. **Reduce blocked domains**
   - Having too many blocked domains can impact performance
   - Keep your block list focused on truly distracting sites

3. **Update the extension**
   - Check if you're running the latest version
   - Update through the Chrome Web Store

## Overlay Display Problems

### Problem
The blocking overlay appears but is incorrectly positioned or styled.

### Solutions

1. **Refresh the page**
   - Sometimes the overlay needs a fresh page load
   - Press Ctrl+R (Cmd+R on Mac) to refresh

2. **Check for conflicting extensions**
   - Other extensions might interfere with the overlay
   - Try disabling other extensions temporarily

3. **Clear browser cache**
   - Go to `chrome://settings/clearBrowserData`
   - Clear cached images and files
   - Reload the blocked site

## Data & Storage Issues

### Problem
"Storage quota exceeded" or questions not saving.

### Solutions

1. **Export questions regularly**
   - Use the backup feature to export your questions
   - This creates a safety net and frees up space

2. **Delete unnecessary questions**
   - Remove duplicate or outdated questions
   - Archive questions you no longer need

3. **Check available storage**
   - Rekapu uses browser IndexedDB storage
   - Browser typically provides 100MB+ per extension
   - See [Storage Management](/docs/storage) for optimization

## Import/Export Problems

### Problem
Unable to import questions or export fails.

### Solutions

1. **Verify file format**
   - Export files should be JSON format
   - Anki imports should be plain text (.txt)
   - Check the file isn't corrupted

2. **Check file size**
   - Very large imports (10,000+ questions) may timeout
   - Try splitting into smaller batches

3. **Validate JSON structure**
   - If importing JSON, ensure it's properly formatted
   - Use a JSON validator if needed

## Markdown Not Rendering

### Problem
Markdown formatting doesn't appear in questions or answers.

### Solutions

1. **Check syntax**
   - Verify you're using correct markdown syntax
   - See the [Markdown Guide](/docs/markdown-guide) for examples

2. **Preview before saving**
   - Use the preview pane when editing questions
   - This shows how the markdown will render

3. **Escape special characters**
   - If you want to display markdown symbols literally, escape them with backslash

## Installation Issues

### Problem
Extension won't install or load.

### Solutions

1. **Check Chrome version**
   - Rekapu requires Chrome 88 or higher
   - Go to `chrome://settings/help` to check version

2. **Clear extension data**
   - Remove any previous installations
   - Download fresh from Chrome Web Store

3. **Check permissions**
   - Ensure Chrome has necessary permissions
   - Some corporate networks restrict extensions

## Still Having Issues?

If these solutions don't help:

1. **Check the FAQ**
   - See the [FAQ](/docs/faq) for more common issues

2. **Export your data first**
   - Before trying drastic solutions, backup your questions

3. **Contact support**
   - Email support@rekapu.com with:
     - Description of the problem
     - Steps to reproduce
     - Browser version
     - Any error messages

4. **Report a bug**
   - If you believe it's a bug, report it on GitHub (link coming soon)
   - Include as much detail as possible

