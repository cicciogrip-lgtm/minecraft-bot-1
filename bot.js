const bedrock = require('bedrock-protocol');

const HOST = 'RustedSurvival.aternos.me';
const PORT = 58137;
const USERNAME = 'MobileBot';

let bot = null;
let afkInterval = null;
let reconnectTimeout = null;
let connectTimeout = null;

let isConnected = false;
let isConnecting = false;
let tick = 0;

// ======================
// CONNESSIONE
// ======================
function connect() {
  if (isConnected || isConnecting) {
    console.log("Già connesso o in connessione...");
    return;
  }

  isConnecting = true;
  console.log("Connessione in corso...");

  cleanupBot();

  bot = bedrock.createClient({
    host: HOST,
    port: PORT,
    username: USERNAME,
    offline: true
  });

  // timeout sicurezza (evita loop bug)
  connectTimeout = setTimeout(() => {
    if (!isConnected) {
      console.log("Timeout connessione, riprovo...");
      forceReconnect();
    }
  }, 10000);

  bot.on('spawn', () => {
    console.log("✅ Bot entrato nel server");

    isConnected = true;
    isConnecting = false;

    clearTimeout(connectTimeout);
    startAntiAFK();
  });

  bot.on('disconnect', (packet) => {
    console.log("❌ Disconnesso:", packet?.reason || "sconosciuto");
    forceReconnect();
  });

  bot.on('error', (err) => {
    console.log("⚠️ Errore:", err.message || err);
    forceReconnect();
  });
}

// ======================
// RECONNECT PULITO
// ======================
function forceReconnect() {
  cleanupAll();

  if (reconnectTimeout) return;

  console.log("🔄 Riconnessione tra 5 secondi...");

  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    connect();
  }, 5000);
}

// ======================
// PULIZIA
// ======================
function cleanupBot() {
  if (bot) {
    try { bot.disconnect(); } catch (e) {}
    bot = null;
  }
}

function cleanupAll() {
  stopAntiAFK();

  if (connectTimeout) {
    clearTimeout(connectTimeout);
    connectTimeout = null;
  }

  isConnected = false;
  isConnecting = false;

  cleanupBot();
}

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
        move_vector: {
          x: (Math.random() - 0.5) * 0.1,
          z: (Math.random() - 0.5) * 0.1
        },
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
