const db = require("./db");

const members = [
    ["Aarav Mehta", "9000000001", "aarav@example.com"],
    ["Ananya Sharma", "9000000002", "ananya@example.com"],
    ["Rohan Gupta", "9000000003", "rohan@example.com"],
    ["Ishita Singh", "9000000004", "ishita@example.com"],
    ["Arjun Verma", "9000000005", "arjun@example.com"],
    ["Neha Kapoor", "9000000006", "neha@example.com"],
    ["Kabir Jain", "9000000007", "kabir@example.com"],
    ["Meera Joshi", "9000000008", "meera@example.com"],
    ["Aditya Agarwal", "9000000009", "aditya@example.com"],
    ["Kavya Sharma", "9000000010", "kavya@example.com"],
    ["Vihaan Patel", "9000000011", "vihaan@example.com"],
    ["Diya Malhotra", "9000000012", "diya@example.com"],
    ["Yash Gupta", "9000000013", "yash@example.com"],
    ["Sara Khan", "9000000014", "sara@example.com"],
    ["Dev Kumar", "9000000015", "dev@example.com"],
    ["Anika Rao", "9000000016", "anika@example.com"],
    ["Raj Malhotra", "9000000017", "raj@example.com"],
    ["Tanya Saini", "9000000018", "tanya@example.com"],
    ["Kunal Bansal", "9000000019", "kunal@example.com"],
    ["Pooja Verma", "9000000020", "pooja@example.com"],
    ["Manav Shah", "9000000021", "manav@example.com"],
    ["Nisha Agarwal", "9000000022", "nisha@example.com"],
    ["Aryan Joshi", "9000000023", "aryan@example.com"],
    ["Simran Kaur", "9000000024", "simran@example.com"],
    ["Harsh Mehta", "9000000025", "harsh@example.com"],
    ["Aditi Gupta", "9000000026", "aditi@example.com"],
    ["Rahul Bhatia", "9000000027", "rahul.b@example.com"],
    ["Muskan Jain", "9000000028", "muskan@example.com"],
    ["Sahil Sharma", "9000000029", "sahil@example.com"],
    ["Riya Kapoor", "9000000030", "riya@example.com"],
    ["Abhinav Singh", "9000000031", "abhinav@example.com"],
    ["Sneha Patel", "9000000032", "sneha@example.com"],
    ["Vansh Agarwal", "9000000033", "vansh@example.com"],
    ["Mahi Verma", "9000000034", "mahi@example.com"],
    ["Ayush Gupta", "9000000035", "ayush@example.com"],
    ["Sanya Mehta", "9000000036", "sanya@example.com"],
    ["Dhruv Shah", "9000000037", "dhruv@example.com"],
    ["Ira Kapoor", "9000000038", "ira@example.com"],
    ["Aman Jain", "9000000039", "aman@example.com"],
    ["Shreya Sharma", "9000000040", "shreya@example.com"],
    ["Mohit Kumar", "9000000041", "mohit@example.com"],
    ["Palak Singh", "9000000042", "palak@example.com"],
    ["Nikhil Rao", "9000000043", "nikhil@example.com"],
    ["Khushi Gupta", "9000000044", "khushi@example.com"],
    ["Varun Bansal", "9000000045", "varun@example.com"],
    ["Ayesha Khan", "9000000046", "ayesha@example.com"],
    ["Ritesh Mehta", "9000000047", "ritesh@example.com"],
    ["Nandini Joshi", "9000000048", "nandini@example.com"],
    ["Om Patel", "9000000049", "om@example.com"],
    ["Prisha Malhotra", "9000000050", "prisha@example.com"],
];


// Different balances for demo purposes
const balances = [
    80, 120, 160, 210, 275,
    320, 380, 440, 60, 190,
    500, 540, 620, 700, 780,
    850, 920, 1000, 1080, 1160,
    1240, 1320, 1400, 1480, 1550,
    1620, 1750, 1840, 1950, 2050,
    2200, 2350, 2500, 2650, 2800,
    3000, 3200, 3400, 3600, 3800,
    4000, 4200, 4500, 4700, 5000,
    5200, 5500, 5800, 6000, 6500
];


function calculateTier(lifetime) {

    if (lifetime >= 1500) {
        return "Gold";
    }

    if (lifetime >= 500) {
        return "Silver";
    }

    return "Bronze";
}


const insertMember = db.prepare(`
    INSERT OR IGNORE INTO members
    (
        name,
        phone,
        email,
        points_balance,
        lifetime_earned_points,
        tier
    )
    VALUES (?, ?, ?, ?, ?, ?)
`);


const insertTransaction = db.prepare(`
    INSERT INTO transactions
    (
        member_id,
        type,
        points,
        amount,
        description
    )
    VALUES (?, ?, ?, ?, ?)
`);


const seed = db.transaction(() => {

    members.forEach((member, index) => {

        const balance = balances[index];

        // Give members different lifetime totals.
        // Some members have redeemed points,
        // so lifetime can be greater than current balance.
        const redeemed =
            index % 5 === 0
                ? 100
                : index % 7 === 0
                    ? 250
                    : 0;

        const lifetime =
            balance + redeemed;

        const tier =
            calculateTier(lifetime);


        insertMember.run(
            member[0],
            member[1],
            member[2],
            balance,
            lifetime,
            tier
        );


        const inserted =
            db.prepare(`
                SELECT id
                FROM members
                WHERE phone = ?
            `).get(member[1]);


        if (!inserted) {
            return;
        }


        // Earning transaction
        insertTransaction.run(
            inserted.id,
            "EARN",
            lifetime,
            lifetime * 10,
            `Seeded lifetime points`
        );


        // Redemption transaction if applicable
        if (redeemed > 0) {

            insertTransaction.run(
                inserted.id,
                "REDEEM",
                -redeemed,
                null,
                "Seeded reward redemption"
            );

        }

    });

});


try {

    seed();

    console.log(
        "✅ Demo members seeded successfully."
    );

    const result =
        db.prepare(`
            SELECT COUNT(*) AS count
            FROM members
        `).get();

    console.log(
        `Total members in database: ${result.count}`
    );

} catch (error) {

    console.error(
        "❌ Seed failed:",
        error.message
    );

} finally {

    db.close();

}