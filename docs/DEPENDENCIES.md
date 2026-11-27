# Dependencies

Every dependency and why it's here. None of them sends user data anywhere.

## Runtime

| Package | Why |
| --- | --- |
| `next`, `react`, `react-dom` | The app framework chosen in the brief |
| `@supabase/supabase-js`, `@supabase/ssr` | Database, auth, and session cookies in server components |
| `next-intl` | Arabic/English messages, plurals, RTL-aware routing |
| `zod` | Validating every server-action input |
| `libphonenumber-js` | Validating and normalising Egyptian mobile numbers |
| `exceljs` | Reading the teacher's `.xlsx` student file (and Excel export later) |
| `papaparse` | Reading `.csv` student files |
| `@radix-ui/react-dialog`, `-tabs`, `-select` | Accessible primitives for upcoming screens (our own styling) |
| `server-only` | Build error if server code (keys, admin client) is imported by a client component |
| `qrcode` | Draws the attendance check-in QR in the browser (no request to any QR service) |
| `pdf-lib` | Stamps the student's ID on every page of a protected PDF, on our own server |

## Development

| Package | Why |
| --- | --- |
| `typescript` (5.9) | Strict typing; pinned below 6.1 for typescript-eslint compatibility |
| `tailwindcss`, `@tailwindcss/postcss` | Styling with our own tokens |
| `eslint` (9), `eslint-config-next` | Linting, incl. a rule banning physical left/right utilities (RTL) |
| `vitest` | Unit and RLS tests |
| `@electric-sql/pglite` | Real Postgres in WebAssembly, so RLS tests run without Docker or a cloud project |
| `@playwright/test` | End-to-end tests (360 px RTL project), from the M1 checkpoint on |
| `@types/*` | Type definitions |
