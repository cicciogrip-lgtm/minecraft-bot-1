const bedrock = require('bedrock-protocol');

const HOST = 'RustedSurvival.aternos.me';
const PORT = 58137;
const USERNAME = 'MobileBot';

let bot = null;
let afkTimeout = null;
let reconnectTimeout = null;

let isConnected = false;
let isConnecting = false;
let lastPacketTime = Date.now();
let tick = 0n;

let pos = { x: 0, y: 100, z: 0 };
let yaw = 0;
let entityId = 0n;

// ======================
// CONNESSIONE
// ======================
function connect() {
  if (isConnected) return;
  if (isConnecting && (Date.now() - lastPacketTime < 30000)) return;

  isConnecting = true;
  lastPacketTime = Date.now();
  console.log(`🔌 [${new Date().toLocaleTimeString()}] Connessione...`);

  cleanupBot();

  try {
    bot = bedrock.createClient({
      host: 'RustedSurvival.aternos.me',
      port: 58137,
      username: BotAfk,
      offline: true,
      version: '1.26.13', // 🔥 sempre aggiornato
      connectTimeout: 20000
    });

    // ======================
    // DATI INIZIALI
    // ======================
    bot.on('start_game', (packet) => {
      if (packet.player_position) {
        pos = packet.player_position;
      }
      entityId = packet.runtime_entity_id;

      // 🔥 PACCHETTI IMPORTANTI (fix kick)
      bot.queue('client_cache_status', { enabled: false });
      bot.queue('request_chunk_radius', { radius: 8, max_radius: 8 });
    });

    bot.on('move_player', (packet) => {
      if (packet.runtime_id === entityId && packet.position) {
        pos = packet.position;
      }
    });

    // ======================
    // SPAWN
    // ======================
    bot.on('spawn', () => {
      console.log("📨 Spawnato!");

      isConnected = true;
      isConnecting = false;
      lastPacketTime = Date.now();

      // ⏱️ Ritardo anti-kick
      setTimeout(() => {
        console.log("🚀 Avvio Anti-AFK...");
        startAntiAFK();
      }, 2000);
    });

    bot.on('packet', () => {
      lastPacketTime = Date.now();
    });

    // ======================
    // DEBUG KICK (IMPORTANTISSIMO)
    // ======================
    bot.on('disconnect', (packet) => {
      console.log("🚪 DISCONNECT DEBUG:");
      console.log(packet);
    });

    bot.on('error', (err) => {
      console.log("⚠️ Errore:", err.message);
      handleDisconnect();
    });

    bot.on('close', () => {
      console.log("❌ Connessione chiusa.");
      handleDisconnect();
    });

  } catch (err) {
    handleDisconnect();
  }
}

// ======================
// RICONNESSIONE
// ======================
function handleDisconnect() {
  cleanupAll();

  if (reconnectTimeout) return;

  console.log("🔄 Riprovo tra 10 secondi...");
  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    connect();
  }, 10000);
}

// ======================
// WATCHDOG (TENUTO)
// ======================
setInterval(() => {
  const now = Date.now();

  if (isConnected && (now - lastPacketTime > 120000)) {
    console.log("❄️ Timeout Watchdog → riavvio...");
    handleDisconnect();
    return;
  }

  if (!isConnected && !reconnectTimeout) {
    isConnecting = false;
    connect();
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
// ANTI-AFK AVANZATO
// ======================
function startAntiAFK() {
  stopAntiAFK();

  const sendMovement = () => {
    if (!isConnected || !bot) return;

    try {
      tick++;

      // Rotazione casuale
      yaw += (Math.random() * 60 - 30);

      const rand = () => (Math.random() - 0.5) * 0.2;

      bot.queue('player_auth_input', {
        pitch: 0,
        yaw: yaw,
        head_yaw: yaw,
        position: {
          x: pos.x || 0,
          y: pos.y || 100,
          z: pos.z || 0
        },
        move_vector: { x: rand(), z: rand() },
        analog_move_vector: { x: rand(), z: rand() },
        input_data: 0n,
        input_mode: 'mouse',
        play_mode: 'screen',
        interaction_model: 'touch',
        tick: tick,
        delta: { x: 0, y: 0, z: 0 }
      });

      // Azioni casuali
      if (entityId !== 0n && Math.random() < 0.5) {
        bot.queue('animate', {
          action_id: 1,
          runtime_entity_id: entityId
        });
      }

      console.log("🟢 Anti-AFK inviato");

    } catch (e) {}
  };

  // Primo invio immediato
  sendMovement();

  // Loop variabile
  function scheduleNext() {
    const delay = 15000 + Math.random() * 15000;

    afkTimeout = setTimeout(() => {
      sendMovement();
      scheduleNext();
    }, delay);
  }

  scheduleNext();
}

function stopAntiAFK() {
  if (afkTimeout) {
    clearTimeout(afkTimeout);
    afkTimeout = null;
  }
}

// ======================
connect();
