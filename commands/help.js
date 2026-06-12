const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Show all available commands"),

    async execute(interaction) {

        const commands =
            interaction.client.commands;

        const embed =
            new EmbedBuilder()
                .setTitle("📚 Help")
                .setDescription(
                    "Available commands:"
                );

        commands.forEach(command => {

            embed.addFields({
                name: `/${command.data.name}`,
                value:
                    command.data.description ||
                    "No description",
                inline: false
            });

        });

        embed.setFooter({
            text:
                `${commands.size} command(s)`
        });

        await interaction.reply({
            embeds: [embed]
        });
    }
};