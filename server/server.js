const express = require("express");
const cors = require("cors");
const path = require("path");
const dotenv = require("dotenv");

const db = require("./db");

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const clock = require("./services/clock");
const { expireStalePoints } = require("./services/expiration");

const {
    calculateTier,
    calculateEarnedPoints,
    validateRedemption
} = require("./services/rewards");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Serve React production build
const clientPath = path.join(__dirname, "../client/dist");
app.use(express.static(clientPath));

const JWT_SECRET =
    process.env.JWT_SECRET || "cafe-rewards-secret";

const PORT =
    process.env.PORT || 5000;


// ==================================================
// JWT AUTHENTICATION MIDDLEWARE
// ==================================================

function authenticateToken(req, res, next) {

    const authHeader =
        req.headers.authorization;

    if (
        !authHeader ||
        !authHeader.startsWith("Bearer ")
    ) {
        return res.status(401).json({
            success: false,
            error: "Authentication required"
        });
    }

    const token =
        authHeader.split(" ")[1];

    try {

        const decoded =
            jwt.verify(token, JWT_SECRET);

        req.user = decoded;

        next();

    } catch (error) {

        return res.status(401).json({
            success: false,
            error: "Invalid or expired token"
        });
    }
}


// ==================================================
// HEALTH CHECK
// ==================================================

app.get("/api/health", (req, res) => {

    res.json({
        success: true,
        message: "Café Rewards API is running"
    });
});


// ==================================================
// AUTH: REGISTER
// ==================================================

app.post("/api/auth/register", async (req, res) => {

    try {

        const {
            name,
            email,
            password
        } = req.body;

        if (
            !name ||
            !email ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                error:
                    "Name, email and password are required"
            });
        }

        if (password.length < 6) {

            return res.status(400).json({
                success: false,
                error:
                    "Password must be at least 6 characters"
            });
        }

        const existingUser =
            db.prepare(`
                SELECT id
                FROM users
                WHERE email = ?
            `).get(email);

        if (existingUser) {

            return res.status(409).json({
                success: false,
                error:
                    "Email already registered"
            });
        }

        const passwordHash =
            await bcrypt.hash(password, 10);

        const result =
            db.prepare(`
                INSERT INTO users
                (
                    name,
                    email,
                    password_hash
                )
                VALUES (?, ?, ?)
            `).run(
                name,
                email,
                passwordHash
            );

        res.status(201).json({
            success: true,
            message:
                "Registration successful",
            user: {
                id: result.lastInsertRowid,
                name,
                email
            }
        });

    } catch (error) {

        console.error(
            "Registration error:",
            error
        );

        res.status(500).json({
            success: false,
            error:
                "Registration failed"
        });
    }
});


// ==================================================
// AUTH: LOGIN
// ==================================================

