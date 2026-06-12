const {
    PermissionsBitField
} = require("discord.js");

module.exports = async (
    interaction
) => {

    if (
        !interaction.member.permissions.has(
            PermissionsBitField.Flags.Administrator
        )
    ) {

        await interaction.reply({
            content:
                "❌ You need Administrator.",
            ephemeral: true
        });

        return false;
    }

    return true;
};