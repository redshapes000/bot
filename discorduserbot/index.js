require('dotenv').config();

const { Client } = require(process.env.DISCORD_VERSION);
const fs = require('fs');
const express = require('express');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');

// ---------------- MONGODB ----------------
mongoose.connect(process.env.MONGO_URI);

const userSchema = new mongoose.Schema({
    userId: String,
    wallet: Number,
    bank: Number,
    lastDaily: Number,
    lastWork: Number,

    // ADDED (streak + cooldown tracking)
    lastWeekly: Number,
    lastMonthly: Number,
    lastYearly: Number,

    dailyStreak: Number,
    weeklyStreak: Number,
    monthlyStreak: Number,
    yearlyStreak: Number
});

const User = mongoose.model('User', userSchema);

// ---------------- SAFE HELPERS ----------------
function safeAmount(amount) {
    amount = parseInt(amount);
    if (isNaN(amount) || amount <= 0) return null;
    if (amount > 1_000_000) return null; // anti exploit cap
    return amount;
}

// ---------------- WEB SERVER ----------------
const app = express();
const PORT = process.env.PORT || 3000;

// RATE LIMITER
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later." }
});

app.use(limiter);

app.get('/', async (req, res) => {
    const data = await User.find();

    let users = data.length;
    let totalMoney = 0;

    for (const u of data) {
        totalMoney += (u.wallet || 0) + (u.bank || 0);
    }

    const top = await User.find().sort({ wallet: -1 }).limit(10);

    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Lemoney Dashboard</title>
    <style>
        body {
            margin: 0;
            font-family: Arial, sans-serif;
            background: #0f1115;
            color: #ffffff;
        }

        .container {
            max-width: 900px;
            margin: 50px auto;
            padding: 20px;
        }

        .title {
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 20px;
            color: #00ff99;
        }

        .card {
            background: #1a1d24;
            padding: 20px;
            margin-bottom: 15px;
            border-radius: 12px;
        }

        .stats {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
        }

        .stat {
            background: #151821;
            padding: 20px;
            border-radius: 12px;
            text-align: center;
        }

        .stat h2 {
            margin: 0;
            color: #00ff99;
        }

        .online {
            color: #00ff99;
            font-weight: bold;
        }
    </style>
</head>

<body>
<div class="container">

<div class="title">💰 Lemoney Dashboard</div>

<div class="card">
Status: <span class="online">🟢 Online</span>
</div>

<div class="stats">
    <div class="stat">
        <h2>${users}</h2>
        <p>Users</p>
    </div>

    <div class="stat">
        <h2>$${totalMoney}</h2>
        <p>Total Economy</p>
    </div>

    <div class="stat">
        <h2>24/7</h2>
        <p>Uptime</p>
    </div>
</div>

<div class="card">
<h2>🏆 Leaderboard</h2>
${top.map((u, i) => `<p>#${i + 1} ${u.userId} — $${u.wallet}</p>`).join('')}
</div>

</div>
</body>
</html>
    `);
});

app.get('/api/stats', async (req, res) => {
    const data = await User.find();

    res.json({
        users: data.length,
        data
    });
});

app.listen(PORT, () => {
    console.log(`Web server running on http://localhost:${PORT}`);
});

// ---------------- DISCORD BOT ----------------

const client = new Client({
    checkUpdate: false,
});

// ---------------- SPAM PROTECTION ----------------
const cooldownMap = new Map();

// ---------------- USER FETCH (SAFE) ----------------
async function getUserData(userId) {
    let user = await User.findOne({ userId });

    if (!user) {
        user = await User.create({
            userId,
            wallet: 0,
            bank: 0,
            lastDaily: 0,
            lastWork: 0,
            lastWeekly: 0,
            lastMonthly: 0,
            lastYearly: 0,
            dailyStreak: 0,
            weeklyStreak: 0,
            monthlyStreak: 0,
            yearlyStreak: 0
        });
    }

    user.wallet ??= 0;
    user.bank ??= 0;

    return user;
}

client.on('ready', async () => {
    console.log(`Client is ready!`);
});