app.post("/api/auth/login", async (req, res) => {

    try {

        const {
            email,
            password
        } = req.body;

        if (!email || !password) {

            return res.status(400).json({
                success: false,
                error:
                    "Email and password are required"
            });
        }

        const user =
            db.prepare(`
                SELECT *
                FROM users
                WHERE email = ?
            `).get(email);

        if (!user) {

            return res.status(401).json({
                success: false,
                error:
                    "Invalid email or password"
            });
        }

        const passwordMatch =
            await bcrypt.compare(
                password,
                user.password_hash
            );

        if (!passwordMatch) {

            return res.status(401).json({
                success: false,
                error:
                    "Invalid email or password"
            });
        }

        const token =
            jwt.sign(
                {
                    id: user.id,
                    email: user.email,
                    name: user.name
                },
                JWT_SECRET,
                {
                    expiresIn: "2h"
                }
            );

        res.json({
            success: true,
            message:
                "Login successful",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {

        console.error(
            "Login error:",
            error
        );

        res.status(500).json({
            success: false,
            error:
                "Login failed"
        });
    }
});


// ==================================================
// CREATE MEMBER
// ==================================================

app.post(
    "/api/members",
    authenticateToken,
    (req, res) => {

        try {

            const {
                name,
                phone,
                email
            } = req.body;

            if (!name || !phone) {

                return res.status(400).json({
                    success: false,
                    error:
                        "Name and phone are required"
                });
            }

            const existing =
                db.prepare(`
                    SELECT id
                    FROM members
                    WHERE phone = ?
                `).get(phone);

            if (existing) {

                return res.status(409).json({
                    success: false,
                    error:
                        "A member with this phone number already exists"
                });
            }

            const result =
                db.prepare(`
                    INSERT INTO members
                    (
                        name,
                        phone,
                        email
                    )
                    VALUES (?, ?, ?)
                `).run(
                    name,
                    phone,
                    email || null
                );

            const member =
                db.prepare(`
                    SELECT *
                    FROM members
                    WHERE id = ?
                `).get(
                    result.lastInsertRowid
                );

            res.status(201).json({
                success: true,
                member
            });

        } catch (error) {

            console.error(
                "Create member error:",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "Failed to create member"
            });
        }
    }
);


// ==================================================
// GET MEMBERS
// Search + Pagination + Sorting
// ==================================================

app.get(
    "/api/members",
    authenticateToken,
    (req, res) => {

        try {

            const page =
                Math.max(
                    parseInt(req.query.page) || 1,
                    1
                );

            const limit =
                Math.min(
                    Math.max(
                        parseInt(req.query.limit) || 10,
                        1
                    ),
                    100
                );

            const offset =
                (page - 1) * limit;

            const search =
                (req.query.search || "").trim();

            const allowedSorts = {
                name: "name",
                points: "points_balance",
                tier: "tier",
                created: "created_at"
            };

            const sortBy =
                allowedSorts[
                    req.query.sortBy
                ] || "created_at";

            const order =
                req.query.order === "asc"
                    ? "ASC"
                    : "DESC";

            const searchPattern =
                `%${search}%`;

            const countResult =
                db.prepare(`
                    SELECT COUNT(*) AS total
                    FROM members
                    WHERE name LIKE ?
                       OR phone LIKE ?
                `).get(
                    searchPattern,
                    searchPattern
                );

            const members =
                db.prepare(`
                    SELECT
                        id,
                        name,
                        phone,
                        email,
                        points_balance,
                        lifetime_earned_points,
                        tier,
                        created_at,
                        updated_at
                    FROM members
                    WHERE name LIKE ?
                       OR phone LIKE ?
                    ORDER BY ${sortBy} ${order}
                    LIMIT ? OFFSET ?
                `).all(
                    searchPattern,
                    searchPattern,
                    limit,
                    offset
                );

            const total =
                countResult.total;

            res.json({
                success: true,
                data: members,

                pagination: {
                    page,
                    limit,
                    total,
                    totalPages:
                        Math.ceil(total / limit)
                },

                sorting: {
                    sortBy,
                    order
                }
            });

        } catch (error) {

            console.error(
                "Get members error:",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "Failed to fetch members"
            });
        }
    }
);


// ==================================================
// GET SINGLE MEMBER
// ==================================================

app.get(
    "/api/members/:id",
    authenticateToken,
    (req, res) => {

        try {

            const member =
                db.prepare(`
                    SELECT *
                    FROM members
                    WHERE id = ?
                `).get(req.params.id);

            if (!member) {

                return res.status(404).json({
                    success: false,
                    error:
                        "Member not found"
                });
            }

            res.json({
                success: true,
                member
            });

        } catch (error) {

            console.error(
                "Get member error:",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "Failed to fetch member"
            });
        }
    }
);


// ==================================================
// RECORD PURCHASE
//
// T2:
// - Creates point lot
// - 90-day expiry
//
// T1:
// - Creates outbox event when tier changes
// ==================================================

