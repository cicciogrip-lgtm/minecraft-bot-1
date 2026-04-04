const bedrock = require('bedrock-protocol');

const HOST = 'RustedSurvival.aternos.me';
const PORT = 58137;
const USERNAME = 'MobileBot';

let bot = null;
let afkInterval = null;
let isConnected = false;
let isConnecting = false;
let tick = 0;

// ======================
function connect() {
  if (isConnected || isConnecting) return;

  isConnecting = true;
  console.log("🔌 Connessione...");

  cleanupBot();

  bot = bedrock.createClient({
    host: HOST,
    port: PORT,
    username: USERNAME,
    offline: true
  });

  bot.on('spawn', () => {
    console.log("✅ Entrato nel server");

    isConnected = true;
    isConnecting = false;

    startAntiAFK();
  });

  bot.on('disconnect', (packet) => {
    console.log("❌ Disconnesso:", packet?.reason || "unknown");
    cleanupAll();
    scheduleReconnect();
  });

  bot.on('error', (err) => {
    console.log("⚠️ Errore:", err.message || err);
    cleanupAll();
    scheduleReconnect();
  });

  // 👇 CONTROLLO PLAYER LIST
  bot.on('player_list', (packet) => {
    if (!isConnected) return;

    if (packet.records && packet.records.type === 'remove') {
      for (const player of packet.records.records) {
        if (player.username === USERNAME) {
          console.log("🚨 Bot rimosso dalla lista!");
          cleanupAll();
          scheduleReconnect();
        }
      }
    }
  });
}

// ======================
function scheduleReconnect() {
  if (isConnecting) return;

  console.log("🔄 Reconnect tra 5s...");
  setTimeout(connect, 5000);
}

// ======================
function cleanupBot() {
  if (bot) {
    try { bot.disconnect(); } catch(e) {}
    bot = null;
  }
}

function cleanupAll() {
  stopAntiAFK();
  isConnected = false;
  isConnecting = false;
  cleanupBot();
}

// ======================
function startAntiAFK() {
  if (afkInterval) return;

  afkInterval = setInterval(() => {
    if (!bot || !bot.entity) return;

    try {
      tick++;

      bot.queue('player_auth_input', {
        pitch: 0,
        yaw: Math.random() * 360,
        head_yaw: Math.random() * 360,
        position: bot.entity.position,
        move_vector: { x: 0, z: 0 },
        input_data: {},
        tick: BigInt(tick),
        delta: { x: 0, y: 0, z: 0 }
      });

      console.log("🟢 AFK");
    } catch(e) {}
  }, 30000);
}

function stopAntiAFK() {
  if (afkInterval) {
    clearInterval(afkInterval);
    afkInterval = null;
  }
}

// ======================
connect();
