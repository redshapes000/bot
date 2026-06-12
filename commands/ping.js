const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

module.exports = {

    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription(
            "Check bot latency"
        ),

    async execute(interaction) {

        const sent =
            await interaction.reply({
                content:
                    "🏓 Pinging...",
                fetchReply: true
            });

        const botPing =
            sent.createdTimestamp -
            interaction.createdTimestamp;

        const apiPing =
            interaction.client.ws.ping;

        const embed =
            new EmbedBuilder()
                .setTitle("🏓 Pong!")
                .addFields(
                    {
                        name:
                            "Bot Latency",
                        value:
                            `${botPing}ms`,
                        inline: true
                    },
                    {
                        name:
                            "API Latency",
                        value:
                            `${apiPing}ms`,
                        inline: true
                    }
                );

        await interaction.editReply({
            content: "",
            embeds: [embed]
        });
    }
};