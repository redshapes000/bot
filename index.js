require('dotenv').config();

const { Client, GatewayIntentBits } = require('discord.js');
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
    if (amount > 1_000_000) return null;
    return amount;
}

// ---------------- WEB SERVER ----------------
const app = express();
const PORT = process.env.PORT || 3000;

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
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
    <h1>Lemoney Dashboard</h1>
    <p>Users: ${users}</p>
    <p>Total Economy: $${totalMoney}</p>
    <h2>Leaderboard</h2>
    ${top.map((u, i) => `<p>#${i+1} ${u.userId} - $${u.wallet}</p>`).join('')}
    `);
});

app.listen(PORT, () => console.log("Web running"));

// ---------------- DISCORD BOT ----------------

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const cooldownMap = new Map();

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

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const now = Date.now();
    const last = cooldownMap.get(message.author.id) || 0;
    if (now - last < 1200) return;
    cooldownMap.set(message.author.id, now);

    const user = await getUserData(message.author.id);

    // BALANCE
    if (message.content === 'lemoney!balance') {
        return message.reply(`💰 Wallet: ${user.wallet}\n🏦 Bank: ${user.bank}`);
    }

    // DAILY
    if (message.content === 'lemoney!daily') {
        const cooldown = 86400000;

        if (now - user.lastDaily < cooldown) {
            const hours = Math.ceil((cooldown - (now - user.lastDaily)) / 3600000);
            return message.reply(`⏰ Wait ${hours}h`);
        }

        user.dailyStreak = (now - user.lastDaily < 172800000 && user.lastDaily)
            ? (user.dailyStreak || 0) + 1
            : 1;

        const reward = 1000 + user.dailyStreak * 200;

        user.wallet += reward;
        user.lastDaily = now;

        await user.save();

        return message.reply(`🎉 $${reward} (Streak ${user.dailyStreak})`);
    }

    // WORK
    if (message.content === 'lemoney!work') {
        const cooldown = 30 * 60 * 1000;

        if (now - user.lastWork < cooldown) {
            const m = Math.floor((cooldown - (now - user.lastWork)) / 60000);
            return message.reply(`⏰ Wait ${m}m`);
        }

        const amount = Math.floor(Math.random() * 500) + 100;

        user.wallet += amount;
        user.lastWork = now;

        await user.save();

        return message.reply(`💼 Earned $${amount}`);
    }

    // LEADERBOARD
    if (message.content === 'lemoney!leaderboard') {
        const top = await User.find().sort({ wallet: -1 }).limit(10);

        return message.reply(
            top.map((u, i) => `#${i+1} ${u.userId} — $${u.wallet}`).join('\n')
        );
    }

    // HELP
    if (message.content === 'lemoney!help') {
        return message.reply(`Commands: balance, daily, work, leaderboard`);
    }

    if (message.content === 'lemoney!website') {
        return message.reply('https://your-dashboard-url.com');
    }
});

client.login(process.env.DISCORD_TOKEN);