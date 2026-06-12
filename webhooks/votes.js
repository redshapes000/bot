const express = require("express");

module.exports = (client) => {
    const app = express();

    app.use(express.json());

    /* ---------------- TOP.GG ---------------- */
    app.post("/topgg", async (req, res) => {

        const auth = req.headers.authorization;

        if (auth !== process.env.TOPGG_WEBHOOK) {
            return res.sendStatus(401);
        }

        const userId = req.body.user;

        if (!userId) return res.sendStatus(400);

        console.log(`[TOP.GG] Vote: ${userId}`);

        try {
            const user = await client.users.fetch(userId);
            user.send("🎉 Thanks for voting on Top.gg! You got rewarded!");
        } catch {}

        res.sendStatus(200);
    });

    /* ---------------- DISCORD BOT LIST ---------------- */
    app.post("/dbl", async (req, res) => {

        const auth = req.headers["x-authorization"];

        if (auth !== process.env.DBL_WEBHOOK) {
            return res.sendStatus(401);
        }

        const userId = req.body.user;

        if (!userId) return res.sendStatus(400);

        console.log(`[DBL] Vote: ${userId}`);

        try {
            const user = await client.users.fetch(userId);
            user.send("🎉 Thanks for voting on DBL! You got rewarded!");
        } catch {}

        res.sendStatus(200);
    });

    /* ---------------- HEALTH CHECK ---------------- */
    app.get("/", (req, res) => {
        res.send("Vote webhook system running");
    });

    const port = process.env.PORT || 3000;

    app.listen(port, () => {
        console.log(`[WEBHOOK] Running on port ${port}`);
    });
};