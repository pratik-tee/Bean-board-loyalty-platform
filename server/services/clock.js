let currentTime = null;

function now() {
    return currentTime
        ? new Date(currentTime)
        : new Date();
}

function setTime(value) {
    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
        throw new Error("Invalid clock time");
    }

    currentTime = parsed.toISOString();

    return now();
}

function advanceDays(days) {
    if (!Number.isFinite(days)) {
        throw new Error("advanceDays must be a number");
    }

    const base = now();
    base.setUTCDate(base.getUTCDate() + days);

    currentTime = base.toISOString();

    return now();
}

function resetTime() {
    currentTime = null;
}

function toSqliteDate(date) {
    return date.toISOString()
        .replace("T", " ")
        .replace(/\.\d{3}Z$/, "");
}

module.exports = {
    now,
    setTime,
    advanceDays,
    resetTime,
    toSqliteDate
};