app.post(
    "/api/members/:id/purchases",
    authenticateToken,
    (req, res) => {

        try {

            const memberId =
                Number(req.params.id);

            const amount =
                Number(req.body.amount);

            // ------------------------------------------
            // Validation
            // ------------------------------------------

            if (!Number.isInteger(memberId)) {

                return res.status(400).json({
                    success: false,
                    error:
                        "Invalid member ID"
                });
            }

            if (
                !Number.isFinite(amount) ||
                amount <= 0
            ) {

                return res.status(400).json({
                    success: false,
                    error:
                        "Purchase amount must be greater than 0"
                });
            }


            // ------------------------------------------
            // Find member
            // ------------------------------------------

            const member =
                db.prepare(`
                    SELECT *
                    FROM members
                    WHERE id = ?
                `).get(memberId);

            if (!member) {

                return res.status(404).json({
                    success: false,
                    error:
                        "Member not found"
                });
            }


            // ------------------------------------------
            // Calculate points using current tier
            // ------------------------------------------

            const previousTier =
                member.tier;

            const earnedPoints =
                calculateEarnedPoints(
                    amount,
                    previousTier
                );


            const newBalance =
                member.points_balance +
                earnedPoints;


            const newLifetimeEarned =
                member.lifetime_earned_points +
                earnedPoints;


            const newTier =
                calculateTier(
                    newLifetimeEarned
                );


            // ------------------------------------------
            // Application clock
            // ------------------------------------------

            const earnedAt =
                clock.now();

            const earnedAtSql =
                clock.toSqliteDate(
                    earnedAt
                );


            const expiresAt =
                new Date(earnedAt);

            expiresAt.setUTCDate(
                expiresAt.getUTCDate() + 90
            );


            const expiresAtSql =
                clock.toSqliteDate(
                    expiresAt
                );


            // ------------------------------------------
            // Atomic transaction
            // ------------------------------------------

            const purchaseTransaction =
                db.transaction(() => {

                    // 1. Ledger transaction

                    const transactionResult =
                        db.prepare(`
                            INSERT INTO transactions
                            (
                                member_id,
                                type,
                                points,
                                amount,
                                description,
                                created_at
                            )
                            VALUES
                            (?, 'EARN', ?, ?, ?, ?)
                        `).run(
                            memberId,
                            earnedPoints,
                            amount,
                            `Purchase of ₹${amount}`,
                            earnedAtSql
                        );


                    const transactionId =
                        transactionResult.lastInsertRowid;


                    // 2. Point lot

                    if (earnedPoints > 0) {

                        db.prepare(`
                            INSERT INTO point_lots
                            (
                                member_id,
                                transaction_id,
                                points_earned,
                                points_remaining,
                                earned_at,
                                expires_at
                            )
                            VALUES (?, ?, ?, ?, ?, ?)
                        `).run(
                            memberId,
                            transactionId,
                            earnedPoints,
                            earnedPoints,
                            earnedAtSql,
                            expiresAtSql
                        );
                    }


                    // 3. Member update

                    db.prepare(`
                        UPDATE members
                        SET
                            points_balance = ?,
                            lifetime_earned_points = ?,
                            tier = ?,
                            updated_at = ?
                        WHERE id = ?
                    `).run(
                        newBalance,
                        newLifetimeEarned,
                        newTier,
                        earnedAtSql,
                        memberId
                    );


                    // 4. Notification event

                    if (
                        newTier !==
                        previousTier
                    ) {

                        const payload = {
                            memberId: member.id,
                            memberName: member.name,
                            phone: member.phone,
                            previousTier,
                            newTier,
                            message:
                                `Congratulations! ` +
                                `You have reached ` +
                                `${newTier} tier.`
                        };


                        db.prepare(`
                            INSERT INTO outbox
                            (
                                event_type,
                                member_id,
                                payload,
                                created_at
                            )
                            VALUES (?, ?, ?, ?)
                        `).run(
                            "MEMBER_TIER_CHANGED",
                            memberId,
                            JSON.stringify(payload),
                            earnedAtSql
                        );
                    }
                });


            purchaseTransaction();


            // ------------------------------------------
            // Fresh member
            // ------------------------------------------

            const updatedMember =
                db.prepare(`
                    SELECT *
                    FROM members
                    WHERE id = ?
                `).get(memberId);


            res.status(201).json({

                success: true,

                message:
                    "Purchase recorded successfully",

                purchase: {
                    amount,
                    earnedPoints,
                    earnedAt:
                        earnedAt.toISOString(),
                    expiresAt:
                        expiresAt.toISOString()
                },

                tierChange:
                    newTier !== previousTier
                        ? {
                            previousTier,
                            newTier
                        }
                        : null,

                member:
                    updatedMember
            });

        } catch (error) {

            console.error(
                "Purchase error:",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "Failed to record purchase"
            });
        }
    }
);


// ==================================================
// REDEEM REWARD
//
// T2:
// Consume point lots FIFO.
// Redeemed points must NOT remain in lots.
// ==================================================

