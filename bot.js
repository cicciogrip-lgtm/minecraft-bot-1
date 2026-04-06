const bedrock = require('bedrock-protocol');

const HOST = 'RustedSurvival.aternos.me';
const PORT = 58137;
const USERNAME = 'MobileBot';

let bot = null;
let afkInterval = null;
let reconnectTimeout = null;
let loginTimer = null; 

let isConnected = false;    
let isConnecting = false;   

let lastPacketTime = Date.now();
let tick = 0n;
let pos = { x: 0, y: 0, z: 0 };
let yaw = 0;
let entityId = 0n; // Variabile per salvare l'ID univoco assegnato dal server

// ======================
// FUNZIONE DI CONNESSIONE
// ======================
function connect() {
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
      connectTimeout: 20000 
    });

    // Catturiamo posizione e ID reale appena entriamo nel mondo
    bot.on('start_game', (packet) => {
      pos = packet.player_position;
      entityId = packet.runtime_entity_id; 
    });

    bot.on('spawn', () => {
      console.log("📨 Ricevuto pacchetto spawn. Stabilizzazione in corso (5s)...");
      
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

  if (isConnecting || reconnectTimeout) return;

  if (!isConnected) {
    console.log("🔍 Watchdog: Bot non rilevato, forzo avvio.");
    connect();
    return;
  }

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

      // 1. Simula il movimento (rotazione della visuale)
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

      // 2. Simula il movimento del braccio (usando l'ID corretto)
      if (entityId !== 0n) {
        bot.queue('animate', {
          action_id: 1, 
          runtime_entity_id: entityId 
        });
      }

      console.log("🟢 Anti-AFK eseguito con successo");

    } catch (e) {
      // Stampa l'errore esatto nei log se dovesse fallire ancora
      console.log("⚠️ Errore Anti-AFK:", e.message || e);
    }
  }, 30000);
}

function stopAntiAFK() {
  if (afkInterval) {
    clearInterval(afkInterval);
    afkInterval = null;
  }
}

// ======================
// START
// ======================
connect();
