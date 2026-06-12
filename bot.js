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

/* ---------------- COMMAND LOADER ---------------- */

const commands = [];
const commandsPath = path.join(__dirname, "commands");

const commandFiles = fs
    .readdirSync(commandsPath)
    .filter(file => file.endsWith(".js"));

for (const file of commandFiles) {

    try {

        const command = require(
            path.join(commandsPath, file)
        );

        if (!command.data || !command.execute) {
            console.log(
                `[ERROR] ${file} missing data or execute`
            );
            continue;
        }

        client.commands.set(
            command.data.name,
            command
        );

        commands.push(
            command.data.toJSON()
        );

        console.log(
            `[COMMAND] Loaded ${command.data.name}`
        );

    } catch (err) {
        console.error(
            `[ERROR] Failed loading ${file}`
        );

        console.error(err);
    }
}

/* ---------------- EVENT LOADER ---------------- */

const eventsPath = path.join(__dirname, "events");

const eventFiles = fs
    .readdirSync(eventsPath)
    .filter(file => file.endsWith(".js"));

for (const file of eventFiles) {

    const event = require(
        path.join(eventsPath, file)
    );

    if (event.once) {

        client.once(
            event.name,
            (...args) =>
                event.execute(
                    ...args,
                    client
                )
        );

    } else {

        client.on(
            event.name,
            (...args) =>
                event.execute(
                    ...args,
                    client
                )
        );
    }

    console.log(
        `[EVENT] Loaded ${event.name}`
    );
}

/* ---------------- READY DEPLOY ---------------- */

client.once("ready", async () => {

    console.log(
        `${client.user.tag} online`
    );

    const rest = new REST({
        version: "10"
    }).setToken(
        process.env.TOKEN
    );

    try {

        console.log(
            `Deploying ${commands.length} commands...`
        );

        await rest.put(
            Routes.applicationCommands(
                process.env.CLIENT_ID
            ),
            {
                body: commands
            }
        );

        console.log(
            "Commands deployed."
        );

    } catch (err) {

        console.error(err);
    }
});

client.login(
    process.env.TOKEN
);