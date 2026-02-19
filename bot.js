// bot.js
import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from "discord.js";
import { joinVoiceChannel, getVoiceConnection } from "@discordjs/voice";

// ====== Environment ======
const BOT_TOKEN = process.env.BOT_TOKEN;
const GUILD_ID = process.env.GUILD_ID;

// ====== Discord Client ======
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates]
});

// ====== Allowed Users ======
const ALLOWED_USERS = ["USERID_1", "USERID_2"];
const VC_TOGGLES = new Map(); // guildId -> connection

// ====== Register /vc_active Command ======
const commands = [
  new SlashCommandBuilder()
    .setName('vc_active')
    .setDescription('Toggle bot connection to a VC channel')
    .addStringOption(option =>
      option.setName('channel_id')
        .setDescription('ID of the VC channel to join')
        .setRequired(false))
    .toJSON()
];

const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);

(async () => {
  try {
    console.log('Registering slash commands...');
    await rest.put(
      Routes.applicationGuildCommands(BOT_TOKEN, GUILD_ID),
      { body: commands }
    );
    console.log('Slash commands registered.');
  } catch (err) {
    console.error(err);
  }
})();

// ====== Interaction Handling ======
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === 'vc_active') {
    if (!ALLOWED_USERS.includes(interaction.user.id)) {
      return interaction.reply({ content: "You cannot use this command.", ephemeral: true });
    }

    const channelId = interaction.options.getString('channel_id');
    const guildId = interaction.guildId;

    if (!channelId) {
      const connection = getVoiceConnection(guildId);
      if (connection) {
        connection.destroy();
        VC_TOGGLES.delete(guildId);
        return interaction.reply({ content: "Disconnected from VC(s)." });
      } else {
        return interaction.reply({ content: "Not connected to any VC." });
      }
    }

    const guild = client.guilds.cache.get(guildId);
    const channel = guild.channels.cache.get(channelId);
    if (!channel || !channel.isVoiceBased()) {
      return interaction.reply({ content: "Invalid voice channel." });
    }

    const existingConn = getVoiceConnection(guildId);
    if (existingConn && existingConn.joinConfig.channelId === channelId) {
      existingConn.destroy();
      VC_TOGGLES.delete(guildId);
      return interaction.reply({ content: `Left VC ${channelId}.` });
    }

    const connection = joinVoiceChannel({
      channelId: channelId,
      guildId: guildId,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: false,
    });

    VC_TOGGLES.set(guildId, connection);
    return interaction.reply({ content: `Connected to VC ${channelId}.` });
  }
});

// ====== Ready Event ======
client.once('ready', () => {
  console.log(`Bot logged in as ${client.user.tag}`);
});

client.login(BOT_TOKEN);
