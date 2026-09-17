cat > REASONING.md <<'EOF'
# Engineering Reasoning

## 1. Core Invariant

The primary requirement is that a member's available points balance must always be correct.

The system stores the current available balance in `members.points_balance` and updates it transactionally whenever points are earned, redeemed, or expired.

Lifetime earned points are stored separately because they determine membership tier and are not reduced by redemption or expiration.

---

## 2. Tier Calculation

Membership tier is based on lifetime earned points:

| Tier | Lifetime Points | Earning Rate |
|---|---:|---:|
| Bronze | 0–499 | 1 point / ₹10 |
| Silver | 500–1499 | 2 points / ₹10 |
| Gold | 1500–4999 | 3 points / ₹10 |
| Platinum | 5000+ | 3 points / ₹10 |

Tier calculation is centralized in the rewards service.

A purchase uses the member's tier at the start of the purchase to calculate earned points. Afterward, lifetime points and the member's tier are updated.

---

## 3. Platinum Backward Compatibility

Platinum was added as the new top tier at 5000 lifetime earned points.

The migration preserves existing member balances and lifetime totals. It recalculates tiers from existing lifetime points so members qualify for Platinum only when they meet the new threshold.

Existing members below 5000 lifetime points retain their applicable existing tier.

---

## 4. Point Expiration

Earned points expire after 90 days if unused.

Each earning transaction creates a point lot containing:

- Member ID
- Source transaction
- Points earned
- Points remaining
- Earned timestamp
- Expiration timestamp

The expiration job identifies stale lots and:

1. Sets their remaining points to zero.
2. Decreases the member's available balance.
3. Creates an `EXPIRE` transaction.
4. Leaves lifetime earned points unchanged.

The controllable `/clock` endpoint makes expiration behavior deterministic for testing.

---

## 5. Redemption

Redemptions consume points using FIFO (First In, First Out).

The oldest available point lots are consumed first. This makes the interaction between redemption and 90-day expiration deterministic.

A redemption cannot proceed when the member does not have enough available points.

---

## 6. Tier Change Notifications

When a purchase causes a member to enter a new tier, the backend creates a `MEMBER_TIER_CHANGED` event in the `outbox` table.

The event contains:

- Member ID
- Member name
- Phone number
- Previous tier
- New tier
- Notification message

The outbox event is created in the same database transaction as the purchase so the purchase and notification event remain consistent.

The `/outbox` endpoint exposes these events for the notification-service integration.

---

## 7. Database Design

SQLite provides persistent storage.

The main tables are:

- `users` — authentication accounts
- `members` — member profiles and current balances
- `rewards` — redeemable rewards
- `transactions` — earning, redemption, and expiration history
- `point_lots` — earning lots used for FIFO redemption and expiration
- `outbox` — tier-change notification events

Indexes support common operations such as phone-number lookup and member transaction history.

---

## 8. Transaction Safety

Purchase, redemption, and expiration operations use database transactions so related changes succeed or fail together.

A purchase can update the transaction history, point lot, member balance, lifetime points, tier, and tier-change event as one atomic operation.

This reduces the risk of inconsistent balances.

---

## 9. Search, Pagination, and Sorting

Staff primarily look up members by phone number.

The member API supports:

- Search
- Pagination
- Sorting

Pagination is performed in the database query rather than loading the complete member list into application memory.

Sorting is restricted to approved fields rather than accepting arbitrary SQL expressions.

---

## 10. Controllable Clock

The application provides a controllable clock through `/clock`.

It supports advancing the application time or setting a specific timestamp.

Example:

```http
POST /clock
Content-Type: application/json

{
  "advanceDays": 91
}