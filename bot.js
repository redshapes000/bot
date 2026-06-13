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

    for (const file of fs.readdirSync(commandsPath)) {

        const command = require(path.join(commandsPath, file));

        if (!command.data || !command.execute) continue;

        client.commands.set(command.data.name, command);
        commands.push(command.data.toJSON());
    }
}

/* ---------------- LOAD EVENTS ---------------- */

const eventsPath = path.join(__dirname, "events");

if (fs.existsSync(eventsPath)) {

    for (const file of fs.readdirSync(eventsPath)) {

        const event = require(path.join(eventsPath, file));

        if (event.once) {
            client.once(event.name, (...args) =>
                event.execute(...args, client)
            );
        } else {
            client.on(event.name, (...args) =>
                event.execute(...args, client)
            );
        }
    }
}

/* ---------------- READY + DEPLOY ---------------- */

client.once("ready", async () => {

    console.log(`${client.user.tag} is online`);

    const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

    try {
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );

        console.log("Slash commands deployed");
    } catch (err) {
        console.error(err);
    }
});

client.login(process.env.TOKEN);