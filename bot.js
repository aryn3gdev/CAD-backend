// bot.js
// ES module style
import { Client, GatewayIntentBits } from "discord.js";
import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } from "@discordjs/voice";
import WebSocket, { WebSocketServer } from "ws";
import path from "path";
import { fileURLToPath } from "url";

// Fix __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ====== Environment Variables ======
const BOT_TOKEN = process.env.BOT_TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const VC_CHANNEL_ID = process.env.VC_CHANNEL_ID; // numeric string
const WS_PORT = 8080;

// ====== Code sounds ======
const CODE_SOUNDS = {
  "10-99": "panic.mp3", // Place this mp3 in same folder
  // Add more codes here if needed
};

// ====== Discord Client ======
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
  ]
});

client.once('ready', () => {
  console.log(`Bot logged in as ${client.user.tag}`);
});

// ====== Function to play sound in VC ======
async function playCodeSound(code) {
  if (!CODE_SOUNDS[code]) return;

  const guild = client.guilds.cache.get(GUILD_ID);
  if (!guild) return console.log("Guild not found");

  const channel = guild.channels.cache.get(VC_CHANNEL_ID);
  if (!channel || !channel.isVoiceBased()) return console.log("Voice channel not found");

  // Join VC
  const connection = joinVoiceChannel({
    channelId: VC_CHANNEL_ID,
    guildId: GUILD_ID,
    adapterCreator: guild.voiceAdapterCreator,
    selfDeaf: false,
  });

  // Play audio
  const player = createAudioPlayer();
  const resource = createAudioResource(path.join(__dirname, CODE_SOUNDS[code]));
  player.play(resource);
  connection.subscribe(player);

  player.on(AudioPlayerStatus.Idle, () => {
    connection.destroy(); // Leave VC after sound finishes
  });

  player.on("error", (err) => {
    console.error("Audio player error:", err);
    connection.destroy();
  });
}

// ====== WebSocket Server ======
const wss = new WebSocketServer({ port: WS_PORT });
wss.on('connection', (ws) => {
  console.log('New WebSocket connection');

  ws.on('message', (msg) => {
    try {
      const data = JSON.parse(msg.toString());

      if (data.type === 'statusUpdate') {
        console.log('Received status update:', data);

        if (data.status === '10-99') {
          playCodeSound(data.status);
        }
      }
    } catch (err) {
      console.error('Error parsing WebSocket message:', err);
    }
  });

  ws.on('close', () => {
    console.log('WebSocket disconnected');
  });
});

// ====== Login Discord Bot ======
client.login(BOT_TOKEN).catch(err => console.error("Failed to login:", err));
