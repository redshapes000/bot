const {
    PermissionsBitField
} = require("discord.js");

module.exports = async (
    interaction
) => {

    const bot =
        interaction.guild.members.me;

    if (
        !bot.permissions.has(
            PermissionsBitField.Flags.Administrator
        )
    ) {

        await interaction.reply({
            content:
                "❌ Bot needs Administrator permission.",
            ephemeral: true
        });

        return false;
    }

    return true;
};