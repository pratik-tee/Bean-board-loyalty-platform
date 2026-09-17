const db = require("../db");
const clock = require("./clock");

function expireStalePoints() {

    const currentTime = clock.toSqliteDate(
        clock.now()
    );

    const expiredLots = db.prepare(`
        SELECT
            id,
            member_id,
            transaction_id,
            points_remaining
        FROM point_lots
        WHERE points_remaining > 0
          AND datetime(expires_at) <= datetime(?)
        ORDER BY member_id, datetime(expires_at), id
    `).all(currentTime);

    if (expiredLots.length === 0) {
        return {
            expiredLots: 0,
            expiredPoints: 0
        };
    }

    const expire = db.transaction(() => {

        const updateLot = db.prepare(`
            UPDATE point_lots
            SET points_remaining = 0
            WHERE id = ?
        `);

        const updateMember = db.prepare(`
            UPDATE members
            SET
                points_balance = points_balance - ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);

        const insertTransaction = db.prepare(`
            INSERT INTO transactions (
                member_id,
                type,
                points,
                description,
                created_at
            )
            VALUES (?, 'EXPIRE', ?, ?, ?)
        `);

        let totalExpired = 0;

        for (const lot of expiredLots) {

            const points = lot.points_remaining;

            if (points <= 0) {
                continue;
            }

            updateLot.run(lot.id);

            updateMember.run(
                points,
                lot.member_id
            );

            insertTransaction.run(
                lot.member_id,
                -points,
                `Expired ${points} points after 90 days`,
                currentTime
            );

            totalExpired += points;
        }

        return totalExpired;
    });

    const totalExpired = expire();

    return {
        expiredLots: expiredLots.length,
        expiredPoints: totalExpired
    };
}

module.exports = {
    expireStalePoints
};