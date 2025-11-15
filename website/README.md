# Rekapu Website

Static marketing website for the Rekapu browser extension, built with Astro.js.

## Tech Stack

- **Framework:** Astro.js
- **Styling:** TailwindCSS 4 with custom Rekapu theme
- **i18n:** JSON-based translations (English only currently)
- **Hosting:** Cloudflare Pages

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
website/
├── src/
│   ├── components/      # Reusable components (Button, Header, Footer)
│   ├── content/         # Content collections (docs in markdown)
│   ├── i18n/           # Localization files (en/ only)
│   ├── layouts/        # Page layouts (BaseLayout, DocLayout)
│   ├── pages/          # Routes (index, docs/[slug])
│   └── styles/         # Global styles with Rekapu theme
├── public/             # Static assets
└── astro.config.mjs    # Astro configuration
```

## Design System

Matches the extension's Material Design 3-inspired dark theme:

- Primary Blue: `#8AB4F8`
- Background Dark: `#202124`
- Surface Dark: `#292a2d`
- Success Green: `#34A853`
- Warning Yellow: `#FCC934`
- Error Red: `#F28B82`

## Adding Content

### Documentation Pages

Create new markdown files in `src/content/docs/`:

```markdown
---
title: Page Title
description: Page description for SEO
section: getting-started | guides | advanced | help
order: 1
---

# Your content here
```

### Translations

All UI strings are in `src/i18n/en/`:
- `common.json` - Navigation, footer, buttons
- `landing.json` - Landing page content
- `docs.json` - Documentation UI
- `meta.json` - SEO meta tags

## Deployment

Deployed automatically to Cloudflare Pages when pushing to main branch.

Build settings:
- Build command: `npm run build`
- Build output directory: `dist`
- Node version: 18+

## Adding New Languages

1. Create new locale folder: `src/i18n/[locale]/`
2. Copy and translate all JSON files from `en/`
3. Update `astro.config.mjs` locales array
4. Add routing logic if needed

The architecture is ready - only translation is needed!
