const express = require('express');

const router = express.Router();

const money = (amount) => Number(amount || 0).toLocaleString('en-US');

function layout({ title, active = '', children }) {
    const navItems = [
        ['/', 'Home'],
        ['/dashboard', 'Dashboard'],
        ['/privacy', 'Privacy'],
        ['/terms', 'Terms']
    ];

    return `<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title} | LimeyBot</title>
    <style>
        :root {
            --green-950: #052e1a;
            --green-900: #074326;
            --green-800: #0c5f37;
            --green-700: #12844d;
            --green-600: #18a760;
            --green-100: #dcfce7;
            --green-50: #f0fdf4;
            --white: #ffffff;
            --ink: #113320;
            --muted: #52715f;
            --shadow: 0 24px 60px rgba(5, 46, 26, 0.16);
        }

        * { box-sizing: border-box; }
        body {
            margin: 0;
            min-height: 100vh;
            font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            color: var(--ink);
            background:
                radial-gradient(circle at top left, rgba(24, 167, 96, 0.22), transparent 34rem),
                linear-gradient(135deg, var(--green-50), var(--white) 48%, #e9fff2);
        }

        a { color: inherit; }
        .shell { width: min(1120px, calc(100% - 32px)); margin: 0 auto; }
        .nav {
            position: sticky;
            top: 0;
            z-index: 10;
            backdrop-filter: blur(18px);
            background: rgba(255, 255, 255, 0.82);
            border-bottom: 1px solid rgba(18, 132, 77, 0.12);
        }
        .nav-inner {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 20px;
            padding: 18px 0;
        }
        .brand {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            font-size: 1.25rem;
            font-weight: 900;
            text-decoration: none;
            color: var(--green-900);
        }
        .logo {
            display: grid;
            place-items: center;
            width: 42px;
            height: 42px;
            border-radius: 14px;
            color: var(--white);
            background: linear-gradient(135deg, var(--green-600), var(--green-800));
            box-shadow: 0 10px 25px rgba(18, 132, 77, 0.25);
        }
        .links { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
        .links a, .button {
            border: 1px solid rgba(18, 132, 77, 0.16);
            border-radius: 999px;
            padding: 10px 16px;
            font-weight: 800;
            text-decoration: none;
            transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease;
        }
        .links a { color: var(--green-800); background: rgba(255,255,255,0.72); }
        .links a.active, .links a:hover, .button.primary {
            color: var(--white);
            background: linear-gradient(135deg, var(--green-600), var(--green-800));
            box-shadow: 0 12px 28px rgba(18, 132, 77, 0.22);
        }
        .button:hover, .links a:hover { transform: translateY(-2px); }
        .button.secondary { color: var(--green-800); background: var(--white); }
        main { padding: 54px 0 70px; }
        .hero {
            display: grid;
            grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr);
            gap: 28px;
            align-items: center;
        }
        .panel, .card, .policy {
            border: 1px solid rgba(18, 132, 77, 0.13);
            border-radius: 30px;
            background: rgba(255, 255, 255, 0.86);
            box-shadow: var(--shadow);
        }
        .panel { padding: clamp(30px, 5vw, 58px); }
        .eyebrow { color: var(--green-700); font-weight: 900; letter-spacing: .14em; text-transform: uppercase; }
        h1 { margin: 12px 0 16px; font-size: clamp(2.4rem, 7vw, 5rem); line-height: .95; color: var(--green-950); }
        h2 { margin: 0 0 16px; color: var(--green-900); font-size: clamp(1.7rem, 4vw, 2.5rem); }
        h3 { margin: 0 0 8px; color: var(--green-800); }
        p { color: var(--muted); line-height: 1.7; font-size: 1.05rem; }
        .actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 28px; }
        .stats-grid, .features, .legal-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; margin-top: 28px; }
        .card { padding: 24px; }
        .big { font-size: 2.4rem; font-weight: 950; color: var(--green-800); }
        .leaderboard { display: grid; gap: 12px; margin-top: 18px; }
        .rank {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            padding: 15px 18px;
            border-radius: 18px;
            background: linear-gradient(135deg, var(--green-50), var(--white));
            border: 1px solid rgba(18, 132, 77, 0.12);
            font-weight: 800;
        }
        .policy { padding: clamp(26px, 5vw, 48px); }
        .policy section { border-top: 1px solid rgba(18,132,77,.13); padding-top: 20px; margin-top: 20px; }
        footer { padding: 32px 0; color: var(--muted); text-align: center; }
        .wide { grid-column: span 2; }
        @media (max-width: 760px) {
            .hero, .stats-grid, .features, .legal-grid { grid-template-columns: 1fr; }
            .wide { grid-column: auto; }
            .nav-inner { align-items: flex-start; flex-direction: column; }
            .links { justify-content: flex-start; }
        }
    </style>
</head>
<body>
    <nav class="nav">
        <div class="shell nav-inner">
            <a class="brand" href="/"><span class="logo">🍀</span><span>LimeyBot</span></a>
            <div class="links">
                ${navItems.map(([href, label]) => `<a class="${active === href ? 'active' : ''}" href="${href}">${label}</a>`).join('')}
            </div>
        </div>
    </nav>
    <main class="shell">${children}</main>
    <footer class="shell">© ${new Date().getFullYear()} LimeyBot. Friendly economy tools for Discord communities.</footer>
</body>
</html>`;
}

