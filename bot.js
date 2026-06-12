require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  EmbedBuilder,
  REST,
  Routes,
} = require("discord.js");

const fs = require("fs");

/* ---------------- ENV ---------------- */
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

/* ---------------- CLIENT ---------------- */
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

/* ---------------- CONFIG ---------------- */
const CONFIG_FILE = "./config.json";

function loadConfig() {
  if (!fs.existsSync(CONFIG_FILE)) return {};
  return JSON.parse(fs.readFileSync(CONFIG_FILE));
}

function saveConfig(data) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2));
}

let config = loadConfig();

/* ---------------- DEPLOY COMMANDS ---------------- */
async function deployCommands() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);

  const commands = [
    {
      name: "setup",
      description: "Run Limey's auto setup",
    },
  ];

  try {
    console.log("🚀 Deploying slash commands...");

    await rest.put(Routes.applicationCommands(CLIENT_ID), {
      body: commands,
    });

    console.log("✅ Slash commands deployed");
  } catch (err) {
    console.error("❌ Deploy error:", err);
  }
}

/* ---------------- READY ---------------- */
client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);
  await deployCommands();
});

/* ---------------- AUTO SETUP CORE ---------------- */
async function autoSetup(interaction) {
  const guild = interaction.guild;
  const bot = guild.members.me;
  const gid = guild.id;

  config[gid] = {
    antiRaid: true,
    quarantineRole: null,
  };

  /* ---------------- BOT ADMIN CHECK ---------------- */
  if (!bot.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return interaction.reply({
      content:
        "❌ I need **Administrator permission** to run setup.\nPlease enable it and try again.",
      ephemeral: true,
    });
  }

  /* ---------------- ROLE HIERARCHY CHECK ---------------- */
  if (guild.roles.highest.position >= bot.roles.highest.position) {
    return interaction.reply({
      content:
        "❌ My role is not high enough in the hierarchy.\nMove my bot role ABOVE all roles.",
      ephemeral: true,
    });
  }

  /* ---------------- CREATE / FIND QUARANTINE ROLE ---------------- */
  let quarantineRole = guild.roles.cache.find(
    (r) => r.name.toLowerCase() === "Quarantine"
  );

  if (!quarantineRole) {
    quarantineRole = await guild.roles.create({
      name: "Quarantine",
      color: 0xFF0000,
      reason: "Limey's Auto Setup - Quarantine Role",
      permissions: [],
    });
  }

  /* ---------------- SET QUARANTINE PERMISSIONS ---------------- */
  await quarantineRole.setPermissions([
    PermissionsBitField.Flags.ViewChannel,
    PermissionsBitField.Flags.ReadMessageHistory,
  ]);

  /* ---------------- FINAL HIERARCHY CHECK ---------------- */
  if (quarantineRole.position >= bot.roles.highest.position) {
    return interaction.reply({
      content:
        "❌ Quarantine role is ABOVE my role.\nMove my bot role higher and run setup again.",
      ephemeral: true,
    });
  }

  /* ---------------- SAVE CONFIG ---------------- */
  config[gid].quarantineRole = quarantineRole.id;
  saveConfig(config);

  /* ---------------- DONE ---------------- */
  const embed = new EmbedBuilder()
    .setTitle("🛡️ Limey's Auto Setup Complete")
    .setDescription(
      "✅ Administrator verified\n" +
      "✅ Bot permissions OK\n" +
      "✅ Role hierarchy OK\n" +
      "✅ Quarantine role created & secured\n\n" +
      "🔒 Protection system initialized"
    )
    .setColor("Green");

  return interaction.reply({
    embeds: [embed],
    ephemeral: true,
  });
}

/* ---------------- INTERACTIONS ---------------- */
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "setup") {
    const guild = interaction.guild;
    const bot = guild.members.me;

    /* ---------------- USER ADMIN CHECK ---------------- */
    if (
      !interaction.member.permissions.has(
        PermissionsBitField.Flags.Administrator
      )
    ) {
      return interaction.reply({
        content: "❌ You need **Administrator** to run setup.",
        ephemeral: true,
      });
    }

    /* ---------------- BOT ADMIN CHECK ---------------- */
    if (!bot.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({
        content:
          "❌ I need **Administrator permission** to run setup.",
        ephemeral: true,
      });
    }

    /* ---------------- RUN SETUP ---------------- */
    return autoSetup(interaction);
  }
});

/* ---------------- LOGIN ---------------- */
client.login(TOKEN);