app.post(
    "/api/members/:id/redeem",
    authenticateToken,
    (req, res) => {

        try {

            const memberId =
                Number(req.params.id);

            const rewardId =
                Number(req.body.rewardId);


            // ------------------------------------------
            // Validation
            // ------------------------------------------

            if (!Number.isInteger(memberId)) {

                return res.status(400).json({
                    success: false,
                    error:
                        "Invalid member ID"
                });
            }


            if (!Number.isInteger(rewardId)) {

                return res.status(400).json({
                    success: false,
                    error:
                        "Invalid reward ID"
                });
            }


            // ------------------------------------------
            // Find member
            // ------------------------------------------

            const member =
                db.prepare(`
                    SELECT *
                    FROM members
                    WHERE id = ?
                `).get(memberId);


            if (!member) {

                return res.status(404).json({
                    success: false,
                    error:
                        "Member not found"
                });
            }


            // ------------------------------------------
            // Find reward
            // ------------------------------------------

            const reward =
                db.prepare(`
                    SELECT *
                    FROM rewards
                    WHERE id = ?
                      AND active = 1
                `).get(rewardId);


            if (!reward) {

                return res.status(404).json({
                    success: false,
                    error:
                        "Reward not found or inactive"
                });
            }


            // ------------------------------------------
            // Check balance
            // ------------------------------------------

            try {

                validateRedemption(
                    member.points_balance,
                    reward.points_required
                );

            } catch (error) {

                return res.status(400).json({
                    success: false,
                    error: error.message
                });
            }


            const newBalance =
                member.points_balance -
                reward.points_required;


            const redemptionTime =
                clock.now();

            const redemptionTimeSql =
                clock.toSqliteDate(
                    redemptionTime
                );


            // ------------------------------------------
            // Atomic redemption
            // ------------------------------------------

            const redeemTransaction =
                db.transaction(() => {

                    // 1. Get oldest available lots

                    const lots =
                        db.prepare(`
                            SELECT
                                id,
                                points_remaining,
                                expires_at
                            FROM point_lots
                            WHERE member_id = ?
                              AND points_remaining > 0
                              AND datetime(expires_at)
                                  > datetime(?)
                            ORDER BY
                                datetime(earned_at),
                                id
                        `).all(
                            memberId,
                            redemptionTimeSql
                        );


                    let remaining =
                        reward.points_required;


                    const updateLot =
                        db.prepare(`
                            UPDATE point_lots
                            SET points_remaining = ?
                            WHERE id = ?
                        `);


                    // 2. Consume FIFO

                    for (const lot of lots) {

                        if (remaining <= 0) {
                            break;
                        }


                        const consumed =
                            Math.min(
                                lot.points_remaining,
                                remaining
                            );


                        updateLot.run(
                            lot.points_remaining -
                            consumed,
                            lot.id
                        );


                        remaining -= consumed;
                    }


                    // This should never happen if
                    // member balance and lots are correct.

                    if (remaining > 0) {

                        throw new Error(
                            "Insufficient non-expired point lots"
                        );
                    }


                    // 3. Record redemption

                    db.prepare(`
                        INSERT INTO transactions
                        (
                            member_id,
                            type,
                            points,
                            amount,
                            description,
                            created_at
                        )
                        VALUES
                        (?, 'REDEEM', ?, NULL, ?, ?)
                    `).run(
                        memberId,
                        -reward.points_required,
                        `Redeemed ${reward.name}`,
                        redemptionTimeSql
                    );


                    // 4. Update member balance

                    db.prepare(`
                        UPDATE members
                        SET
                            points_balance = ?,
                            updated_at = ?
                        WHERE id = ?
                    `).run(
                        newBalance,
                        redemptionTimeSql,
                        memberId
                    );
                });


            redeemTransaction();


            // ------------------------------------------
            // Fresh member
            // ------------------------------------------

            const updatedMember =
                db.prepare(`
                    SELECT *
                    FROM members
                    WHERE id = ?
                `).get(memberId);


            res.status(200).json({

                success: true,

                message:
                    "Reward redeemed successfully",

                redemption: {
                    reward: reward.name,
                    pointsUsed:
                        reward.points_required
                },

                member:
                    updatedMember
            });

        } catch (error) {

            console.error(
                "Redemption error:",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    error.message ||
                    "Failed to redeem reward"
            });
        }
    }
);


