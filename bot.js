const bedrock = require('bedrock-protocol');

const HOST = 'RustedSurvival.aternos.me';
const PORT = 58137;
const USERNAME = 'MobileBot';

let bot = null;
let afkInterval = null;
let reconnectTimeout = null;
let loginTimer = null; // Timer per la stabilizzazione

let isConnected = false;    // Vero solo dopo che il bot è spawnato E stabilizzato
let isConnecting = false;   // Vero durante l'handshake iniziale

let lastPacketTime = Date.now();
let tick = 0n;
let pos = { x: 0, y: 0, z: 0 };
let yaw = 0;

// ======================
// FUNZIONE DI CONNESSIONE
// ======================
function connect() {
  // Blocco critico: evita doppie istanze
  if (isConnecting || isConnected) return;

  isConnecting = true;
  console.log(`🔌 [${new Date().toLocaleTimeString()}] Avvio connessione a ${HOST}...`);

  cleanupBot();

  try {
    bot = bedrock.createClient({
      host: HOST,
      port: PORT,
      username: USERNAME,
      offline: true,
      connectTimeout: 20000 // Più tempo per gli handshake lenti di Railway
    });

    bot.on('start_game', (packet) => {
      pos = packet.player_position;
    });

    bot.on('spawn', () => {
      console.log("📨 Ricevuto pacchetto spawn. Stabilizzazione in corso (5s)...");
      
      // SAFE LOGIN: Aspettiamo 5 secondi prima di iniziare a inviare pacchetti Anti-AFK
      // Questo evita il kick immediato per "Protocol Error" su Aternos
      loginTimer = setTimeout(() => {
        console.log("✅ Connessione stabilizzata correttamente!");
        isConnected = true;
        isConnecting = false;
        lastPacketTime = Date.now();
        startAntiAFK();
      }, 5000);
    });

    bot.on('packet', () => {
      lastPacketTime = Date.now();
    });

    bot.on('error', (err) => {
      console.log("⚠️ Errore Client:", err.message);
      // Non chiamiamo handleDisconnect qui, lasciamo che lo faccia l'evento 'close'
    });

    bot.on('close', () => {
      console.log("❌ Connessione chiusa.");
      handleDisconnect();
    });

  } catch (err) {
    console.log("⚠️ Errore creazione client:", err.message);
    isConnecting = false;
    handleDisconnect();
  }
}

// ======================
// GESTIONE RICONNESSIONE
// ======================
function handleDisconnect() {
  cleanupAll();

  if (reconnectTimeout) return;

  // 10 secondi di attesa per permettere ad Aternos/Railway di pulire la vecchia sessione
  console.log("🔄 Riprovo tra 10 secondi...");
  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    connect();
  }, 10000);
}

// ======================
// WATCHDOG (CONTROLLO OGNI 30S)
// ======================
setInterval(() => {
  const now = Date.now();

  // Se sta connettendo o attendendo il reconnect, il watchdog sta fermo
  if (isConnecting || reconnectTimeout) return;

  // 1. Se il bot non è connesso, lo riavvia
  if (!isConnected) {
    console.log("🔍 Watchdog: Bot non rilevato, forzo avvio.");
    connect();
    return;
  }

  // 2. Se è connesso ma non arrivano pacchetti da 90 secondi (Server lag/crash)
  if (isConnected && (now - lastPacketTime > 90000)) {
    console.log("❄️ Watchdog: Timeout pacchetti (90s), riavvio forzato.");
    handleDisconnect();
  }
}, 30000);

// ======================
// PULIZIA RISORSE
// ======================
function cleanupBot() {
  if (loginTimer) clearTimeout(loginTimer);
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
// LOGICA ANTI-AFK
// ======================
function startAntiAFK() {
  if (afkInterval) return;

  afkInterval = setInterval(() => {
    if (!isConnected || !bot) return;

    try {
      tick++;
      yaw = (yaw + 15) % 360;

      // Invio pacchetto input
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

      // Simula braccio
      bot.queue('animate', {
        action_id: 1, 
        runtime_entity_id: 1n 
      });

    } catch (e) {
      console.log("⚠️ Errore invio pacchetto Anti-AFK");
    }
  }, 30000);
}

function stopAntiAFK() {
  if (afkInterval) {
    clearInterval(afkInterval);
    afkInterval = null;
  }
}

// START
connect();
