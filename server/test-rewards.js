const {
    calculateTier,
    calculateEarnedPoints,
    validateRedemption
} = require("./services/rewards");

console.log("=== REWARDS LOGIC TEST ===");

// Tier tests
console.log("\nTier Tests:");

console.log("0 points:", calculateTier(0));
console.log("499 points:", calculateTier(499));
console.log("500 points:", calculateTier(500));
console.log("1499 points:", calculateTier(1499));
console.log("1500 points:", calculateTier(1500));

// Earning tests
console.log("\nEarning Tests:");

console.log(
    "Bronze, ₹100:",
    calculateEarnedPoints(100, "Bronze")
);

console.log(
    "Silver, ₹100:",
    calculateEarnedPoints(100, "Silver")
);

console.log(
    "Gold, ₹100:",
    calculateEarnedPoints(100, "Gold")
);

console.log(
    "Bronze, ₹95:",
    calculateEarnedPoints(95, "Bronze")
);

// Redemption tests
console.log("\nRedemption Tests:");

try {
    validateRedemption(500, 100);
    console.log("500 points redeeming 100: PASS");
} catch (error) {
    console.log("FAIL:", error.message);
}

try {
    validateRedemption(50, 100);
    console.log("50 points redeeming 100: FAIL");
} catch (error) {
    console.log("50 points redeeming 100: PASS -", error.message);
}