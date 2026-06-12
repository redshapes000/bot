require("dotenv").config();

const fs = require("fs");
const path = require("path");

const {
    Client,
    Collection,
    GatewayIntentBits,
    REST,
    Routes
} = require("discord.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});

client.commands = new Collection();

/* ---------------- LOAD COMMANDS ---------------- */

const commands = [];
const commandsPath = path.join(__dirname, "commands");

if (fs.existsSync(commandsPath)) {

    const commandFiles = fs
        .readdirSync(commandsPath)
        .filter(f => f.endsWith(".js"));

    for (const file of commandFiles) {

        const filePath = path.join(commandsPath, file);

        try {
            const command = require(filePath);

            if (!command.data || !command.execute) {
                console.log(`[SKIP] ${file} missing data/execute`);
                continue;
            }

            client.commands.set(command.data.name, command);
            commands.push(command.data.toJSON());

            console.log(`[CMD] Loaded ${command.data.name}`);

        } catch (err) {
            console.error(`[CMD ERROR] ${file}`, err);
        }
    }
}

/* ---------------- LOAD EVENTS ---------------- */

const eventsPath = path.join(__dirname, "events");

if (fs.existsSync(eventsPath)) {

    const eventFiles = fs
        .readdirSync(eventsPath)
        .filter(f => f.endsWith(".js"));

    for (const file of eventFiles) {

        const filePath = path.join(eventsPath, file);

        try {
            const event = require(filePath);

            if (!event.name || !event.execute) {
                console.log(`[SKIP] ${file} missing name/execute`);
                continue;
            }

            if (event.once) {
                client.once(event.name, (...args) =>
                    event.execute(...args, client)
                );
            } else {
                client.on(event.name, (...args) =>
                    event.execute(...args, client)
                );
            }

            console.log(`[EVENT] Loaded ${event.name}`);

        } catch (err) {
            console.error(`[EVENT ERROR] ${file}`, err);
        }
    }
}

/* ---------------- SLASH COMMAND DEPLOY ---------------- */

async function deployCommands() {

    const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

    try {
        console.log(`Deploying ${commands.length} commands...`);

        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );

        console.log("Commands deployed.");
    } catch (err) {
        console.error("Command deploy error:", err);
    }
}

/* ---------------- VOTE WEBHOOK START ---------------- */

function startVoteSystem() {

    const express = require("express");
    const app = express();

    app.use(express.json());

    // DEBUG (shows all incoming requests)
    app.use((req, res, next) => {
        console.log(`[WEBHOOK] ${req.method} ${req.url}`);
        next();
    });

    /* ---------------- TOP.GG ---------------- */
    app.post("/topgg", async (req, res) => {

        if (req.headers.authorization !== process.env.TOPGG_WEBHOOK) {
            return res.sendStatus(401);
        }

        const userId = req.body.user;

        if (!userId) return res.sendStatus(400);

        console.log(`[TOP.GG VOTE] ${userId}`);

        try {
            const user = await client.users.fetch(userId);
            user.send("🎉 Thanks for voting on Top.gg!");
        } catch {}

        res.sendStatus(200);
    });

    /* ---------------- DBL ---------------- */
    app.post("/dbl", async (req, res) => {

        if (req.headers["x-authorization"] !== process.env.DBL_WEBHOOK) {
            return res.sendStatus(401);
        }

        const userId = req.body.user;

        if (!userId) return res.sendStatus(400);

        console.log(`[DBL VOTE] ${userId}`);

        try {
            const user = await client.users.fetch(userId);
            user.send("🎉 Thanks for voting on DBL!");
        } catch {}

        res.sendStatus(200);
    });

    const port = process.env.PORT || 3000;

    app.listen(port, () => {
        console.log(`[WEBHOOK] Listening on port ${port}`);
    });
}

/* ---------------- READY ---------------- */

client.once("ready", async () => {

    console.log(`${client.user.tag} online`);

    await deployCommands();
    startVoteSystem();
});

/* ---------------- LOGIN ---------------- */

client.login(process.env.TOKEN);