// ---------------- MESSAGE HANDLER ----------------
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // simple anti spam
    const nowGlobal = Date.now();
    const last = cooldownMap.get(message.author.id) || 0;
    if (nowGlobal - last < 1200) return;
    cooldownMap.set(message.author.id, nowGlobal);

    const user = await getUserData(message.author.id);

    // ---------------- BALANCE ----------------
    if (message.content === 'lemoney!balance') {
        return message.reply(`💰 Wallet: ${user.wallet}\n🏦 Bank: ${user.bank}`);
    }

    // ---------------- DAILY + STREAK ----------------
    if (message.content === 'lemoney!daily') {
        const now = Date.now();
        const cooldown = 86400000;

        if (now - user.lastDaily < cooldown) {
            const hours = Math.ceil((cooldown - (now - user.lastDaily)) / 3600000);
            return message.reply(`⏰ You can claim daily again in ${hours} hours.`);
        }

        // streak logic
        if (now - user.lastDaily < 172800000 && user.lastDaily !== 0) {
            user.dailyStreak = (user.dailyStreak || 0) + 1;
        } else {
            user.dailyStreak = 1;
        }

        let reward = 1000 + (user.dailyStreak * 200);

        user.wallet += reward;
        user.lastDaily = now;

        await user.save();

        return message.reply(`🎉 Daily: $${reward} 🔥 (Streak ${user.dailyStreak})`);
    }

    // ---------------- WORK ----------------
    if (message.content === 'lemoney!work') {
        const now = Date.now();
        const cooldown = 30 * 60 * 1000;

        if (now - user.lastWork < cooldown) {
            const remaining = cooldown - (now - user.lastWork);
            const m = Math.floor(remaining / 60000);
            const s = Math.floor((remaining % 60000) / 1000);
            return message.reply(`⏰ Wait ${m}m ${s}s`);
        }

        const amount = Math.floor(Math.random() * 500) + 100;

        user.wallet += amount;
        user.lastWork = now;

        await user.save();

        return message.reply(`💼 You earned $${amount}`);
    }

    // ---------------- WEEKLY ----------------
    if (message.content === 'lemoney!weekly') {
        const now = Date.now();
        const cooldown = 7 * 86400000;

        if (now - user.lastWeekly < cooldown) {
            const days = Math.ceil((cooldown - (now - user.lastWeekly)) / 86400000);
            return message.reply(`⏰ Wait ${days} days`);
        }

        user.weeklyStreak = (now - user.lastWeekly < 14 * 86400000 && user.lastWeekly) 
            ? (user.weeklyStreak || 0) + 1 
            : 1;

        let reward = 5000 + (user.weeklyStreak * 1500);

        user.wallet += reward;
        user.lastWeekly = now;

        await user.save();

        return message.reply(`🎉 Weekly: $${reward} 🔥 (Streak ${user.weeklyStreak})`);
    }

    // ---------------- MONTHLY ----------------
    if (message.content === 'lemoney!monthly') {
        const now = Date.now();
        const cooldown = 30 * 86400000;

        if (now - user.lastMonthly < cooldown) {
            const days = Math.ceil((cooldown - (now - user.lastMonthly)) / 86400000);
            return message.reply(`⏰ Wait ${days} days`);
        }

        user.monthlyStreak = (now - user.lastMonthly < 60 * 86400000 && user.lastMonthly)
            ? (user.monthlyStreak || 0) + 1
            : 1;

        let reward = 20000 + (user.monthlyStreak * 5000);

        user.wallet += reward;
        user.lastMonthly = now;

        await user.save();

        return message.reply(`🎉 Monthly: $${reward} 🔥 (Streak ${user.monthlyStreak})`);
    }

    // ---------------- YEARLY ----------------
    if (message.content === 'lemoney!yearly') {
        const now = Date.now();
        const cooldown = 365 * 86400000;

        if (now - user.lastYearly < cooldown) {
            const days = Math.ceil((cooldown - (now - user.lastYearly)) / 86400000);
            return message.reply(`⏰ Wait ${days} days`);
        }

        user.yearlyStreak = (user.yearlyStreak || 0) + 1;

        user.wallet += 100000;
        user.lastYearly = now;

        await user.save();

        return message.reply(`🎉 Yearly: $100,000 🔥 (Streak ${user.yearlyStreak})`);
    }

    // ---------------- DEPOSIT ----------------
    if (message.content.startsWith('lemoney!deposit ')) {
        const amount = safeAmount(message.content.split(' ')[1]);
        if (!amount) return message.reply("Invalid amount");
        if (user.wallet < amount) return message.reply("Not enough money");

        user.wallet -= amount;
        user.bank += amount;

        await user.save();

        return message.reply(`🏦 Deposited $${amount}`);
    }

    // ---------------- WITHDRAW ----------------
    if (message.content.startsWith('lemoney!withdraw ')) {
        const amount = safeAmount(message.content.split(' ')[1]);
        if (!amount) return message.reply("Invalid amount");
        if (user.bank < amount) return message.reply("Not enough bank");

        user.bank -= amount;
        user.wallet += amount;

        await user.save();

        return message.reply(`💸 Withdrew $${amount}`);
    }

    // ---------------- LEADERBOARD ----------------
    if (message.content === 'lemoney!leaderboard') {
        const top = await User.find().sort({ wallet: -1 }).limit(10);

        return message.reply(
            "🏆 Leaderboard\n\n" +
            top.map((u, i) => `#${i + 1} ${u.userId} — $${u.wallet}`).join("\n")
        );
    }

    // ---------------- HELP ----------------
        if (message.content === 'lemoney!help') {
        return message.reply(`
💰 **Lemoney Commands**

📊 Economy
• lemoney!balance - Check your wallet & bank
• lemoney!daily - Claim daily reward (streak system)
• lemoney!work - Earn random money

📅 Rewards
• lemoney!weekly - Weekly reward (streak bonus)
• lemoney!monthly - Monthly reward (streak bonus)
• lemoney!yearly - Yearly reward

🏦 Banking
• lemoney!deposit <amount> - Deposit money into bank
• lemoney!withdraw <amount> - Withdraw money from bank

🏆 Leaderboards
• lemoney!leaderboard - Top richest users

🌐 Info
• lemoney!website - View bot dashboard
• lemoney!status - Check bot uptime status

⚙️ System
• All commands are protected with cooldowns & anti-spam
        `);
    }

    if (message.content === 'lemoney!website') {
        return message.reply(`https://limeydiscordbot.onrender.com`);
    }

    if (message.content === 'lemoney!status') {
        return message.reply(`https://lemoneydiscordbot.betteruptime.com/`);
    }
});

client.login(process.env.DISCORD_TOKEN);
