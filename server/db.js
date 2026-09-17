const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "rewards.db");

const db = new Database(dbPath);

// Enable foreign key constraints
db.pragma("foreign_keys = ON");

// Initialize database schema
const schemaPath = path.join(__dirname, "schema.sql");
const schema = fs.readFileSync(schemaPath, "utf8");

db.exec(schema);

module.exports = db;