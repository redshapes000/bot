const express = require('express');
const { User, getUser } = require('../models/User');
const { layout, money } = require('./pages');

const router = express.Router();

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('\"', '&quot;')
        .replaceAll("'", '&#39;');
}

function leaderboardName(user) {
    return escapeHtml(user.displayName || user.userId);
}

router.get('/dashboard', async (req, res) => {
    const users = await User.find();
    const top = await User.find().sort({ wallet: -1 }).limit(10);
    const total = users.reduce((sum, user) => sum + user.wallet + user.bank, 0);

    const loggedIn = Boolean(req.session && req.session.user);
    let personalSection = `
        <div class="card">
            <h2>Your Stats</h2>
            <p>Sign in with Discord to view your wallet, bank, and inventory.</p>
            <a class="button primary" href="/login">Login with Discord</a>
        </div>`;

    if (loggedIn) {
        const me = await getUser(req.session.user.id, req.session.user);
        personalSection = `
        <div class="card">
            <h2>Your Stats</h2>
            <p><strong>${escapeHtml(me.displayName || req.session.user.username)}</strong></p>
            <div class="rank"><span>Wallet</span><span>$${money(me.wallet)}</span></div>
            <div class="rank"><span>Bank</span><span>$${money(me.bank)}</span></div>
            <div class="rank"><span>Inventory</span><span>${me.inventory.length ? me.inventory.join(', ') : 'Empty'}</span></div>
            <div class="actions"><a class="button secondary" href="/logout">Logout</a></div>
        </div>`;
    }

    res.send(layout({
        title: 'Dashboard',
        active: '/dashboard',
        children: `
        <section class="panel">
            <div class="eyebrow">Live economy dashboard</div>
            <h1>Server economy at a glance.</h1>
            <p>Track total users, combined economy value, leaderboard standings, and your personal Discord economy profile.</p>
            <div class="stats-grid">
                <div class="card"><h3>Total Users</h3><div class="big">${money(users.length)}</div></div>
                <div class="card"><h3>Total Economy</h3><div class="big">$${money(total)}</div></div>
                <div class="card"><h3>Top Players</h3><div class="big">${money(top.length)}</div></div>
            </div>
        </section>
        <section class="legal-grid">
            ${personalSection}
            <div class="card wide">
                <h2>🏆 Leaderboard</h2>
                <div class="leaderboard">
                    ${top.length ? top.map((user, index) => `<div class="rank"><span>#${index + 1} ${leaderboardName(user)}</span><span>$${money(user.wallet)}</span></div>`).join('') : '<p>No users yet. Run some commands to start the economy.</p>'}
                </div>
            </div>
        </section>`
    }));
});

module.exports = router;
