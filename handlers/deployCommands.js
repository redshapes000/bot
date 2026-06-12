const fs = require("fs");
const path = require("path");
const { REST, Routes } = require("discord.js");

module.exports = async (client) => {
    const commands = [];

    const commandsPath = path.join(__dirname, "..", "commands");

    const commandFiles = fs
        .readdirSync(commandsPath)
        .filter(file => file.endsWith(".js"));

    for (const file of commandFiles) {
        const command = require(path.join(commandsPath, file));

        if (!command.data) continue;

        commands.push(command.data.toJSON());
    }

    const rest = new REST({ version: "10" })
        .setToken(process.env.TOKEN);

    try {
        console.log(
            `[DEPLOY] Registering ${commands.length} commands...`
        );

        await rest.put(
            Routes.applicationCommands(
                process.env.CLIENT_ID
            ),
            { body: commands }
        );

        console.log("[DEPLOY] Commands registered.");
    } catch (error) {
        console.error(error);
    }
};