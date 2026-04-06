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
let connectionStartTime = 0; // ⏱️ Novità: Serve per capire se si blocca durante l'ingresso

let lastPacketTime = Date.now();
let tick = 0n;
let pos = { x: 0, y: 0, z: 0 }; 
let yaw = 0;
let entityId = 0n;

// ======================
// CONNESSIONE
// ======================
function connect() {
  if (isConnecting || isConnected) return;

  isConnecting = true;
  connectionStartTime = Date.now(); // Salviamo l'orario di inizio tentativo
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

    bot.on('start_game', (packet) => {
      if (packet.player_position) pos = packet.player_position;
      entityId = packet.runtime_entity_id; 
    });

    bot.on('move_player', (packet) => {
      if (packet.runtime_id === entityId) {
        pos = packet.position;
      }
    });

    bot.on('spawn', () => {
      console.log("📨 Ricevuto spawn. Stabilizzazione in corso...");
      
      loginTimer = setTimeout(() => {
        console.log("✅ Connessione stabilizzata correttamente!");
        isConnected = true;
        isConnecting = false;
        lastPacketTime = Date.now();
        startAntiAFK();
      }, 5000);
    });

    bot.on('packet', () => { lastPacketTime = Date.now(); });

    bot.on('error', (err) => { 
      console.log("⚠️ Errore Client:", err.message); 
      // Se c'è un errore mentre cerca di entrare, forza la disconnessione
      if (isConnecting) handleDisconnect();
    });

    bot.on('close', () => {
      console.log("❌ Connessione chiusa dal server.");
      handleDisconnect();
    });

    bot.on('disconnect', (packet) => {
      console.log("🚪 Kickato o disconnesso:", packet.reason || "Sconosciuto");
      handleDisconnect();
    });

  } catch (err) {
    console.log("⚠️ Errore fatale di creazione:", err.message);
    handleDisconnect();
  }
}

// ======================
// RICONNESSIONE
// ======================
function handleDisconnect() {
  cleanupAll();
  
  if (reconnectTimeout) return;
  
  console.log("🔄 Riprovo a connettermi tra 10 secondi...");
  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    connect();
  }, 10000);
}

// ======================
// WATCHDOG AGGRESSIVO
// ======================
// Controlla la salute del bot ogni 15 secondi invece di 30
setInterval(() => {
  const now = Date.now();
  
  // 1. BLOCCO FANTASMA: Se sta "connettendo" da più di 45 secondi, si è incantato
  if (isConnecting && (now - connectionStartTime > 45000)) {
     console.log("⏱️ Watchdog: Connessione bloccata nel vuoto da 45s, forzo il reset!");
     handleDisconnect();
     return;
  }

  // Se c'è un timer di riconnessione attivo, lo lasciamo lavorare in pace
  if (reconnectTimeout) return;

  // 2. INATTIVO: Non è connesso, non sta connettendo e non ci sono timer
  if (!isConnected && !isConnecting) {
    console.log("🔍 Watchdog: Bot completamente inattivo, lo faccio ripartire.");
    connect();
    return;
  }

  // 3. FREEZATO: È "connesso" ma Aternos non invia dati da 90 secondi (crash/lag)
  if (isConnected && (now - lastPacketTime > 90000)) {
    console.log("❄️ Watchdog: Server laggato o freezato, riavvio la sessione.");
    handleDisconnect();
  }
}, 15000);

// ======================
// PULIZIA SICURA
// ======================
function cleanupBot() {
  if (loginTimer) clearTimeout(loginTimer);
  if (bot) {
    bot.removeAllListeners(); // IMPORTANTISSIMO per evitare trigger doppi
    try { bot.close(); } catch(e) {}
    bot = null;
  }
}

function cleanupAll() {
  stopAntiAFK();
  isConnected = false;
  isConnecting = false; // Questo resetta il lucchetto e permette nuovi tentativi!
  cleanupBot();
}

// ======================
// ANTI-AFK (CON FIX JOYSTICK)
// ======================
function startAntiAFK() {
  if (afkInterval) return;

  afkInterval = setInterval(() => {
    if (!isConnected || !bot || !pos || typeof pos.x === 'undefined') return;

    try {
      tick++;
      yaw = (yaw + 15) % 360;

      bot.queue('player_auth_input', {
        pitch: 0,
        yaw: yaw,
        head_yaw: yaw,
        position: { x: pos.x, y: pos.y, z: pos.z }, 
        move_vector: { x: 0, z: 0 },
        analog_move_vector: { x: 0, z: 0 }, // Fix per Bedrock 1.20+
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

      console.log("🟢 Anti-AFK inviato");

    } catch (e) {
      console.log("⚠️ Errore invio pacchetto:", e.message);
    }
  }, 30000);
}

function stopAntiAFK() {
  if (afkInterval) {
    clearInterval(afkInterval);
    afkInterval = null;
  }
}

// AVVIO
connect();
