module.exports = async (
    interaction
) => {

    const bot =
        interaction.guild.members.me;

    const highestRole =
        interaction.guild.roles.highest;

    if (
        bot.roles.highest.position <=
        highestRole.position
    ) {

        await interaction.reply({
            content:
                "❌ Move my role above all other roles.",
            ephemeral: true
        });

        return false;
    }

    return true;
};