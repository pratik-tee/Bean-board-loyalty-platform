const db = require("./db");
const { calculateTier } = require("./services/rewards");

function addDays(dateString, days) {
    const date = new Date(dateString.replace(" ", "T") + "Z");

    if (Number.isNaN(date.getTime())) {
        throw new Error(`Invalid transaction date: ${dateString}`);
    }

    date.setUTCDate(date.getUTCDate() + days);

    return date.toISOString()
        .replace("T", " ")
        .replace(".000Z", "");
}

const migration = db.transaction(() => {

    // ==================================================
    // 1. Create outbox
    // ==================================================

    db.exec(`
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
    `);

    console.log("✅ Outbox table ready");


    // ==================================================
    // 2. Check transactions schema
    // ==================================================

    const schema = db.prepare(`
        SELECT sql
        FROM sqlite_master
        WHERE type = 'table'
          AND name = 'transactions'
    `).get();

    if (!schema) {
        throw new Error("transactions table does not exist");
    }


    // ==================================================
    // 3. Rebuild transactions table to support EXPIRE
    // ==================================================

    if (!schema.sql.includes("'EXPIRE'")) {

        /*
         * IMPORTANT:
         *
         * point_lots must NOT exist while transactions is
         * being renamed/rebuilt because SQLite can update
         * the foreign-key definition to transactions_backup.
         *
         * We currently have zero point_lots rows, so dropping
         * this table during migration is safe.
         */

        db.pragma("foreign_keys = OFF");

        db.exec(`
            DROP TABLE IF EXISTS point_lots;

            ALTER TABLE transactions
            RENAME TO transactions_backup;

            CREATE TABLE transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                member_id INTEGER NOT NULL,
                type TEXT NOT NULL
                    CHECK(type IN ('EARN', 'REDEEM', 'EXPIRE')),
                points INTEGER NOT NULL,
                amount REAL,
                description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (member_id) REFERENCES members(id)
            );

            INSERT INTO transactions (
                id,
                member_id,
                type,
                points,
                amount,
                description,
                created_at
            )
            SELECT
                id,
                member_id,
                type,
                points,
                amount,
                description,
                created_at
            FROM transactions_backup;

            DROP TABLE transactions_backup;

            CREATE INDEX IF NOT EXISTS idx_transactions_member
            ON transactions(member_id);
        `);

        db.pragma("foreign_keys = ON");

        console.log("✅ transactions now supports EXPIRE");

    } else {

        console.log("ℹ️ transactions already supports EXPIRE");

    }


    // ==================================================
    // 4. Create point_lots AFTER transactions rebuild
    // ==================================================

    db.exec(`
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
    `);

    console.log("✅ Point lots table ready");


    // ==================================================
    // 5. Backfill existing transactions into point lots
    // ==================================================

    const lotCount = db.prepare(`
        SELECT COUNT(*) AS count
        FROM point_lots
    `).get().count;


    if (lotCount === 0) {

        const members = db.prepare(`
            SELECT
                id,
                points_balance
            FROM members
            ORDER BY id
        `).all();


        const transactions = db.prepare(`
            SELECT
                id,
                member_id,
                type,
                points,
                created_at
            FROM transactions
            ORDER BY
                member_id,
                datetime(created_at),
                id
        `).all();


        const insertLot = db.prepare(`
            INSERT INTO point_lots (
                member_id,
                transaction_id,
                points_earned,
                points_remaining,
                earned_at,
                expires_at
            )
            VALUES (?, ?, ?, ?, ?, ?)
        `);


        const getLots = db.prepare(`
            SELECT
                id,
                points_remaining
            FROM point_lots
            WHERE member_id = ?
              AND points_remaining > 0
            ORDER BY
                datetime(earned_at),
                id
        `);


        const updateLot = db.prepare(`
            UPDATE point_lots
            SET points_remaining = ?
            WHERE id = ?
        `);


        for (const member of members) {

            const memberTransactions =
                transactions.filter(
                    transaction =>
                        transaction.member_id === member.id
                );


            for (const transaction of memberTransactions) {

                // --------------------------------------
                // EARN transaction
                // --------------------------------------

                if (
                    transaction.type === "EARN" &&
                    transaction.points > 0
                ) {

                    insertLot.run(
                        member.id,
                        transaction.id,
                        transaction.points,
                        transaction.points,
                        transaction.created_at,
                        addDays(
                            transaction.created_at,
                            90
                        )
                    );
                }


                // --------------------------------------
                // REDEEM transaction
                // --------------------------------------

                else if (
                    transaction.type === "REDEEM" &&
                    transaction.points < 0
                ) {

                    let amountToConsume =
                        Math.abs(transaction.points);


                    /*
                     * FIFO:
                     * Consume the oldest available points first.
                     */

                    const lots =
                        getLots.all(member.id);


                    for (const lot of lots) {

                        if (amountToConsume <= 0) {
                            break;
                        }


                        const consumed =
                            Math.min(
                                lot.points_remaining,
                                amountToConsume
                            );


                        updateLot.run(
                            lot.points_remaining - consumed,
                            lot.id
                        );


                        amountToConsume -= consumed;
                    }


                    if (amountToConsume > 0) {

                        throw new Error(
                            `Member ${member.id}: ` +
                            `redemption exceeds available ` +
                            `earned points`
                        );
                    }
                }
            }


            // ------------------------------------------
            // Verify balance
            // ------------------------------------------

            const calculatedBalance =
                db.prepare(`
                    SELECT COALESCE(
                        SUM(points_remaining),
                        0
                    ) AS total
                    FROM point_lots
                    WHERE member_id = ?
                `).get(member.id).total;


            if (
                calculatedBalance !==
                member.points_balance
            ) {

                throw new Error(
                    `Balance mismatch for member ${member.id}. ` +
                    `Existing balance = ${member.points_balance}, ` +
                    `calculated lot balance = ${calculatedBalance}`
                );
            }
        }


        console.log(
            "✅ Existing transactions converted to point lots"
        );

    } else {

        console.log(
            `ℹ️ Point lots already contain ${lotCount} records`
        );
    }


    // ==================================================
    // 6. Upgrade qualifying members to Platinum
    // ==================================================

    const members = db.prepare(`
        SELECT
            id,
            name,
            lifetime_earned_points,
            tier
        FROM members
        ORDER BY id
    `).all();


    const updateTier = db.prepare(`
        UPDATE members
        SET
            tier = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `);


    for (const member of members) {

        const newTier =
            calculateTier(
                member.lifetime_earned_points
            );


        if (newTier !== member.tier) {

            updateTier.run(
                newTier,
                member.id
            );


            console.log(
                `Member ${member.id} (${member.name}): ` +
                `${member.tier} -> ${newTier}`
            );
        }
    }
});


try {

    migration();

    console.log(
        "=========================================="
    );

    console.log(
        "✅ Twist migration completed successfully."
    );

    console.log(
        "=========================================="
    );

} catch (error) {

    console.error(
        "=========================================="
    );

    console.error(
        "❌ Migration failed:"
    );

    console.error(error);

    console.error(
        "=========================================="
    );

    process.exitCode = 1;

} finally {

    db.close();
}