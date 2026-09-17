# Bean & Board Cafe Rewards Counter

Bean & Board is a cafe rewards management application for staff. Staff can create an account, sign in, look up members by name or phone number, record purchases, redeem rewards, and inspect a member's complete points history.

The application is designed around one important invariant: a member's current redeemable balance is kept in sync with the points ledger and individual point lots, including redemptions and 90-day expiry.

## Features

- Staff registration and login using bcrypt password hashing and JWT sessions.
- Member creation with unique phone numbers.
- Member search by name or phone number.
- Paginated member lists with sorting by recent creation, name, points, or tier.
- Purchase recording with tier-based points calculation.
- Bronze, Silver, Gold, and Platinum membership tiers.
- Active rewards loaded from the database.
- Reward redemption with insufficient-balance protection.
- FIFO consumption of point lots during redemption.
- Point-lot expiry after 90 days.
- Transaction history for each member.
- Tier-change events written to an outbox table.
- A controllable application clock for expiry testing.

## Tech Stack

- Frontend: React 19, Vite, Axios
- Backend: Node.js, Express 5
- Database: SQLite through `better-sqlite3`
- Authentication: bcrypt and JSON Web Tokens
- Frontend linting: Oxlint

## Project Structure

```text
client/
  index.html
  package.json
  vite.config.js
  src/
    App.jsx       React pages, dashboard, member actions, and API calls
    App.css       Application styles and responsive layout
    index.css     Global styles
    main.jsx      React entry point

server/
  server.js                 Express API and route handlers
  db.js                     SQLite connection and schema initialization
  schema.sql                Database tables, indexes, and default rewards
  seed.js                   Demo member data
  migrate-twists.js         Point-lot and outbox migration/backfill
  test-rewards.js           Reward-rule smoke tests
  services/
    rewards.js              Tier, earning, and redemption rules
    expiration.js           Expired point-lot processing
    clock.js                Application clock used by expiry flows
```

## Requirements

- Node.js with npm
- Two terminal sessions for local development

## Installation

Install dependencies in both packages:

```bash
cd server
npm install

cd ../client
npm install
```

The server creates `server/rewards.db` automatically when it starts. The schema and the default rewards are applied by `server/db.js`.

## Running Locally

Start the API in one terminal:

```bash
cd server
npm run dev
```

The API listens on `http://localhost:5000` by default. Set `PORT` to use another port. `JWT_SECRET` can be set to replace the development fallback secret.

Start the Vite client in another terminal:

```bash
cd client
npm run dev
```

The client is normally available at `http://localhost:5173`. Vite proxies `/api` requests to `http://localhost:5000`.

For a production-style frontend preview:

```bash
cd client
npm run build
npm run preview
```

## Demo Data and Migration

After the server has initialized the database, seed 50 demo members with:

```bash
cd server
node seed.js
```

The seed script is idempotent for members because it uses `INSERT OR IGNORE`, but it inserts transaction rows whenever a new member is inserted.

For an existing database that needs the point-lot and outbox structures, run:

```bash
cd server
node migrate-twists.js
```

The migration can rebuild the transactions table, create point lots, backfill existing earn and redeem transactions, verify that lot totals match member balances, and recalculate tiers.

## Points and Tier Rules

Tiers are based on `lifetime_earned_points`, not the current redeemable balance:

| Tier | Lifetime points | Points earned per 10 currency units |
| --- | ---: | ---: |
| Bronze | 0-499 | 1 |
| Silver | 500-1,499 | 2 |
| Gold | 1,500-4,999 | 3 |
| Platinum | 5,000 or more | 3 |

Purchase points are calculated with:

```text
floor((purchase amount / 10) * tier rate)
```

The purchase uses the member's tier before the purchase. The resulting earned points are added to both the current balance and lifetime total. A tier change is then persisted and creates a `MEMBER_TIER_CHANGED` outbox event.

Redemption subtracts the reward cost from the current balance and does not reduce lifetime points or tier. Available point lots are consumed oldest first. Expired lots are not eligible for redemption.

Default rewards are:

| Reward | Cost |
| --- | ---: |
| Free Coffee | 100 points |
| Free Sandwich | 250 points |
| Free Dessert | 500 points |

## API Reference

Protected endpoints require:

```http
Authorization: Bearer <jwt>
```

### Public endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Check that the API is running |
| POST | `/api/auth/register` | Create a staff account with `name`, `email`, and `password` |
| POST | `/api/auth/login` | Authenticate staff and return a JWT |

### Authenticated staff endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/members` | Create a member with `name`, `phone`, and optional `email` |
| GET | `/api/members` | List members with `search`, `page`, `limit`, `sortBy`, and `order` query parameters |
| GET | `/api/members/:id` | Get one member |
| GET | `/api/members/:id/transactions` | Get a member's transaction history |
| POST | `/api/members/:id/purchases` | Record a purchase with an `amount` body field |
| POST | `/api/members/:id/redeem` | Redeem a reward with a `rewardId` body field |
| GET | `/api/rewards` | List active rewards |

Member list sorting accepts `name`, `points`, `tier`, or `created`; ordering accepts `asc` or `desc`. The server caps the page size at 100.

### Maintenance endpoints

These endpoints are currently exposed without authentication and are intended for local maintenance or testing:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/clock` | Set the test clock with `now`, `timestamp`, or `date`, or move it with `advanceDays` |
| GET | `/outbox` | Read queued tier-change events |

Changing the clock immediately runs point expiry. Each expired lot creates an `EXPIRE` transaction and reduces the member's current balance.

## Database Model

- `users`: staff accounts and password hashes.
- `members`: profile data, current balance, lifetime earned points, and tier.
- `rewards`: active and inactive redeemable rewards.
- `transactions`: append-only earn, redeem, and expiry ledger rows.
- `point_lots`: each earning event, remaining points, and expiry date.
- `outbox`: tier-change notification events waiting for processing.

Indexes support phone lookup, member transaction history, balance sorting, point-lot lookup, expiry processing, and outbox processing.

## Testing and Linting

Run the reward-rule smoke test:

```bash
cd server
npm test
```

Run the frontend linter:

```bash
cd client
npm run lint
```

The reward test covers tier thresholds, earning examples, and successful or rejected redemption validation. The current test file is a console-based smoke test rather than a full test runner suite.

## Current Implementation Notes

- The frontend currently identifies the counter as `Eastside · Counter 01` and brands the interface as Bean & Board.
- The frontend stores the JWT and staff profile in `localStorage` and keeps the session until logout or token failure.
- The backend defaults to `cafe-rewards-secret` when `JWT_SECRET` is not configured; use a strong environment value outside local development.
- SQLite database files are local to the server package and are not included in the source tree.
- The source contains a Platinum backend tier and migration support; the dashboard's displayed earning-rate label currently only distinguishes Bronze, Silver, and Gold.
- `server/seed.js` uses the original Bronze/Silver/Gold thresholds when calculating seeded tiers, so run migration or use the service rules when validating Platinum data.