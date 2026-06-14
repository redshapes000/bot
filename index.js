require('dotenv').config();

const { Client } = require('discord.js-selfbot-v13');
const fs = require('fs');
const express = require('express');
const mongoose = require('mongoose');

// ---------------- MONGODB ----------------
mongoose.connect(process.env.MONGO_URI);

const userSchema = new mongoose.Schema({
    userId: String,
    wallet: Number,
    bank: Number,
    lastDaily: Number,
    lastWork: Number
});

const User = mongoose.model('User', userSchema);

// ---------------- WEB SERVER ----------------
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', async (req, res) => {
    const data = await User.find();

    let users = data.length;
    let totalMoney = 0;

    for (const u of data) {
        totalMoney += (u.wallet || 0) + (u.bank || 0);
    }

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

client.on('ready', async () => {
    console.log(`Client is ready!`);
});

// ---------------- HELPERS (MINIMAL CHANGE) ----------------
async function getUserData(userId) {
    let user = await User.findOne({ userId });

    if (!user) {
        user = await User.create({
            userId,
            wallet: 0,
            bank: 0,
            lastDaily: 0,
            lastWork: 0
        });
    }

    return user;
}

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const user = await getUserData(message.author.id);

    if (message.content === 'lemoney!balance') {
        return message.reply(`💰 Wallet: ${user.wallet}\n🏦 Bank: ${user.bank}`);
    }

    if (message.content === 'lemoney!daily') {
        const now = Date.now();
        const cooldown = 24 * 60 * 60 * 1000;

        if (now - user.lastDaily < cooldown) {
            const hours = Math.ceil((cooldown - (now - user.lastDaily)) / 3600000);
            return message.reply(`⏰ You can claim daily again in ${hours} hours.`);
        }

        user.wallet += 1000;
        user.lastDaily = now;

        await user.save();

        return message.reply('🎉 You claimed your daily reward of $1,000!');
    }

    if (message.content === 'lemoney!work') {
        const cooldown = 30 * 60 * 1000;
        const now = Date.now();

        if (now - user.lastWork < cooldown) {
            const remaining = cooldown - (now - user.lastWork);
            const minutes = Math.floor(remaining / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);

            return message.reply(`⏰ You can work again in ${minutes}m ${seconds}s.`);
        }

        const amount = Math.floor(Math.random() * 500) + 100;

        user.wallet += amount;
        user.lastWork = now;

        await user.save();

        return message.reply(`💼 You worked and earned $${amount}!`);
    }

    if (message.content === 'lemoney!ping') {
        const sent = Date.now();

        const msg = await message.reply('🏓 Pinging...');

        const latency = Date.now() - sent;

        return msg.edit(`🏓 Pong! Latency: ${latency}ms`);
    }

    if (message.content.startsWith('lemoney!deposit ')) {
        const amount = parseInt(message.content.split(' ')[1]);

        if (isNaN(amount) || amount <= 0)
            return message.reply('Invalid amount.');

        if (user.wallet < amount)
            return message.reply('Not enough money.');

        user.wallet -= amount;
        user.bank += amount;

        await user.save();

        return message.reply(`🏦 Deposited $${amount}.`);
    }

    if (message.content.startsWith('lemoney!withdraw ')) {
        const amount = parseInt(message.content.split(' ')[1]);

        if (isNaN(amount) || amount <= 0)
            return message.reply('Invalid amount.');

        if (user.bank < amount)
            return message.reply('Not enough money in bank.');

        user.bank -= amount;
        user.wallet += amount;

        await user.save();

        return message.reply(`💸 Withdrew $${amount}.`);
    }

    if (message.content === 'lemoney!help') {
        return message.reply(`
💰 Lemoney Commands

📊 Economy
• lemoney!balance
• lemoney!daily
• lemoney!work

🏦 Banking
• lemoney!deposit <amount>
• lemoney!withdraw <amount>

ℹ️ Utility
• lemoney!help
• lemoney!website
• lemoney!ping
        `);
    }

    if (message.content === 'lemoney!website') {
        return message.reply(`https://limeydiscordbot.onrender.com`);
    }
});

client.login(process.env.DISCORD_TOKEN);
