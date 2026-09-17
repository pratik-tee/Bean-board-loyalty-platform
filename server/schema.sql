-- ==========================================
-- CAFÉ REWARDS DATABASE
-- ==========================================

-- Staff users
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);


-- Café members
CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    email TEXT,

    -- Current redeemable points
    points_balance INTEGER NOT NULL DEFAULT 0,

    -- Total points ever earned through purchases.
    -- Used to determine loyalty tier.
    lifetime_earned_points INTEGER NOT NULL DEFAULT 0,

    tier TEXT NOT NULL DEFAULT 'Bronze',

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);


-- Rewards
CREATE TABLE IF NOT EXISTS rewards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    points_required INTEGER NOT NULL,
    active INTEGER NOT NULL DEFAULT 1
);


-- Points ledger
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    member_id INTEGER NOT NULL,

    -- EARN or REDEEM
    type TEXT NOT NULL CHECK(type IN ('EARN', 'REDEEM', 'EXPIRE')),

    -- Positive for EARN, negative for REDEEM
    points INTEGER NOT NULL,

    -- Purchase amount, NULL for redemption
    amount REAL,

    description TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (member_id) REFERENCES members(id)
);


-- ==========================================
-- INDEXES
-- ==========================================

-- Fast phone-number lookup
CREATE INDEX IF NOT EXISTS idx_members_phone
ON members(phone);

-- Fast member transaction history
CREATE INDEX IF NOT EXISTS idx_transactions_member
ON transactions(member_id);

-- Fast sorting/searching by balance
CREATE INDEX IF NOT EXISTS idx_members_points
ON members(points_balance);



-- Individual point batches.
-- Each earning event has its own 90-day expiry.
CREATE TABLE IF NOT EXISTS point_lots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL,
    transaction_id INTEGER NOT NULL,
    points_earned INTEGER NOT NULL,
    points_remaining INTEGER NOT NULL,
    earned_at DATETIME NOT NULL,
    expires_at DATETIME NOT NULL,
    FOREIGN KEY (member_id) REFERENCES members(id),
    FOREIGN KEY (transaction_id) REFERENCES transactions(id)
);

CREATE INDEX IF NOT EXISTS idx_point_lots_member
ON point_lots(member_id);

CREATE INDEX IF NOT EXISTS idx_point_lots_expiry
ON point_lots(expires_at);

CREATE INDEX IF NOT EXISTS idx_point_lots_remaining
ON point_lots(points_remaining);

-- Notification outbox
CREATE TABLE IF NOT EXISTS outbox (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    member_id INTEGER NOT NULL,
    payload TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (member_id) REFERENCES members(id)
);

CREATE INDEX IF NOT EXISTS idx_outbox_processed
ON outbox(processed);

CREATE INDEX IF NOT EXISTS idx_outbox_member
ON outbox(member_id);

-- ==========================================
-- DEFAULT REWARDS
-- ==========================================

INSERT OR IGNORE INTO rewards
    (id, name, description, points_required)
VALUES
    (1, 'Free Coffee', 'One regular coffee', 100),
    (2, 'Free Sandwich', 'One sandwich', 250),
    (3, 'Free Dessert', 'One dessert item', 500);