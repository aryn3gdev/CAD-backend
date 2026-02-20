import {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
} from "discord.js";

import { REST } from "discord.js";
import { Routes } from "discord.js";
import { joinVoiceChannel, getVoiceConnection } from "@discordjs/voice";

// ===== ENV =====
const BOT_TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID; // Application ID
const GUILD_ID = process.env.GUILD_ID;

// ===== CLIENT =====
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

// ===== COMMAND DEFINITION =====
const vcCommand = new SlashCommandBuilder()
  .setName("vc_active")
  .setDescription("Toggle VC connection")
  .addStringOption(option =>
    option
      .setName("channel_id")
      .setDescription("Voice channel ID")
      .setRequired(false)
  );

// ===== REGISTER + SYNC ON READY =====
client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  try {
    const rest = new REST({ version: "10" }).setToken(BOT_TOKEN);

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: [vcCommand.toJSON()] }
    );

    console.log("Synced /vc_active to guild.");
  } catch (err) {
    console.error("Error syncing commands:", err);
  }
});

// ===== ALLOWED USERS =====
const ALLOWED_USERS = ["758755286647046225"];

// ===== COMMAND HANDLER =====
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "vc_active") {
    if (!ALLOWED_USERS.includes(interaction.user.id)) {
      return interaction.reply({
        content: "You cannot use this command.",
        ephemeral: true,
      });
    }

    const channelId = interaction.options.getString("channel_id");
    const guildId = interaction.guildId;

    if (!channelId) {
      const existing = getVoiceConnection(guildId);
      if (existing) {
        existing.destroy();
        return interaction.reply("Disconnected from VC.");
      } else {
        return interaction.reply("Not connected.");
      }
    }

    const guild = client.guilds.cache.get(guildId);
    const channel = guild.channels.cache.get(channelId);

    if (!channel || !channel.isVoiceBased()) {
      return interaction.reply("Invalid voice channel.");
    }

    const existing = getVoiceConnection(guildId);
    if (existing) {
      existing.destroy();
      return interaction.reply("Disconnected (toggle).");
    }

    joinVoiceChannel({
      channelId: channelId,
      guildId: guildId,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: false,
    });

    return interaction.reply(`Connected to <#${channelId}>`);
  }
});

client.login(BOT_TOKEN);
