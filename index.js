require('dotenv').config();

const { 
    Client, 
    GatewayIntentBits, 
    REST, 
    Routes,
    SlashCommandBuilder
} = require('discord.js');

const express = require('express');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');

// ================= MONGODB =================
mongoose.connect(process.env.MONGO_URI);

const userSchema = new mongoose.Schema({
    userId: String,
    wallet: { type: Number, default: 0 },
    bank: { type: Number, default: 0 },

    lastDaily: { type: Number, default: 0 },
    lastWork: { type: Number, default: 0 },

    dailyStreak: { type: Number, default: 0 }
});

const User = mongoose.model('User', userSchema);

// ================= SAFE AMOUNT =================
function safeAmount(amount) {
    const num = parseInt(amount);
    if (isNaN(num) || num <= 0) return null;
    if (num > 1_000_000) return null;
    return num;
}

// ================= EXPRESS =================
const app = express();

app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
}));

app.get('/', async (req, res) => {
    const users = await User.find();
    const top = await User.find().sort({ wallet: -1 }).limit(10);

    let total = 0;
    users.forEach(u => total += (u.wallet + u.bank));

    res.send(`
    <html>
    <head>
        <title>Limey Dashboard</title>
        <style>
            body { background:#0f1115;color:white;font-family:Arial;text-align:center; }
            .card { background:#1a1d24;padding:20px;margin:10px;border-radius:10px; }
            .green { color:#00ff99; }
        </style>
    </head>
    <body>

    <h1 class="green">💰 Limey Dashboard</h1>

    <div class="card">Users: ${users.length}</div>
    <div class="card">Total Economy: $${total}</div>
    <div class="card">Status: 🟢 Online</div>

    <div class="card">
        <h2>🏆 Leaderboard</h2>
        ${top.map((u,i)=>`#${i+1} ${u.userId} - $${u.wallet}`).join("<br>")}
    </div>

    </body>
    </html>
    `);
});

app.listen(process.env.PORT || 3000);

// ================= DISCORD CLIENT =================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const cooldown = new Map();

// ================= GET USER =================
async function getUser(id) {
    let user = await User.findOne({ userId: id });
    if (!user) user = await User.create({ userId: id });
    return user;
}

// ================= SLASH COMMANDS =================
const commands = [
    new SlashCommandBuilder().setName('balance').setDescription('Check balance'),
    new SlashCommandBuilder().setName('daily').setDescription('Claim daily reward'),
    new SlashCommandBuilder().setName('work').setDescription('Work for money'),
    new SlashCommandBuilder().setName('leaderboard').setDescription('Top users'),
    new SlashCommandBuilder().setName('help').setDescription('Commands list')
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log("🔄 Registering slash commands...");
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );
        console.log("✅ Slash commands ready");
    } catch (err) {
        console.error(err);
    }
})();

// ================= PREFIX + SLASH =================

// PREFIX COMMANDS
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const now = Date.now();
    const last = cooldown.get(message.author.id) || 0;
    if (now - last < 1200) return;
    cooldown.set(message.author.id, now);

    const user = await getUser(message.author.id);
    const msg = message.content.toLowerCase();

    // BALANCE
    if (msg === 'limey!balance') {
        return message.reply(`💰 Wallet: $${user.wallet}\n🏦 Bank: $${user.bank}`);
    }

    // DAILY
    if (msg === 'limey!daily') {
        const cooldownTime = 86400000;

        if (now - user.lastDaily < cooldownTime) {
            const hours = Math.ceil((cooldownTime - (now - user.lastDaily)) / 3600000);
            return message.reply(`⏰ Wait ${hours}h`);
        }

        if (now - user.lastDaily < 172800000 && user.lastDaily) {
            user.dailyStreak++;
        } else {
            user.dailyStreak = 1;
        }

        const reward = 1000 + user.dailyStreak * 200;

        user.wallet += reward;
        user.lastDaily = now;

        await user.save();

        return message.reply(`🎉 +$${reward} (Streak ${user.dailyStreak})`);
    }

    // WORK
    if (msg === 'limey!work') {
        const cooldownTime = 30 * 60 * 1000;

        if (now - user.lastWork < cooldownTime) {
            return message.reply(`⏰ You're tired, wait a bit`);
        }

        const amount = Math.floor(Math.random() * 500) + 100;

        user.wallet += amount;
        user.lastWork = now;

        await user.save();

        return message.reply(`💼 You earned $${amount}`);
    }

    // DEPOSIT
    if (msg.startsWith('limey!deposit')) {
        const amount = safeAmount(msg.split(' ')[1]);
        if (!amount) return message.reply("Invalid amount");
        if (user.wallet < amount) return message.reply("Not enough money");

        user.wallet -= amount;
        user.bank += amount;

        await user.save();
        return message.reply(`🏦 Deposited $${amount}`);
    }

    // WITHDRAW
    if (msg.startsWith('limey!withdraw')) {
        const amount = safeAmount(msg.split(' ')[1]);
        if (!amount) return message.reply("Invalid amount");
        if (user.bank < amount) return message.reply("Not enough bank");

        user.bank -= amount;
        user.wallet += amount;

        await user.save();
        return message.reply(`💸 Withdrew $${amount}`);
    }

    // LEADERBOARD
    if (msg === 'limey!leaderboard') {
        const top = await User.find().sort({ wallet: -1 }).limit(10);

        return message.reply(
            "🏆 Leaderboard\n" +
            top.map((u,i)=>`#${i+1} ${u.userId} - $${u.wallet}`).join("\n")
        );
    }

    // HELP
    if (msg === 'limey!help') {
        return message.reply(`
💰 Limey Commands

limey!balance
limey!daily
limey!work
limey!deposit <amount>
limey!withdraw <amount>
limey!leaderboard
limey!website
limey!status
        `);
    }

    if (msg === 'limey!website') {
        return message.reply(process.env.WEBSITE_URL || "Not set");
    }

    if (msg === 'limey!status') {
        return message.reply(process.env.STATUS_URL || "Not set");
    }
});

