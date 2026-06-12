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

        try {

            const command = require(
                path.join(commandsPath, file)
            );

            if (!command.data || !command.execute) {
                console.log(`[SKIP] ${file} invalid command`);
                continue;
            }

            client.commands.set(
                command.data.name,
                command
            );

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

        try {

            const event = require(
                path.join(eventsPath, file)
            );

            if (!event.name || !event.execute) {
                console.log(`[SKIP] ${file} invalid event`);
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

/* ---------------- DEPLOY SLASH COMMANDS ---------------- */

async function deployCommands() {

    const rest = new REST({ version: "10" })
        .setToken(process.env.TOKEN);

    try {

        console.log(
            `Deploying ${commands.length} commands...`
        );

        await rest.put(
            Routes.applicationCommands(
                process.env.CLIENT_ID
            ),
            { body: commands }
        );

        console.log("Commands deployed.");

    } catch (err) {
        console.error("Deploy error:", err);
    }
}

/* ---------------- READY ---------------- */

client.once("ready", async () => {

    console.log(`${client.user.tag} online`);

    await deployCommands();
});

/* ---------------- LOGIN ---------------- */

client.login(process.env.TOKEN);