import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from "discord.js";
import { joinVoiceChannel, getVoiceConnection } from "@discordjs/voice";

// ===== ENV =====
const BOT_TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID; // <-- ADD THIS
const GUILD_ID = process.env.GUILD_ID;

// ===== CLIENT =====
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates]
});

// ===== REGISTER COMMAND =====
const commands = [
  new SlashCommandBuilder()
    .setName('vc_active')
    .setDescription('Toggle bot VC connection')
    .addStringOption(option =>
      option
        .setName('channel_id')
        .setDescription('Voice Channel ID to join')
        .setRequired(false)
    )
    .toJSON()
];

const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);

async function registerCommands() {
  try {
    console.log("Registering slash command...");

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );

    console.log("Slash command registered successfully.");
  } catch (error) {
    console.error(error);
  }
}
