# KABISIG SK Information System (Frontend / UI-UX Prototype)

A web-based multi-tenant information system for Sangguniang Kabataan councils
in Naga City, Philippines to manage youth programs, budgets, and civic
participation. This prototype follows the project specification and is aligned
around the approved frontend, data, and integration stack.

## Current stack alignment

This app is set up to match the project description with:

- Next.js + React + TypeScript for the App Router client shell
- Tailwind CSS for responsive, mobile-first UI styling
- Recharts for analytics and dashboard visualizations
- Supabase-ready configuration for future auth/database integration
- React Hook Form + Zod for validation-oriented forms
- TanStack Query for server-state management and future API sync
- date-fns for scheduling and date handling
- Radix UI primitives for accessible UI components
- jsPDF + html2canvas for report/export generation
- QR scanning support through html5-qrcode and the QR scanner package

The app is intentionally frontend-first and uses mock data for now. Supabase
credentials are not required for local development until the backend team is
ready to connect the live database.

## Run locally

**Prerequisites:** Node.js (v18+ recommended)

1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`
3. Open the URL shown in the terminal (default: http://localhost:3000)

## Build for production

`npm run build` — creates an optimized production build in `.next/`.


## Supabase-ready setup

Create a local `.env.local` file with the following placeholders:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Project structure

- `src/App.tsx` — root component, holds mock app state
- `src/components/` — page components per user role (Public, SuperAdmin,
  Barangay Admin, Official, Youth, Viewer) plus shared UI (UserMenu,
  LiveCameraScanner)
- `src/data.ts` — mock/sample data
- `src/types.ts` — shared TypeScript types
- `src/lib/` — shared frontend utilities, future Supabase hooks, and
  client-ready integrations
- `src/assets/images/` — static image assets

## Notes

- No Google AI Studio / Gemini integration is included in this app.
- The frontend remains ready for Supabase authentication, database,
  and real-time synchronization when the partner team is ready.
