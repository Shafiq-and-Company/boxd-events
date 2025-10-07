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

