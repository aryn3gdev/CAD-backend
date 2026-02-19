// bot.js (ES module)
import { Client, GatewayIntentBits } from "discord.js";
import { joinVoiceChannel, getVoiceConnection } from "@discordjs/voice";

// ====== Environment Variables ======
const BOT_TOKEN = process.env.BOT_TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const VC_CHANNEL_ID = process.env.VC_CHANNEL_ID;

// ====== Discord Client ======
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ]
});

// ====== /vc_active Command ======
const ALLOWED_USERS = ["USERID_1", "USERID_2"];
const VC_TOGGLES = new Map();

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

// ====== Login ======
client.once('ready', () => {
  console.log(`Bot logged in as ${client.user.tag}`);
});

client.login(BOT_TOKEN);
