const bedrock = require('bedrock-protocol');

const HOST = 'RustedSurvival.aternos.me';
const PORT = 58137;
const USERNAME = 'MobileBot';

let bot = null;
let afkInterval = null;
let reconnectTimeout = null;

let isConnected = false;
let isConnecting = false;

let lastPacketTime = Date.now();
let tick = 0n;
let pos = { x: 0, y: 0, z: 0 };
let yaw = 0;

// ======================
// CONNESSIONE
// ======================
function connect() {
  // BLOCCA la connessione se siamo già dentro o se stiamo già provando a connetterci
  if (isConnected || isConnecting) return;

  isConnecting = true;
  lastPacketTime = Date.now(); 
  console.log(`🔌 Tentativo di connessione a ${HOST}...`);

  cleanupBot();

  try {
    bot = bedrock.createClient({
      host: HOST,
      port: PORT,
      username: USERNAME,
      offline: true,
      connectTimeout: 10000 
    });
  } catch (err) {
    console.log("⚠️ Errore creazione client:", err.message);
    isConnecting = false; // Reset immediato se fallisce la creazione
    handleDisconnect();
    return;
  }

  bot.on('start_game', (packet) => {
    pos = packet.player_position;
  });

  bot.on('spawn', () => {
    console.log("✅ Entrato nel server!");
    isConnected = true;
    isConnecting = false; // Ora siamo ufficialmente dentro
    lastPacketTime = Date.now();
    startAntiAFK();
  });

  bot.on('packet', () => {
    lastPacketTime = Date.now();
  });

  bot.on('error', (err) => {
    console.log("⚠️ Errore di rete:", err.message);
    handleDisconnect();
  });

  bot.on('close', () => {
    console.log("❌ Connessione chiusa.");
    handleDisconnect();
  });
}

// ======================
// RECONNECT (SICURO)
// ======================
function handleDisconnect() {
  cleanupAll();

  // Se c'è già un timer attivo per riconnettersi, non farne un altro!
  if (reconnectTimeout) return;

  console.log("🔄 Riconnessione programmata tra 10s...");
  
  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null; // Libera il timer prima di chiamare connect
    connect();
  }, 10000); 
}

// ======================
// WATCHDOG (NON AGGRESSIVO)
// ======================
setInterval(() => {
  const now = Date.now();

  // 1. Se il bot non è connesso, non sta connettendo E non c'è un timer di attesa
  if (!isConnected && !isConnecting && !reconnectTimeout) {
    console.log("🔍 Watchdog: Bot fermo, avvio connessione...");
    connect();
    return;
  }

  // 2. Se è "connesso" ma il server non invia nulla da 45s (Timeout)
  if (isConnected && (now - lastPacketTime > 45000)) {
    console.log("❄️ Watchdog: Timeout pacchetti, forzo riavvio...");
    handleDisconnect();
  }
}, 15000);

// ======================
// PULIZIA
// ======================
function cleanupBot() {
  if (bot) {
    bot.removeAllListeners(); 
    try { bot.close(); } catch(e) {}
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
    if (!isConnected || !bot) return;

    try {
      tick++;
      yaw = (yaw + 15) % 360;

      bot.queue('player_auth_input', {
        pitch: 0,
        yaw: yaw,
        head_yaw: yaw,
        position: pos,
        move_vector: { x: 0, z: 0 },
        input_data: 0n,
        input_mode: 'mouse',
        play_mode: 'screen',
        interaction_model: 'touch',
        tick: tick,
        delta: { x: 0, y: 0, z: 0 }
      });
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