router.get('/', (req, res) => {
    res.send(layout({
        title: 'Home',
        active: '/',
        children: `
        <section class="hero">
            <div class="panel">
                <div class="eyebrow">Green, clean Discord economy</div>
                <h1>Make your server economy feel alive.</h1>
                <p>LimeyBot adds daily rewards, work payouts, leaderboards, inventories, shops, and a polished web dashboard for your community.</p>
                <div class="actions">
                    <a class="button primary" href="/dashboard">Open Dashboard</a>
                    <a class="button secondary" href="/login">Login with Discord</a>
                </div>
            </div>
            <div class="card">
                <h2>What you get</h2>
                <p>Fast slash commands, anti-spam cooldowns, account balances, and a public leaderboard wrapped in a fresh green-and-white interface.</p>
                <div class="rank"><span>/daily</span><span>Streak rewards</span></div>
                <div class="rank"><span>/shop</span><span>Item boosts</span></div>
                <div class="rank"><span>/leaderboard</span><span>Top users</span></div>
            </div>
        </section>
        <section class="features">
            <div class="card"><h3>Community-first</h3><p>Designed for Discord servers that want fun economy loops without a cluttered interface.</p></div>
            <div class="card"><h3>Simple dashboard</h3><p>See totals, top users, and your own wallet, bank, and inventory after signing in.</p></div>
            <div class="card"><h3>Clean policies</h3><p>Privacy and terms pages are included so visitors can understand how the bot is meant to be used.</p></div>
        </section>`
    }));
});

router.get('/privacy', (req, res) => {
    res.send(layout({
        title: 'Privacy Policy',
        active: '/privacy',
        children: `
        <article class="policy">
            <div class="eyebrow">Privacy Policy</div>
            <h1>Your privacy matters.</h1>
            <p>Last updated: June 14, 2026</p>
            <section><h2>Information we use</h2><p>LimeyBot may store your Discord user ID, economy balances, inventory, cooldown timestamps, and basic Discord profile details when you sign in.</p></section>
            <section><h2>How it is used</h2><p>We use this information to run bot commands, show dashboard statistics, maintain leaderboards, prevent spam, and keep your session active while logged in.</p></section>
            <section><h2>Data sharing</h2><p>We do not sell personal information. Data is only used to operate LimeyBot or when required for security, troubleshooting, legal compliance, or service providers that host the bot.</p></section>
            <section><h2>Your choices</h2><p>You can log out at any time. Server owners or users may request deletion of bot economy data by contacting the bot operator for the server.</p></section>
        </article>`
    }));
});

router.get('/terms', (req, res) => {
    res.send(layout({
        title: 'Terms and Conditions',
        active: '/terms',
        children: `
        <article class="policy">
            <div class="eyebrow">Terms and Conditions</div>
            <h1>Use LimeyBot responsibly.</h1>
            <p>Last updated: June 14, 2026</p>
            <section><h2>Acceptable use</h2><p>Do not abuse commands, exploit bugs, automate spam, harass other users, or use LimeyBot in a way that violates Discord rules or applicable law.</p></section>
            <section><h2>Virtual economy</h2><p>Balances, items, streaks, and leaderboard positions are virtual features with no cash value. The bot operator may adjust or reset data to fix abuse or technical issues.</p></section>
            <section><h2>Availability</h2><p>LimeyBot is provided as-is. Features may change, pause, or stop without notice because hosting, Discord APIs, or maintenance needs can affect availability.</p></section>
            <section><h2>Responsibility</h2><p>Server owners are responsible for deciding whether LimeyBot is appropriate for their community and for communicating local server rules to members.</p></section>
        </article>`
    }));
});

module.exports = { router, layout, money };
