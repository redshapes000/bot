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
const session = require('express-session');
const fs = require('fs');
const path = require('path');

// ================= MONGODB =================
mongoose.connect(process.env.MONGO_URI);

// use modular User model
const { User, getUser } = require('./models/User');

// ================= SHOP =================
const shopItems = [
    { id: "lucky_charm", name: "🍀 Lucky Charm", price: 5000, boost: "rob" },
    { id: "laptop", name: "💻 Hacker Laptop", price: 10000, boost: "work" },
    { id: "mask", name: "🎭 Robber Mask", price: 7500, boost: "rob_success" }
];

// ================= ANTI CHEAT SYSTEM =================
const cooldownMap = new Map();
const robCooldown = new Map();

function antiSpam(userId) {
    const now = Date.now();
    const last = cooldownMap.get(userId) || 0;
    if (now - last < 1200) return false;
    cooldownMap.set(userId, now);
    return true;
}

// Use `getUser` from ./models/User

// ================= EXPRESS DASHBOARD =================
const app = express();

app.use(session({
    secret: process.env.SESSION_SECRET || 'dev_secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// auto-load route modules from ./routes
const routesDir = path.join(__dirname, 'routes');
if (fs.existsSync(routesDir)) {
    fs.readdirSync(routesDir)
        .filter(f => f.endsWith('.js'))
        .forEach(file => {
            try {
                const route = require(path.join(routesDir, file));
                app.use('/', route);
            } catch (err) {
                console.error('Failed to load route', file, err);
            }
        });
}

app.listen(process.env.PORT || 3000);

// ================= DISCORD CLIENT =================
const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// ================= SLASH COMMANDS =================
const commands = [

    new SlashCommandBuilder().setName('balance').setDescription('Check balance'),

    new SlashCommandBuilder().setName('daily').setDescription('Claim daily reward'),

    new SlashCommandBuilder().setName('work').setDescription('Work for money'),

    new SlashCommandBuilder()
        .setName('pay')
        .setDescription('Pay another user')
        .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
        .addIntegerOption(o => o.setName('amount').setDescription('Amount').setRequired(true)),

    new SlashCommandBuilder()
        .setName('rob')
        .setDescription('Try robbing a user')
        .addUserOption(o => o.setName('user').setDescription('User').setRequired(true)),

    new SlashCommandBuilder().setName('shop').setDescription('View shop'),

    new SlashCommandBuilder()
        .setName('buy')
        .setDescription('Buy item')
        .addStringOption(o => o.setName('item').setDescription('Item ID').setRequired(true)),

    new SlashCommandBuilder().setName('inventory').setDescription('View inventory'),

    new SlashCommandBuilder().setName('leaderboard').setDescription('Top users'),

    new SlashCommandBuilder().setName('help').setDescription('Commands')

].map(c => c.toJSON());

// ================= REGISTER COMMANDS =================
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commands }
    );
})();

// ================= SLASH HANDLER =================
client.on('interactionCreate', async (i) => {
    if (!i.isChatInputCommand()) return;

    const user = await getUser(i.user.id);
    const now = Date.now();

    if (!antiSpam(i.user.id)) {
        return i.reply({ content: "⏳ Slow down (anti-spam)", ephemeral: true });
    }

    // ================= BALANCE =================
    if (i.commandName === 'balance') {
        return i.reply(`💰 Wallet: $${user.wallet}\n🏦 Bank: $${user.bank}`);
    }

    // ================= DAILY =================
    if (i.commandName === 'daily') {
        const cd = 86400000;

        if (now - user.lastDaily < cd)
            return i.reply({ content: "⏰ Wait for daily", ephemeral: true });

        user.dailyStreak = (now - user.lastDaily < 172800000) ? user.dailyStreak + 1 : 1;

        const reward = 1000 + user.dailyStreak * 200;

        user.wallet += reward;
        user.lastDaily = now;

        await user.save();
        return i.reply(`🎉 +$${reward}`);
    }

    // ================= WORK =================
    if (i.commandName === 'work') {
        const cd = 300000;

        if (now - user.lastWork < cd)
            return i.reply({ content: "⏰ Rest before working", ephemeral: true });

        const amount = Math.floor(Math.random() * 600) + 100;

        user.wallet += amount;
        user.lastWork = now;

        await user.save();
        return i.reply(`💼 +$${amount}`);
    }

    // ================= PAY =================
    if (i.commandName === 'pay') {
        const target = i.options.getUser('user');
        const amount = i.options.getInteger('amount');

        if (target.id === i.user.id)
            return i.reply({ content: "❌ You can't pay yourself", ephemeral: true });

        if (amount <= 0 || user.wallet < amount)
            return i.reply({ content: "❌ Invalid amount", ephemeral: true });

        const receiver = await getUser(target.id);

        user.wallet -= amount;
        receiver.wallet += amount;

        await user.save();
        await receiver.save();

        return i.reply(`💸 Sent $${amount} to ${target.username}`);
    }

    // ================= ROB =================
    if (i.commandName === 'rob') {
        const target = i.options.getUser('user');

        if (target.id === i.user.id)
            return i.reply({ content: "❌ Can't rob yourself", ephemeral: true });

        const cd = 600000;
        if (robCooldown.get(i.user.id) && now - robCooldown.get(i.user.id) < cd)
            return i.reply({ content: "⏳ Wait before robbing again", ephemeral: true });

        robCooldown.set(i.user.id, now);

        const victim = await getUser(target.id);

        const success = Math.random() > 0.5;

        if (!success || victim.wallet < 100) {
            user.wallet -= 200;
            await user.save();
            return i.reply("🚨 Rob failed! You lost $200");
        }

        const stolen = Math.floor(victim.wallet * 0.3);

        victim.wallet -= stolen;
        user.wallet += stolen;

        await user.save();
        await victim.save();

        return i.reply(`🤑 You robbed $${stolen}`);
    }

    // ================= SHOP =================
    if (i.commandName === 'shop') {
        return i.reply(
            shopItems.map(s => `**${s.id}** - ${s.name} - $${s.price}`).join("\n")
        );
    }

    // ================= BUY =================
    if (i.commandName === 'buy') {
        const itemId = i.options.getString('item');

        const item = shopItems.find(x => x.id === itemId);
        if (!item) return i.reply({ content: "❌ Item not found", ephemeral: true });

        if (user.wallet < item.price)
            return i.reply({ content: "❌ Not enough money", ephemeral: true });

        user.wallet -= item.price;
        user.inventory.push(item.id);

        await user.save();

        return i.reply(`🛒 Bought ${item.name}`);
    }

    // ================= INVENTORY =================
    if (i.commandName === 'inventory') {
        return i.reply(
            user.inventory.length
                ? "🎒 " + user.inventory.join(", ")
                : "🎒 Empty inventory"
        );
    }

    // ================= LEADERBOARD =================
    if (i.commandName === 'leaderboard') {
        const top = await User.find().sort({ wallet: -1 }).limit(10);

        return i.reply(
            top.map((u,i)=>`#${i+1} ${u.userId} - $${u.wallet}`).join("\n")
        );
    }

    // ================= HELP =================
    if (i.commandName === 'help') {
        return i.reply(`
/balance
/daily
/work
/pay
/rob
/shop
/buy
/inventory
/leaderboard
        `);
    }
});

client.login(process.env.DISCORD_TOKEN);