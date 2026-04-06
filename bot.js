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
let pos = { x: 0, y: 0, z: 0 }; // Inizializzato con valori di default
let yaw = 0;
let entityId = 0n;

function connect() {
  if (isConnecting || isConnected) return;

  isConnecting = true;
  console.log(`🔌 [${new Date().toLocaleTimeString()}] Avvio connessione...`);

  cleanupBot();

  try {
    bot = bedrock.createClient({
      host: HOST,
      port: PORT,
      username: USERNAME,
      offline: true,
      connectTimeout: 20000 
    });

    // Gestione pacchetti per la posizione (due diversi tipi per sicurezza)
    bot.on('start_game', (packet) => {
      if (packet.player_position) pos = packet.player_position;
      entityId = packet.runtime_entity_id; 
    });

    // Se il server aggiorna la posizione, la salviamo qui
    bot.on('move_player', (packet) => {
      if (packet.runtime_id === entityId) {
        pos = packet.position;
      }
    });

    bot.on('spawn', () => {
      console.log("📨 Ricevuto spawn. Stabilizzazione...");
      
      loginTimer = setTimeout(() => {
        console.log("✅ Connessione stabilizzata correttamente!");
        isConnected = true;
        isConnecting = false;
        lastPacketTime = Date.now();
        startAntiAFK();
      }, 5000);
    });

    bot.on('packet', () => { lastPacketTime = Date.now(); });

    bot.on('error', (err) => { console.log("⚠️ Errore Client:", err.message); });

    bot.on('close', () => {
      console.log("❌ Connessione chiusa.");
      handleDisconnect();
    });

  } catch (err) {
    console.log("⚠️ Errore creazione:", err.message);
    isConnecting = false;
    handleDisconnect();
  }
}

function handleDisconnect() {
  cleanupAll();
  if (reconnectTimeout) return;
  console.log("🔄 Riprovo tra 10 secondi...");
  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    connect();
  }, 10000);
}

setInterval(() => {
  const now = Date.now();
  if (isConnecting || reconnectTimeout) return;
  if (!isConnected) {
    connect();
    return;
  }
  if (isConnected && (now - lastPacketTime > 90000)) {
    console.log("❄️ Watchdog: Timeout, riavvio.");
    handleDisconnect();
  }
}, 30000);

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

function startAntiAFK() {
  if (afkInterval) return;

  afkInterval = setInterval(() => {
    // Controllo extra per evitare l'errore 'x' dello screenshot
    if (!isConnected || !bot || !pos || typeof pos.x === 'undefined') return;

    try {
      tick++;
      yaw = (yaw + 15) % 360;

      bot.queue('player_auth_input', {
        pitch: 0,
        yaw: yaw,
        head_yaw: yaw,
        position: { x: pos.x, y: pos.y, z: pos.z }, // Accesso sicuro
        move_vector: { x: 0, z: 0 },
        input_data: 0n,
        input_mode: 'mouse',
        play_mode: 'screen',
        interaction_model: 'touch',
        tick: tick,
        delta: { x: 0, y: 0, z: 0 }
      });

      if (entityId !== 0n) {
        bot.queue('animate', { action_id: 1, runtime_entity_id: entityId });
      }

      console.log("🟢 Anti-AFK eseguito");

    } catch (e) {
      console.log("⚠️ Errore Anti-AFK:", e.message);
    }
  }, 30000);
}

function stopAntiAFK() {
  if (afkInterval) {
    clearInterval(afkInterval);
    afkInterval = null;
  }
}

connect();
