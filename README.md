# BOXD Events

## Brand Kit - Mobile-First Responsive Design

BOXD brand speaks with confident clarity and communal ambition. It favors clean, minimalist fonts and a palette grounded in neutral tones with bold accent colors—think charcoal or slate gray paired with vibrant teal or electric blue. The imagery is dynamic and aspirational: sharp event photos, silhouettes of crowds, architectural lines, and digital overlays to evoke motion, connection, and innovation. The voice is direct, inclusive, and purpose-driven: "Explore," "Connect," "Curated," "Frontier" — framing users as active participants in global conversations. Core values implicit in the visuals and structure are curiosity, access, and community—BOXD positions itself as the bridge between creators, thinkers, and doers.

### Mobile-First Design Principles

#### **Layout & Spacing**
- **Mobile-first approach**: Design for 320px+ screens, then enhance for larger breakpoints
- **Touch-friendly targets**: Minimum 44px touch targets for interactive elements
- **Generous whitespace**: Increased padding/margins on mobile to prevent cramped interfaces
- **Single-column layouts**: Stack content vertically on mobile, expand horizontally on desktop
- **Thumb-zone optimization**: Place primary actions within easy thumb reach

#### **Typography & Readability**
- **Scalable font system**: Base 16px on mobile, scale up for larger screens
- **High contrast ratios**: Minimum 4.5:1 for body text, 3:1 for large text
- **Readable line lengths**: 45-75 characters per line, shorter on mobile
- **Hierarchy**: Clear visual hierarchy with size, weight, and spacing variations
- **Touch-friendly text**: Minimum 16px font size to prevent zoom on iOS

#### **Color & Accessibility**
- **High contrast palette**: Charcoal/slate gray backgrounds with vibrant teal/cyan accents
- **Accessible color combinations**: Test all color pairings for WCAG compliance
- **Focus states**: Clear visual indicators for keyboard navigation
- **Dark mode support**: Ensure brand colors work in both light and dark themes

#### **Interactive Elements**
- **Progressive enhancement**: Core functionality works without JavaScript
- **Loading states**: Clear feedback during interactions and data loading
- **Error handling**: User-friendly error messages and recovery paths
- **Gesture support**: Swipe, pinch, and tap gestures where appropriate

#### **Performance & UX**
- **Fast loading**: Optimize images and assets for mobile networks
- **Offline capability**: Graceful degradation when connectivity is poor
- **Reduced motion**: Respect user preferences for reduced motion
- **One-handed use**: Design for single-handed mobile interaction

This mobile-first brand kit ensures consistent, accessible, and engaging experiences across all devices while maintaining BOXD's modern, collective identity.

## Next + Netlify Starter

Think of this like a LEGO kit for websites.
- **Next.js** is the box of LEGO bricks (the web app framework).
- **Netlify** is the shelf where your finished model goes so everyone can see it (hosting).

This starter gives you a tiny Next.js app that is ready to run on Netlify.
It includes:
- **2 sample components** in `components/`
- **Global styles** in `styles/globals.css`
- **`netlify.toml`** so Netlify knows how to build and serve
- **`jsconfig.json`** to make imports like `components/Button` work nicely

## Quick Start

1) Install packages
```bash
npm install
```

2) Start the dev server
```bash
npm run dev
```

3) Open the app
Visit `http://localhost:3000`

4) Edit something
Open `pages/index.js` and make a change. The browser updates automatically.

## Deploying (Putting it on the shelf)

- Easiest: click the "Deploy to Netlify" button above and follow the steps.
- Manual way:
  1. Push your code to GitHub (or GitLab/Bitbucket).
  2. In Netlify, create a new site from your repo.
  3. Build command: `npm run build` (Netlify autodetects for Next.js).
  4. Netlify uses `netlify.toml` to handle Next.js features like server functions.


## Project Map

- `pages/` – Your routes and pages. Start at `pages/index.js`.
- `components/` – Reusable UI pieces like headers and footers.
- `styles/` – Global CSS lives here.
- `public/` – Images and static files.
- `netlify.toml` – Netlify’s settings for build and runtime.
- `jsconfig.json` – Lets you write clean import paths.

