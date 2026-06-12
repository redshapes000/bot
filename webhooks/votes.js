const express = require("express");

module.exports = (client) => {
    const app = express();

    /* ---------------- MIDDLEWARE ---------------- */

    app.use(express.json());

    // IMPORTANT: FIX FOR DBL (OPTIONS / CORS PRE-FLIGHT)
    app.use((req, res, next) => {

        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
        res.setHeader(
            "Access-Control-Allow-Headers",
            "Content-Type, x-authorization, authorization"
        );

        // Handle preflight
        if (req.method === "OPTIONS") {
            return res.sendStatus(200);
        }

        next();
    });

    // DEBUG LOG ALL REQUESTS
    app.use((req, res, next) => {
        console.log(`[WEBHOOK] ${req.method} ${req.url}`);
        next();
    });

    /* ---------------- TOP.GG ---------------- */

    app.post("/topgg", async (req, res) => {

        const auth = req.headers.authorization;

        if (auth !== process.env.TOPGG_WEBHOOK) {
            return res.sendStatus(401);
        }

        const userId = req.body.user;

        if (!userId) return res.sendStatus(400);

        console.log(`[TOP.GG VOTE] ${userId}`);

        try {
            const user = await client.users.fetch(userId);
            user.send("🎉 Thanks for voting on Top.gg!");
        } catch (err) {
            console.log("DM failed:", err.message);
        }

        res.sendStatus(200);
    });

    /* ---------------- DISCORD BOT LIST (DBL) ---------------- */

    app.post("/dbl", async (req, res) => {

        const auth = req.headers["x-authorization"];

        if (auth !== process.env.DBL_WEBHOOK) {
            return res.sendStatus(401);
        }

        const userId = req.body.user;

        if (!userId) return res.sendStatus(400);

        console.log(`[DBL VOTE] ${userId}`);

        try {
            const user = await client.users.fetch(userId);
            user.send("🎉 Thanks for voting on DBL!");
        } catch (err) {
            console.log("DM failed:", err.message);
        }

        res.sendStatus(200);
    });

    /* ---------------- HEALTH CHECK ---------------- */

    app.get("/", (req, res) => {
        res.send("Vote system is running");
    });

    /* ---------------- START SERVER ---------------- */

    const port = process.env.PORT || 3000;

    app.listen(port, () => {
        console.log(`[WEBHOOK] Server running on port ${port}`);
    });
};
