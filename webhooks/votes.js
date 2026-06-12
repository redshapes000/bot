const express = require("express");

module.exports = (client) => {
    const app = express();

    /* ---------------- 1. CORS + OPTIONS FIX ---------------- */
    app.use((req, res, next) => {

        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
        res.setHeader(
            "Access-Control-Allow-Headers",
            "Content-Type, x-authorization, authorization"
        );

        if (req.method === "OPTIONS") {
            console.log("[WEBHOOK] OPTIONS handled");
            return res.sendStatus(200);
        }

        next();
    });

    /* ---------------- 2. JSON PARSER ---------------- */
    app.use(express.json());

    /* ---------------- 3. DEBUG LOGGER ---------------- */
    app.use((req, res, next) => {
        console.log(`[WEBHOOK] ${req.method} ${req.url}`);
        next();
    });

    /* ---------------- 4. DBL ROUTE ---------------- */
    app.post("/dbl", async (req, res) => {

        console.log("DBL HEADERS:", req.headers);
        console.log("DBL BODY:", req.body);

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

    /* ---------------- SERVER START ---------------- */
    const port = process.env.PORT || 3000;

    app.listen(port, () => {
        console.log(`[WEBHOOK] Running on port ${port}`);
    });
};
