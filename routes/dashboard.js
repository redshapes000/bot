const express = require('express');
const router = express.Router();
const { User, getUser } = require('../models/User');

router.get('/', async (req, res) => {
    const users = await User.find();
    const top = await User.find().sort({ wallet: -1 }).limit(10);

    let total = 0;
    users.forEach(u => total += (u.wallet + u.bank));

    const loggedIn = !!(req.session && req.session.user);
    let personalSection = '';
    if (loggedIn) {
        const me = await getUser(req.session.user.id);
        personalSection = `
        <h2>Your Stats</h2>
        <div>${req.session.user.username}</div>
        <div>Wallet: $${me.wallet}</div>
        <div>Bank: $${me.bank}</div>
        <div>Inventory: ${me.inventory.length ? me.inventory.join(', ') : 'Empty'}</div>
        <div><a href="/logout">Logout</a></div>
        `;
    } else {
        personalSection = `<div><a href="/login">Login with Discord</a></div>`;
    }

    res.send(`
    <html>
    <body style="background:#0f1115;color:white;font-family:Arial;text-align:center">
    <h1>💰 Economy Dashboard</h1>

    ${personalSection}

    <div>Total Users: ${users.length}</div>
    <div>Total Economy: $${total}</div>

    <h2>🏆 Leaderboard</h2>
    ${top.map((u,i)=>`#${i+1} ${u.userId} - $${u.wallet}`).join("<br>")}
    </body>
    </html>
    `);
});

module.exports = router;