// SLASH COMMANDS
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const user = await getUser(interaction.user.id);
    const now = Date.now();

    if (interaction.commandName === 'balance') {
        return interaction.reply(`💰 Wallet: $${user.wallet}\n🏦 Bank: $${user.bank}`);
    }

    if (interaction.commandName === 'daily') {
        const cooldownTime = 86400000;

        if (now - user.lastDaily < cooldownTime) {
            const hours = Math.ceil((cooldownTime - (now - user.lastDaily)) / 3600000);
            return interaction.reply({ content: `⏰ Wait ${hours}h`, ephemeral: true });
        }

        if (now - user.lastDaily < 172800000 && user.lastDaily) {
            user.dailyStreak++;
        } else {
            user.dailyStreak = 1;
        }

        const reward = 1000 + user.dailyStreak * 200;

        user.wallet += reward;
        user.lastDaily = now;

        await user.save();

        return interaction.reply(`🎉 +$${reward} (Streak ${user.dailyStreak})`);
    }

    if (interaction.commandName === 'work') {
        const cooldownTime = 30 * 60 * 1000;

        if (now - user.lastWork < cooldownTime) {
            return interaction.reply({ content: "⏰ You're tired, wait a bit", ephemeral: true });
        }

        const amount = Math.floor(Math.random() * 500) + 100;

        user.wallet += amount;
        user.lastWork = now;

        await user.save();

        return interaction.reply(`💼 You earned $${amount}`);
    }

    if (interaction.commandName === 'leaderboard') {
        const top = await User.find().sort({ wallet: -1 }).limit(10);

        return interaction.reply(
            "🏆 Leaderboard\n" +
            top.map((u,i)=>`#${i+1} ${u.userId} - $${u.wallet}`).join("\n")
        );
    }

    if (interaction.commandName === 'help') {
        return interaction.reply(`
💰 Limey Commands

/balance
/daily
/work
/leaderboard
/help
        `);
    }
});

client.login(process.env.DISCORD_TOKEN);