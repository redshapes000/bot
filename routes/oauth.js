const express = require('express');
const axios = require('axios');
const crypto = require('crypto');

const router = express.Router();

const OAUTH_CLIENT_ID = process.env.DISCORD_CLIENT_ID || process.env.CLIENT_ID;
const OAUTH_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || process.env.CLIENT_SECRET;
const OAUTH_REDIRECT = process.env.DISCORD_OAUTH_REDIRECT || `${process.env.BASE_URL || `http://localhost:${process.env.PORT||3000}`}/auth/discord/callback`;

router.get('/login', (req, res) => {
    const state = crypto.randomBytes(8).toString('hex');
    req.session.oauthState = state;
    const params = new URLSearchParams({
        client_id: OAUTH_CLIENT_ID,
        redirect_uri: OAUTH_REDIRECT,
        response_type: 'code',
        scope: 'identify',
        state
    });
    return res.redirect(`https://discord.com/api/oauth2/authorize?${params.toString()}`);
});

router.get('/auth/discord/callback', async (req, res) => {
    try {
        const { code, state } = req.query;
        if (!code || state !== req.session.oauthState) return res.status(400).send('Invalid OAuth state');

        const params = new URLSearchParams();
        params.append('client_id', OAUTH_CLIENT_ID);
        params.append('client_secret', OAUTH_CLIENT_SECRET);
        params.append('grant_type', 'authorization_code');
        params.append('code', code);
        params.append('redirect_uri', OAUTH_REDIRECT);

        const tokenRes = await axios.post('https://discord.com/api/oauth2/token', params.toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const accessToken = tokenRes.data.access_token;
        const userRes = await axios.get('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        req.session.user = {
            id: userRes.data.id,
            username: `${userRes.data.username}#${userRes.data.discriminator}`,
            displayName: userRes.data.global_name || userRes.data.username
        };
        return res.redirect('/dashboard');
    } catch (err) {
        console.error('OAuth callback error', err?.response?.data || err.message || err);
        return res.status(500).send('OAuth Error');
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/'));
});

module.exports = router;
