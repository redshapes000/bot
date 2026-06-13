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

/* ---------------- BOT CLIENT ---------------- */

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});

client.commands = new Collection();

/* ---------------- LIVE STATS (FOR DASHBOARD) ---------------- */

global.botStats = {
    servers: 0,
    users: 0,
    ping: 0
};

/* ---------------- UPDATE STATS LOOP ---------------- */

setInterval(() => {

    global.botStats.servers = client.guilds.cache.size;
    global.botStats.users = client.users.cache.size || 0;
    global.botStats.ping = client.ws.ping || 0;

}, 5000);

/* ---------------- COMMAND LOADER ---------------- */

const commands = [];
const commandsPath = path.join(__dirname, "commands");

if (fs.existsSync(commandsPath)) {

    const commandFiles = fs
        .readdirSync(commandsPath)
        .filter(file => file.endsWith(".js"));

    for (const file of commandFiles) {

        const command = require(path.join(commandsPath, file));

        if (!command.data || !command.execute) {
            console.log(`[SKIP] Invalid command: ${file}`);
            continue;
        }

        client.commands.set(command.data.name, command);
        commands.push(command.data.toJSON());

        console.log(`[COMMAND] Loaded ${command.data.name}`);
    }
}

/* ---------------- EVENT LOADER ---------------- */

const eventsPath = path.join(__dirname, "events");

if (fs.existsSync(eventsPath)) {

    const eventFiles = fs
        .readdirSync(eventsPath)
        .filter(file => file.endsWith(".js"));

    for (const file of eventFiles) {

        const event = require(path.join(eventsPath, file));

        if (!event.name || !event.execute) {
            console.log(`[SKIP] Invalid event: ${file}`);
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

        console.log("Slash commands deployed.");

    } catch (err) {
        console.error("Command deploy error:", err);
    }
}

/* ---------------- READY EVENT ---------------- */

client.once("ready", async () => {

    console.log(`🤖 Logged in as ${client.user.tag}`);

    // initialize dashboard stats
    global.botStats.servers = client.guilds.cache.size;
    global.botStats.users = client.users.cache.size || 0;
    global.botStats.ping = client.ws.ping || 0;

    await deployCommands();
});

/* ---------------- LOGIN ---------------- */

client.login(process.env.TOKEN);