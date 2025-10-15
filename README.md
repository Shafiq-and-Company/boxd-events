# BOXD Events

## Brand Kit - Johnny Ive Minimalism

BOXD embodies the design principles of luma.com, or lu.ma. We're limiting our colors to black, white, and everything in between

### Minimalist Design Principles

#### **Monochromatic Palette**
- **Pure black (#000000)**: Primary text and essential elements
- **Pure white (#FFFFFF)**: Backgrounds and breathing space
- **Grayscale spectrum**: #F8F8F8, #E8E8E8, #D0D0D0, #A0A0A0, #707070, #404040
- **No color exceptions**: Zero chromatic elements, maximum focus
- **High contrast ratios**: 21:1 for pure black/white, 7:1+ for grays

#### **Typography & Hierarchy**
- **Single font family**: System fonts only (SF Pro, Helvetica, Arial)
- **Weight variations**: Regular (400) and Medium (500) only
- **Size scale**: 12px, 14px, 16px, 20px, 24px, 32px, 48px
- **Line height**: 1.2 for headings, 1.5 for body text
- **Letter spacing**: -0.5px for large text, 0px for body

#### **Spacing & Rhythm**
- **8px grid system**: All spacing multiples of 8px (8, 16, 24, 32, 48, 64, 96, 128)
- **Generous whitespace**: Minimum 24px between sections, 16px between elements
- **Breathing room**: 32px minimum padding on mobile, 48px on desktop
- **Vertical rhythm**: Consistent spacing creates visual harmony
- **Asymmetrical balance**: Intentional imbalance creates visual interest

#### **Smoothness & Motion**
- **Easing functions**: cubic-bezier(0.25, 0.46, 0.45, 0.94) for natural motion
- **Duration**: 200ms for micro-interactions, 300ms for transitions
- **Reduced motion**: Respects prefers-reduced-motion
- **Hover states**: Subtle 2px scale transforms, 0.1 opacity changes
- **Loading states**: Minimal skeleton screens with subtle animations

#### **Responsive Minimalism**
- **Mobile-first**: Start with 320px, enhance progressively
- **Breakpoints**: 320px, 768px, 1024px, 1440px
- **Content priority**: Most important content first, progressive disclosure
- **Touch targets**: Minimum 44px, maximum 60px for optimal reach
- **Gesture-friendly**: Swipe, tap, and pinch gestures feel natural

#### **Hyper Minimal CSS**
- **Utility-first**: Single-purpose classes, no component bloat
- **No frameworks**: Pure CSS with custom properties
- **Minimal selectors**: Element selectors preferred over classes
- **Performance**: <10KB CSS, critical path optimization
- **Maintainable**: Clear naming conventions, logical structure
- **Efficiency**: Maximum 300 lines total, class reuse, DRY principles
- **Smart inheritance**: Leverage CSS cascade and inheritance
- **Atomic design**: Build complex layouts from simple, reusable patterns

This minimalist brand kit ensures every pixel serves a purpose while maintaining the highest standards of usability and aesthetic purity.

## MVP - Lightweight Events App

BOXD Events is a streamlined platform for discovering and registering for events with integrated payment processing. The MVP focuses on core functionality: authentication, event discovery, payment, and confirmation.

### Core Features

#### **User Experience**
- **Authentication**: Sign up and log in through Supabase Auth
- **Event Discovery**: Browse public events with filtering and search
- **Event Registration**: Simple RSVP system for event registration
- **Registration Confirmation**: Real-time RSVP confirmation and status updates
- **User Dashboard**: View registered events and RSVP history

#### **Admin Capabilities**
- **Event Management**: Create, edit, and manage events
- **User Management**: Monitor registrations and user activity
- **RSVP Tracking**: View registration history and analytics

#### **Technical Architecture**
- **Backend**: Supabase for authentication, database, and real-time updates
- **Hosting**: Netlify for deployment and serverless functions
- **Frontend**: Next.js with mobile-first responsive design

### User Flow
1. **Sign Up/Login** → Supabase Auth authentication
2. **Browse Events** → Filter and search public events
3. **Select Event** → View event details
4. **RSVP** → Simple event registration
5. **Confirmation** → Real-time registration confirmation
6. **Dashboard** → Manage registered events

### Key Principles
- **Reliability**: Robust error handling and RSVP processing
- **Simplicity**: Streamlined user flow with minimal friction
- **Security**: Secure authentication and data protection
- **Performance**: Fast loading and responsive design
- **Accessibility**: Mobile-first design with WCAG compliance

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

