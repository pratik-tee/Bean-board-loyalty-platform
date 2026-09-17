const SILVER_THRESHOLD = 500;
const GOLD_THRESHOLD = 1500;
const PLATINUM_THRESHOLD = 5000;

const POINTS_PER_10 = {
    Bronze: 1,
    Silver: 2,
    Gold: 3,
    Platinum: 3,
};

function calculateTier(lifetimeEarnedPoints) {
    if (lifetimeEarnedPoints >= PLATINUM_THRESHOLD) {
        return "Platinum";
    }

    if (lifetimeEarnedPoints >= GOLD_THRESHOLD) {
        return "Gold";
    }

    if (lifetimeEarnedPoints >= SILVER_THRESHOLD) {
        return "Silver";
    }

    return "Bronze";
}

function calculateEarnedPoints(amount, tier) {
    if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Purchase amount must be greater than 0");
    }

    if (!POINTS_PER_10[tier]) {
        throw new Error("Invalid membership tier");
    }

    /*
     * Existing rates remain backward-compatible:
     * Bronze   = 1 / ₹10
     * Silver   = 2 / ₹10
     * Gold     = 3 / ₹10
     * Platinum = 0.3 / ₹1 = 3 / ₹10
     *
     * Points are integer values.
     */
    return Math.floor(
        (amount / 10) * POINTS_PER_10[tier]
    );
}

function validateRedemption(balance, rewardCost) {
    if (rewardCost <= 0) {
        throw new Error("Invalid reward cost");
    }

    if (balance < rewardCost) {
        throw new Error("Insufficient points");
    }

    return true;
}

module.exports = {
    SILVER_THRESHOLD,
    GOLD_THRESHOLD,
    PLATINUM_THRESHOLD,
    POINTS_PER_10,
    calculateTier,
    calculateEarnedPoints,
    validateRedemption
};