const bedrock = require('bedrock-protocol');

const HOST = 'RustedSurvival.aternos.me';
const PORT = 58137;
const USERNAME = 'MobileBot';

let bot = null;
let afkInterval = null;
let reconnectTimeout = null;

let isConnected = false;
let isConnecting = false;
let tick = 0;

// 🔥 controllo attività
let lastPacketTime = Date.now();

// ======================
// CONNESSIONE
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

  // reset stato se si blocca in connessione
  setTimeout(() => {
    if (!isConnected && isConnecting) {
      console.log("⏱️ Connessione bloccata, reset...");
      isConnecting = false;
    }
  }, 15000);

  bot.on('spawn', () => {
    console.log("✅ Entrato nel server");

    isConnected = true;
    isConnecting = false;
    lastPacketTime = Date.now();

    startAntiAFK();
  });

  bot.on('packet', () => {
    lastPacketTime = Date.now();
  });

  bot.on('disconnect', (packet) => {
    console.log("❌ Disconnesso:", packet?.reason || "unknown");
    handleDisconnect();
  });

  bot.on('error', (err) => {
    console.log("⚠️ Errore:", err.message || err);
    handleDisconnect();
  });

  bot.on('player_list', (packet) => {
    if (!isConnected) return;

    if (packet.records?.type === 'remove') {
      for (const player of packet.records.records) {
        if (player.username === USERNAME) {
          console.log("🚨 Bot rimosso!");
          handleDisconnect();
        }
      }
    }
  });
}

// ======================
// RECONNECT
// ======================
function handleDisconnect() {
  cleanupAll();

  if (reconnectTimeout) return;

  console.log("🔄 Reconnect tra 5s...");

  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    connect();
  }, 5000);
}

// ======================
// WATCHDOG INTELLIGENTE
// ======================
setInterval(() => {
  const now = Date.now();
  const isBotAlive = bot && bot.entity;

  // 🧠 1. bot morto
  if (!isBotAlive && !isConnecting) {
    console.log("🔍 Bot non attivo, reconnect...");
    isConnected = false;
    connect();
    return;
  }

  // 🧠 2. bot freezato (nessun packet da 30s)
  if (isConnected && now - lastPacketTime > 30000) {
    console.log("❄️ Bot freezato, reconnect...");
    handleDisconnect();
  }

}, 15000); // controlla ogni 15s

// ======================
// PULIZIA
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
// ANTI AFK
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

      console.log("🟢 Anti-AFK");
    } catch (e) {}
  }, 30000);
}

function stopAntiAFK() {
  if (afkInterval) {
    clearInterval(afkInterval);
    afkInterval = null;
  }
}
connect();
