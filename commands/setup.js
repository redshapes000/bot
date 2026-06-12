const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const adminCheck =
    require("../checks/adminCheck");

const botAdminCheck =
    require("../checks/botAdminCheck");

const hierarchyCheck =
    require("../checks/hierarchyCheck");

module.exports = {

    data: new SlashCommandBuilder()
        .setName("setup")
        .setDescription(
            "Run security setup"
        ),

    async execute(interaction) {

        if (
            !(await adminCheck(
                interaction
            ))
        ) return;

        if (
            !(await botAdminCheck(
                interaction
            ))
        ) return;

        if (
            !(await hierarchyCheck(
                interaction
            ))
        ) return;

        const guild =
            interaction.guild;

        let quarantine =
            guild.roles.cache.find(
                role =>
                    role.name.toLowerCase() ===
                    "quarantine"
            );

        if (!quarantine) {

            quarantine =
                await guild.roles.create({
                    name:
                        "quarantine",
                    color:
                        0x808080,
                    permissions:
                        [],
                    reason:
                        "Setup command"
                });
        }

        const embed =
            new EmbedBuilder()
                .setTitle(
                    "Setup Complete"
                )
                .setDescription(
                    "✅ Administrator verified\n" +
                    "✅ Bot administrator verified\n" +
                    "✅ Hierarchy verified\n" +
                    "✅ Quarantine role ready"
                );

        await interaction.reply({
            embeds: [embed]
        });
    }
};