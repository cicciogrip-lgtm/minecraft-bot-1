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

let pos = { x: 0, y: 100, z: 0 }; 
let yaw = 0;
let entityId = 0n;

// ======================
// CONNESSIONE ZERO-DELAY
// ======================
function connect() {
  if (isConnected) return;
  if (isConnecting && (Date.now() - lastPacketTime < 30000)) return;

  isConnecting = true;
  lastPacketTime = Date.now(); 
  console.log(`🔌 [${new Date().toLocaleTimeString()}] Connessione in corso...`);

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
      if (packet.player_position && typeof packet.player_position.x === 'number') {
        pos = { x: packet.player_position.x, y: packet.player_position.y, z: packet.player_position.z };
      }
      entityId = packet.runtime_entity_id; 
    });

    bot.on('move_player', (packet) => {
      if (packet.runtime_id === entityId && packet.position) {
        pos = { x: packet.position.x, y: packet.position.y, z: packet.position.z };
      }
    });

    // NESSUNA ATTESA: Appena spawna, parte.
    bot.on('spawn', () => {
      console.log("✅Bot online");
      isConnected = true;
      isConnecting = false;
      lastPacketTime = Date.now();
      startAntiAFK(); 
    });

    bot.on('packet', () => { 
      lastPacketTime = Date.now(); 
    });

    bot.on('disconnect', (packet) => {
      console.log(`🚪 KICK DAL SERVER! Motivo: ${packet.hide_disconnect_reason ? 'Sconosciuto/Nascosto' : packet.message}`);
    });

    bot.on('error', (err) => { 
      console.log("⚠️ Errore Client:", err.message); 
      handleDisconnect(); 
    });
    
    bot.on('close', () => { 
      console.log("❌ Connessione terminata."); 
      handleDisconnect(); 
    });

  } catch (err) {
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
// WATCHDOG
// ======================
setInterval(() => {
  const now = Date.now();
  
  if (isConnected && (now - lastPacketTime > 60000)) {
    console.log("❄️ Timeout rilevato dal Watchdog, riavvio...");
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
// ANTI-AFK ISTANTANEO
// ======================
function startAntiAFK() {
  if (afkInterval) clearInterval(afkInterval);

  // Creiamo una funzione per il movimento così possiamo chiamarla SUBITO
  const sendMovement = () => {
    if (!isConnected || !bot) return;

    try {
      tick++;
      yaw = (yaw + 30) % 360; 

      bot.queue('player_auth_input', {
        pitch: 0,
        yaw: yaw,
        head_yaw: yaw,
        position: { x: pos.x || 0, y: pos.y || 100, z: pos.z || 0 }, 
        move_vector: { x: 0, z: 0 },
        analog_move_vector: { x: 0, z: 0 },
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
      console.log("🟢 Input inviato");
    } catch (e) {
       // ignora errori minori
    }
  };

  // Esegue il primissimo movimento SUBITO (0 millisecondi di ritardo)
  sendMovement();

  // Poi imposta il timer ogni 20 secondi
  afkInterval = setInterval(sendMovement, 20000); 
}

function stopAntiAFK() {
  if (afkInterval) { 
    clearInterval(afkInterval); 
    afkInterval = null; 
  }
}

connect();
