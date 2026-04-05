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
  // 1. Se sta già connettendo o è connesso, ESCE subito.
  if (isConnecting || isConnected) {
    return;
  }

  isConnecting = true;
  console.log(`🔌 [${new Date().toLocaleTimeString()}] Tentativo di connessione...`);

  cleanupBot(); // Pulisce tutto prima di iniziare

  try {
    bot = bedrock.createClient({
      host: HOST,
      port: PORT,
      username: USERNAME,
      offline: true,
      connectTimeout: 15000 
    });

    // Gestione timeout critico: se dopo 30s non è spawnato, resetta lo stato
    const connectionGuard = setTimeout(() => {
      if (isConnecting && !isConnected) {
        console.log("⚠️ Connessione fallita per timeout interno.");
        isConnecting = false;
        handleDisconnect();
      }
    }, 30000);

    bot.on('start_game', (packet) => {
      pos = packet.player_position;
    });

    bot.on('spawn', () => {
      clearTimeout(connectionGuard);
      console.log("✅ Entrato nel server!");
      isConnected = true;
      isConnecting = false;
      lastPacketTime = Date.now();
      startAntiAFK();
    });

    bot.on('packet', () => {
      lastPacketTime = Date.now();
    });

    bot.on('error', (err) => {
      console.log("⚠️ Errore client:", err.message);
      // Non chiamare handleDisconnect qui se isConnecting è true, 
      // lo gestirà il close o il guard
    });

    bot.on('close', () => {
      console.log("❌ Connessione chiusa.");
      handleDisconnect();
    });

  } catch (err) {
    console.log("⚠️ Errore fatale creazione client:", err.message);
    isConnecting = false;
    handleDisconnect();
  }
}

// ======================
// RECONNECT
// ======================
function handleDisconnect() {
  cleanupAll();

  if (reconnectTimeout) return;

  console.log("🔄 Riconnessione tra 10 secondi...");
  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    connect();
  }, 10000);
}

// ======================
// WATCHDOG (CONTROLLO OGNI 20 SECONDI)
// ======================
setInterval(() => {
  const now = Date.now();

  // Se il bot è "perso" nel limbo (non connette, non è connesso, non ha timer)
  if (!isConnected && !isConnecting && !reconnectTimeout) {
    console.log("🔍 Watchdog: Stato inconsistente rilevato, forzo connect.");
    connect();
  }

  // Se è connesso ma il server non risponde (Freeze)
  if (isConnected && (now - lastPacketTime > 60000)) {
    console.log("❄️ Watchdog: Server freezato, riavvio...");
    handleDisconnect();
  }
}, 20000);

// ======================
// PULIZIA MANIACALE
// ======================
function cleanupBot() {
  if (bot) {
    // Rimuove tutti gli event listener per evitare che vecchi eventi 
    // scatenino doppie riconnessioni
    bot.removeAllListeners();
    try {
      bot.close(); 
      bot.terminate(); // Se disponibile nella versione della lib
    } catch(e) {}
    bot = null;
  }
}

function cleanupAll() {
  stopAntiAFK();
  isConnected = false;
  isConnecting = false; // Reset fondamentale
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
      yaw = (yaw + 20) % 360;

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
