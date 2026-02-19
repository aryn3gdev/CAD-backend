import { Client, GatewayIntentBits } from 'discord.js';
import { 
  joinVoiceChannel, 
  createAudioPlayer, 
  createAudioResource, 
  AudioPlayerStatus 
} from '@discordjs/voice';
import WebSocket from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Environment variables
const BOT_TOKEN = process.env.BOT_TOKEN;
const VC_CHANNEL_ID = process.env.VC_CHANNEL_ID;
const WS_PORT = process.env.WS_PORT || 8080;

const CODE_SOUNDS = {
  "10-99": "panic.mp3"
};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ]
});

client.once('ready', () => {
  console.log(`Bot logged in as ${client.user.tag}`);
});

// Play sound function
async function playCodeSound(code) {
  if (!CODE_SOUNDS[code]) return;

  const channel = client.channels.cache.get(VC_CHANNEL_ID);
  if (!channel || !channel.isVoiceBased()) {
    console.log("Voice channel not found.");
    return;
  }

  const connection = joinVoiceChannel({
    channelId: VC_CHANNEL_ID,
    guildId: channel.guild.id,
    adapterCreator: channel.guild.voiceAdapterCreator,
    selfDeaf: false
  });

  const player = createAudioPlayer();
  const resource = createAudioResource(
    path.join(__dirname, CODE_SOUNDS[code])
  );

  player.play(resource);
  connection.subscribe(player);

  player.on(AudioPlayerStatus.Idle, () => {
    connection.destroy();
  });
}

// WebSocket server (optional if using internal events)
const wss = new WebSocket.Server({ port: WS_PORT });

wss.on('connection', ws => {
  ws.on('message', msg => {
    const data = JSON.parse(msg.toString());
    if (data.type === "statusUpdate") {
      Received status update: { type: 'statusUpdate', callsign: 'Unit1', status: '10-99' }
      playCodeSound(data.status);
    }
  });
});

client.login(BOT_TOKEN);
