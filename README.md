# CampusConnect

Find verified students from your college, connect, and find shared rooms nearby.

## Tech Stack

- **Frontend**: Next.js 16 (App Router) + React 19 + Tailwind CSS 4
- **Auth**: NextAuth.js v4 with Google OAuth
- **Database**: PostgreSQL + Prisma ORM 5
- **Real-time Chat**: Socket.io
- **Maps**: Google Maps JavaScript API (with list-view fallback)
- **State**: Zustand + TanStack React Query
- **Hosting**: Vercel (frontend) + Render/Railway (backend)

## Prerequisites

- Node.js 20+
- PostgreSQL database (local, Supabase, or Neon)
- Google OAuth credentials (Client ID + Secret)
- Google Maps API key (optional - list view works without it)

## Setup

### 1. Clone & Install

```bash
git clone <repo-url>
cd campus-connect
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

Required variables:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - Generate with `openssl rand -base64 32`
- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET` - From Google Cloud Console
- `NEXTAUTH_URL` - Set to `http://localhost:3000` for local dev

Optional (with dev fallbacks):
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` - Falls back to list view
- `SMS_API_KEY` / `SMS_API_SECRET` - Falls back to dev OTP code `123456`
- Cloudinary keys - Falls back to local `/public/uploads`

### 3. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npx prisma migrate dev --name init

# Seed with 200+ Indian colleges
npm run db:seed
```

> **Note**: The seed script includes 200+ well-known Indian colleges across all states (IITs, NITs, IIMs, central universities, state universities, private colleges). This can be swapped for the full 50,000+ AISHE/AICTE dataset later.

### 4. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project → APIs & Services → Credentials
3. Create OAuth 2.0 Client ID (Web application)
4. Add redirect URI: `http://localhost:3000/api/auth/callback/google`
5. Copy Client ID and Secret to `.env`

### 5. Run Dev Server

```bash
npm run dev
```

Visit `http://localhost:3000`

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── onboarding/page.tsx         # 4-step onboarding wizard
│   ├── dashboard/page.tsx          # Student discovery feed
│   ├── map/page.tsx                # Room sharing map view
│   ├── connections/page.tsx        # Connection requests management
│   ├── chat/page.tsx               # Real-time messaging
│   ├── profile/page.tsx            # User profile
│   ├── settings/page.tsx           # Privacy & account settings
│   ├── admin/page.tsx              # Admin dashboard
│   └── api/                        # All API routes
│       ├── auth/                   # NextAuth endpoints
│       ├── onboarding/             # Onboarding & OTP
│       ├── colleges/               # College search
│       ├── listings/               # Room listing CRUD
│       ├── connections/            # Connection requests
│       ├── messages/               # Chat messages
│       ├── users/                  # User discovery & profiles
│       ├── notifications/          # Notification center
│       ├── favorites/              # Saved listings
│       ├── reports/                # User & listing reports
│       ├── reviews/                # User reviews
│       ├── blocks/                 # User blocking
│       ├── upload/                 # File uploads
│       ├── profile/                # Profile update
│       ├── admin/                  # Admin operations
│       └── health/                 # Health check
├── components/
│   ├── navbar.tsx                  # Main navigation
│   └── providers.tsx               # Session + Query providers
├── lib/
│   ├── prisma.ts                   # Prisma client
│   ├── auth.ts                     # NextAuth config
│   ├── api-utils.ts                # API response helpers
│   ├── otp.ts                      # OTP sending
│   ├── socket.ts                   # Socket.io server
│   └── utils.ts                    # Utility functions
├── store/
│   ├── index.ts                    # App state (Zustand)
│   └── chat.ts                     # Chat socket state
├── hooks/
│   └── use-initialize.ts           # App initialization hook
├── types/
│   ├── index.ts                    # TypeScript interfaces
│   └── next-auth.d.ts              # Auth type declarations
└── middleware.ts                   # Route protection
prisma/
└── schema.prisma                   # Database schema (12 models)
scripts/
└── seed-colleges.ts                # 200+ Indian colleges seed data
```

## Key Features

**Authentication**: Google OAuth only. No passwords, no fake profiles.

**Onboarding**: 4-step wizard with progress bar - Basic Info (name, phone+OTP, gender, DOB), College Info (searchable 200+ college database with fuzzy search), Preferences (looking-for + roommate compatibility quiz), Photo & Bio.

**Discovery Feed**: Students shown in smart order (same college first, then same city). Filterable by college, course, year, gender, looking-for type. Infinite scroll pagination.

**Map View**: Google Maps integration with room listing pins. Filter by listing type, budget, and room type. Fallback list view if Maps API key is missing.

**Room Listings**: Post "Have a Room" or "Looking for Room" with draggable map pin, photos, amenities, budget range, move-in date.

**Connections**: Send/receive connect requests with optional message. Accept/decline/reject. Real-time chat via Socket.io with typing indicators and read receipts.

**Profile**: Complete student profile with college info, active listings, favorites, and reviews.

**Admin Panel**: Analytics dashboard, pending college approvals, report management.

**Safety**: Phone OTP verification, Google account verification, report/block system, content moderation filters.

## API Keys Needed for Production

| Service | What it's for | Where to get it |
|---------|--------------|-----------------|
| Google OAuth Client ID/Secret | Sign in with Google | Google Cloud Console |
| Google Maps JS API Key | Map view & address autocomplete | Google Maps Platform |
| PostgreSQL Database | All data storage | Supabase / Neon |
| SMS/OTP API Key | Phone verification | Twilio / MSG91 |
| Cloudinary / AWS S3 | Image uploads | Cloudinary dashboard / AWS |
| Sentry DSN | Error monitoring | Sentry dashboard |

## Dev Mode Fallbacks

If API keys aren't configured, the app still runs:
- **Login**: Falls back to demo mode that creates a mock Google user
- **Maps**: Falls back to a list-only view with a banner
- **OTP**: Dev code `123456` works for any phone number
- **Uploads**: Saved to local `/public/uploads` directory

## License

MIT
