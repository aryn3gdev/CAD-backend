// bot.js snippet for /vc_active command
import { Client, GatewayIntentBits } from "discord.js";
import { joinVoiceChannel, getVoiceConnection } from "@discordjs/voice";

const ALLOWED_USERS = ["USERID_1", "USERID_2"]; // IDs allowed to use command
const VC_TOGGLES = new Map(); // guildId -> connection

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === 'vc_active') {
    // Only allow certain users
    if (!ALLOWED_USERS.includes(interaction.user.id)) {
      return interaction.reply({ content: "You cannot use this command.", ephemeral: true });
    }

    const channelId = interaction.options.getString('channel_id'); // optional
    const guildId = interaction.guildId;

    // If no channelId, disconnect from all VCs
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

    // Check if bot already in that VC
    const existingConn = getVoiceConnection(guildId);
    if (existingConn && existingConn.joinConfig.channelId === channelId) {
      // Toggle: leave VC
      existingConn.destroy();
      VC_TOGGLES.delete(guildId);
      return interaction.reply({ content: `Left VC ${channelId}.` });
    }

    // Join the VC
    const guild = client.guilds.cache.get(guildId);
    const channel = guild.channels.cache.get(channelId);
    if (!channel || !channel.isVoiceBased()) {
      return interaction.reply({ content: "Invalid voice channel." });
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
