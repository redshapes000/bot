const express = require("express");

const app = express();

/* ---------------- BASIC DASHBOARD ---------------- */

app.get("/", (req, res) => {
    res.send(`
        <h1>Limey Dashboard</h1>
        <p>Bot + Dashboard running on Render</p>
        <a href="/status">Status</a>
    `);
});

/* ---------------- STATUS ROUTE ---------------- */

app.get("/status", (req, res) => {
    res.json({
        status: "online",
        bot: "running",
        dashboard: "active"
    });
});

/* ---------------- START SERVER ---------------- */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🌐 Dashboard running on port ${PORT}`);
});