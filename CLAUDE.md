# Duality Pole Studio — Project Context

This is a full-stack studio management app for **Duality Pole Studio** (dualitypole.com).

## Stack

- **Backend**: Django REST Framework (`/backend`), deployed on Railway, PostgreSQL
- **Frontend**: React web app (`/frontend/src`)
- **Mobile**: React Native / Expo (`/mobile/src`)
- **Payments**: Stripe (credit card), plus cash and payment plan flows
- **Emails**: Gmail SMTP
- **Storage**: AWS S3

## Business Rules — Read These Every Session

### Seasons
- Seasons run for **8 weeks**
- When creating a season, **auto-populate end date as 8 weeks from start** (overridable)
- In **week 5** of the current season, the next season becomes available to book
- Season bookings open from **8am Sydney time** on the day they're published
- Credits and makeup credits **do NOT carry over** between seasons
- Enrolments are per-season — students re-enrol each season

### Class Types & Drop-in Rules
- **Level classes** (Level 1–6): Have a routine — **cannot drop in after Week 3**
- **Routine classes** (Strip, Floor Virgin, Strip Virgin, etc.): Same — no drop-in after Week 3
- **Conditioning classes** (Invert Tech, High Tricks, 3 Tricks, 4 Tricks, 5 & 6 Tricks, Kiki, Unravel): No routine — **can drop in any week**
- **Dance Tech, Dance V, Dirty Dance, Dance**: Change every week — **can drop in any week**
- **Practice Time**: Casual only, always available

### Pricing
- Season prices: 1 class=$270, 2=$440, 3=$580, 4=$700, 5=$800, 6=$900
- Pricing is **incremental** — a student with 2 enrolments adding a 3rd pays $580-$440=$140, NOT $580
- **Trial class**: $35 (deducted from season fee if student enrols after trial)
- **Casual class**: $40 non-enrolled, **$30 if enrolled in that season**
- **Practice Time**: Free if enrolled in 3+ classes **this season** (not just this week)
- No-show fee: **$20**

### Cancellation & Mark Away
- Cancellation window: **12 hours** before class
- **Before 12 hours**: Student gets a catch-up credit added to their account
- **Within 12 hours**: No credit issued; student can still mark away; $20 no-show fee if they don't show AND don't mark away
- Mark Away modal must show **two states**: credit vs no-credit, depending on time until class
- **Cancel enrolment**: Do NOT allow cancellation. Show T&C popup explaining commitment. Offer "request a transfer" which elevates to admin.

### Catch-up / Casual Booking
- Students can book catch-ups using their catch-up credits
- Casual bookings: $30 for enrolled students, $40 for non-enrolled
- Students can also buy a **4-class pass** (casual)
- Catch-up credits can only be used in the **current active season**
- Students can only book casuals in an upcoming season **from 1 week before it starts**
- If a student wants to catch up in a class they're not eligible for (e.g. routine class after week 3), they can **submit an exemption request** — this shows up in admin

### Waitlists
- Separate waitlists for: full season enrolment vs single casual class
- Students can join waitlists for multiple weeks
- Waitlist shows: class name, date, ability to remove themselves (if spot not yet confirmed)
- When a spot opens: casual student gets 12 hours to upgrade to full season, then the waitlisted student gets it

### Payment Methods
- **Credit card**: Stripe handles payment directly
- **Cash**: Flags the booking as "pay cash" — does NOT charge Stripe. Shows in admin for tracking.
- **Payment plan**: Configurable. When "pay when season commences" is selected, a **deposit is required today**. A credit card must be saved (held, not charged immediately).
- Admin can decide on refunds: no refund, account credit, or refund to card

### Lockers
- Lockers are held for the duration of a season
- Locker end date should align with the season end date
- Week 8 locker renewal reminder goes out automatically

### Trial Classes
- First-timers can book a trial class ($35)
- After a trial, they can enrol in the full season — $35 is deducted from season price
- Trial tab in booking only shows for new students (anyone who has had any enrolment, even completed, should NOT see trial tab again)

### Levels
- We use Level 1–6 (NOT "Beginners")
- Students have a level on their profile
- They can book any class at or below their level
- "Virgin" classes are for newcomers to a specific style (Strip Virgin, Floor Virgin, etc.)

## App Structure

### Web Frontend Key Files
- `frontend/src/pages/student/StudentDashboard.jsx` — main student dashboard, MarkAwayModal
- `frontend/src/pages/student/StudentMyClasses.jsx` — enrolled classes, MarkAwayModal
- `frontend/src/pages/student/BookScreen.jsx` (or similar) — booking flow
- `frontend/src/components/StudentShell.css` — student shell layout

### Mobile Key Files
- `mobile/src/screens/student/DashboardScreen.js` — main dashboard
- `mobile/src/screens/student/MyClassesScreen.js` — enrolled classes + MarkAwayModal
- `mobile/src/screens/student/UpcomingClassesScreen.js` — upcoming classes
- `mobile/src/screens/student/BookScreen.js` — booking flow
- `mobile/src/screens/instructor/` — all instructor screens (dark theme)
- `mobile/App.js` — Stripe config
- `mobile/app.json` — bundle ID: `com.dualitypole.app`

### Design / Branding
- **Dark theme throughout** — background `#000`/`#111`, cards `#111`/`#1a1a1a`
- **Accent colour**: `#ccff00` (lime/yellow-green)
- **Font**: Archivo Black for headings
- **Border colour**: `#222`/`#333`
- NO light theme (`#f9fafb`, `#6366f1`, white backgrounds) anywhere in the app
- Instructor screens must match the dark student theme — NOT a separate light admin theme

### Mobile App Config
- Bundle ID: `com.dualitypole.app` (iOS + Android)
- Stripe merchant ID: `merchant.com.dualitypole.app`
- URL scheme: `dualitypole`

## Known Recurring Issues (Do Not Reintroduce)

1. **Mark Away modal**: Must show two states based on 12-hour cutoff. Old placeholder text "Marking away lets your instructor plan ahead. A makeup credit may be issued if eligible." is WRONG — do not use it.
2. **Cancel enrolment**: Must NOT cancel. Must show T&C message + transfer request flow.
3. **Incremental pricing**: Adding a class to an existing season shows the incremental cost, not the full tier price.
4. **Practice Time free threshold**: 3+ classes enrolled THIS SEASON (not just this week).
5. **Season end date**: Auto-calculate as 8 weeks from start when creating seasons.
6. **Casual booking eligibility**: Routine/level classes greyed out after week 3; conditioning/dance classes always bookable.
7. **Trial tab**: Hidden for any student who has previously enrolled in anything.
8. **Payment plan deposit**: When "pay when season commences" is selected, always require a deposit today.
9. **Student popup vs page**: Student-facing interactions should be pages, not popups (has been raised many times).

## Deployment

- **Backend**: Railway, auto-deploys from `main` branch (when working)
- **Railway startCommand**: `python manage.py clean_studio_features && python manage.py migrate && python manage.py seed_demo && python manage.py set_test_passwords && gunicorn config.wsgi --log-file -`
- **Demo users**: `demo_jess`, `demo_tara`, `demo_dana`, `demo_nina`, `demo_sophie`, `demo_alex`, `demo_riley`, `demo_morgan` / password: `student1234`
- **Demo instructors**: `demo_instructor_chloe` etc / password: `chloe1234`
- **Frontend**: Served via Railway or separate host
- **Mobile**: Expo / EAS Build for app store distribution

## Rooms
- **Rhapsody** (yellow room) — 14 poles
- **The Box** (purple room) — 11 poles  
- **Janitor's Closet** — 3 poles
