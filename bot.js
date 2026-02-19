const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const path = require('path');
const WebSocket = require('ws');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildVoiceStates]
});

// Environment variables
const VC_CHANNEL_ID = process.env.VC_CHANNEL_ID;
const BOT_TOKEN = process.env.BOT_TOKEN;
const WS_PORT = process.env.WS_PORT || 8080;

const CODE_SOUNDS = {
  "10-99": "panic.mp3",
  "10-80": "traffic.mp3",
  "10-11": "disturbance.mp3",
};

// Play a code sound
async function playCodeSound(code) {
  if (!CODE_SOUNDS[code]) return;

  const channel = client.channels.cache.get(VC_CHANNEL_ID);
  if (!channel || !channel.isVoiceBased()) return;

  const connection = joinVoiceChannel({
    channelId: VC_CHANNEL_ID,
    guildId: channel.guild.id,
    adapterCreator: channel.guild.voiceAdapterCreator,
    selfDeaf: false
  });

  const player = createAudioPlayer();
  const resource = createAudioResource(path.join(__dirname, CODE_SOUNDS[code]));

  player.play(resource);
  connection.subscribe(player);

  player.on(AudioPlayerStatus.Idle, () => {
    connection.destroy();
  });
}

// WebSocket server for backend to communicate with bot
const wss = new WebSocket.Server({ port: WS_PORT });

wss.on('connection', ws => {
  ws.on('message', msg => {
    const data = JSON.parse(msg);
    if (data.type === 'statusUpdate' && CODE_SOUNDS[data.status]) {
      playCodeSound(data.status);
    }
  });
});

// Login bot
client.once('ready', () => console.log(`Bot logged in as ${client.user.tag}`));
client.login(BOT_TOKEN);