// ==================================================
// GET REWARDS
// ==================================================

app.get(
    "/api/rewards",
    authenticateToken,
    (req, res) => {

        try {

            const rewards =
                db.prepare(`
                    SELECT
                        id,
                        name,
                        description,
                        points_required
                    FROM rewards
                    WHERE active = 1
                    ORDER BY points_required ASC
                `).all();


            res.json({
                success: true,
                data: rewards
            });

        } catch (error) {

            console.error(
                "Get rewards error:",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "Failed to fetch rewards"
            });
        }
    }
);


// ==================================================
// MEMBER TRANSACTION HISTORY
// ==================================================

app.get(
    "/api/members/:id/transactions",
    authenticateToken,
    (req, res) => {

        try {

            const memberId =
                Number(req.params.id);


            const member =
                db.prepare(`
                    SELECT id
                    FROM members
                    WHERE id = ?
                `).get(memberId);


            if (!member) {

                return res.status(404).json({
                    success: false,
                    error:
                        "Member not found"
                });
            }


            const transactions =
                db.prepare(`
                    SELECT
                        id,
                        type,
                        points,
                        amount,
                        description,
                        created_at
                    FROM transactions
                    WHERE member_id = ?
                    ORDER BY
                        datetime(created_at) DESC,
                        id DESC
                `).all(memberId);


            res.json({
                success: true,
                data: transactions
            });

        } catch (error) {

            console.error(
                "Transaction history error:",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "Failed to fetch transaction history"
            });
        }
    }
);


// ==================================================
// CLOCK
//
// POST /clock
//
// Body examples:
//
// { "advanceDays": 90 }
//
// OR
//
// { "now": "2026-12-20T10:00:00Z" }
//
// Every clock change immediately runs
// the expiration job.
// ==================================================

app.post("/clock", (req, res) => {

    try {

        let currentTime;


        if (
            req.body &&
            req.body.advanceDays !== undefined
        ) {

            const days =
                Number(
                    req.body.advanceDays
                );


            if (!Number.isFinite(days)) {

                return res.status(400).json({
                    success: false,
                    error:
                        "advanceDays must be a number"
                });
            }


            currentTime =
                clock.advanceDays(days);

        }

        else if (
            req.body &&
            (
                req.body.now ||
                req.body.timestamp ||
                req.body.date
            )
        ) {

            const value =
                req.body.now ||
                req.body.timestamp ||
                req.body.date;


            currentTime =
                clock.setTime(value);

        }

        else {

            return res.status(400).json({
                success: false,
                error:
                    "Provide now, timestamp, date, or advanceDays"
            });
        }


        // Run expiration immediately

        const expiration =
            expireStalePoints();


        return res.json({

            success: true,

            clock:
                currentTime.toISOString(),

            expiration

        });

    } catch (error) {

        console.error(
            "Clock error:",
            error
        );


        return res.status(400).json({
            success: false,
            error: error.message
        });
    }
});


// ==================================================
// GET OUTBOX
// ==================================================

app.get("/outbox", (req, res) => {

    try {

        const events =
            db.prepare(`
                SELECT
                    id,
                    event_type,
                    member_id,
                    payload,
                    created_at,
                    processed
                FROM outbox
                ORDER BY id ASC
            `).all();


        const data =
            events.map(event => {

                let payload;

                try {
                    payload =
                        JSON.parse(event.payload);
                } catch {
                    payload =
                        event.payload;
                }


                return {
                    ...event,
                    payload
                };
            });


        res.json({
            success: true,
            data
        });

    } catch (error) {

        console.error(
            "Outbox error:",
            error
        );


        res.status(500).json({
            success: false,
            error:
                "Failed to fetch outbox"
        });
    }
});

// Serve React app for frontend routes
app.use((req, res, next) => {
    if (req.method === "GET" && !req.path.startsWith("/api")) {
        return res.sendFile(path.join(clientPath, "index.html"));
    }

    next();
});
// ==================================================
// 404 HANDLER
// ==================================================

app.use((req, res) => {

    res.status(404).json({
        success: false,
        error: "Route not found"
    });
});


// ==================================================
// START SERVER
// ==================================================

app.listen(PORT, () => {

    console.log(
        `Server running on port ${PORT}`
    );
});