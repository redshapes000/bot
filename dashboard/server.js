const express = require("express");
const session = require("express-session");
const passport = require("passport");
const DiscordStrategy = require("passport-discord").Strategy;
const path = require("path");
const fs = require("fs");

const app = express();

/* ---------------- VIEW ENGINE ---------------- */

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

/* ---------------- SESSION ---------------- */

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));

/* ---------------- PASSPORT ---------------- */

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(new DiscordStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: process.env.REDIRECT_URI,
    scope: ["identify", "guilds"]
}, (accessToken, refreshToken, profile, done) => {
    process.nextTick(() => done(null, profile));
}));

app.use(passport.initialize());
app.use(passport.session());

/* ---------------- AUTH ---------------- */

function checkAuth(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.redirect("/");
}

/* ---------------- ROUTES ---------------- */

app.get("/", (req, res) => {
    res.render("index", { user: req.user });
});

app.get("/login",
    passport.authenticate("discord")
);

app.get("/callback",
    passport.authenticate("discord", {
        failureRedirect: "/"
    }),
    (req, res) => {
        res.redirect("/dashboard");
    }
);

app.get("/logout", (req, res) => {
    req.logout(() => {});
    res.redirect("/");
});

/* ---------------- DASHBOARD ---------------- */

app.get("/dashboard", checkAuth, (req, res) => {

    const guilds = req.user.guilds.filter(g =>
        (g.permissions & 0x20) === 0x20 // MANAGE_GUILD
    );

    res.render("dashboard", {
        user: req.user,
        guilds,
        stats: global.botStats
    });
});

/* ---------------- SERVER PAGE ---------------- */

function isOwner(user, guildId) {
    return user.guilds.some(g =>
        g.id === guildId && (g.permissions & 0x20)
    );
}

app.get("/server/:id", checkAuth, (req, res) => {

    const guildId = req.params.id;

    if (!isOwner(req.user, guildId)) {
        return res.send("❌ No permission");
    }

    const settingsFile = path.join(__dirname, "data/settings.json");

    let settings = {};

    if (fs.existsSync(settingsFile)) {
        settings = JSON.parse(fs.readFileSync(settingsFile));
    }

    res.render("server", {
        guildId,
        settings: settings[guildId] || {}
    });
});

/* ---------------- SAVE SETTINGS ---------------- */

app.post("/server/:id", checkAuth, express.urlencoded({ extended: true }), (req, res) => {

    const guildId = req.params.id;

    const settingsFile = path.join(__dirname, "data/settings.json");

    let settings = {};

    if (fs.existsSync(settingsFile)) {
        settings = JSON.parse(fs.readFileSync(settingsFile));
    }

    settings[guildId] = req.body;

    fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2));

    res.redirect("/server/" + guildId);
});

/* ---------------- START ---------------- */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🌐 Dashboard running on ${PORT}`);
});