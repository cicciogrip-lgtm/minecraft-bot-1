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

// Coordinate di emergenza garantite
let pos = { x: 0, y: 100, z: 0 }; 
let yaw = 0;
let entityId = 0n;

// ======================
// CONNESSIONE OTTIMIZZATA
// ======================
function connect() {
  if (isConnected) return;
  if (isConnecting && (Date.now() - lastPacketTime < 30000)) return;

  isConnecting = true;
  lastPacketTime = Date.now(); 
  console.log(`🔌 [${new Date().toLocaleTimeString()}] Avvio login leggero...`);

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

    bot.on('spawn', () => {
      console.log("📨 Spawnato! Ottimizzazione mappa in corso...");
      
      // 🚀 OTTIMIZZAZIONE SERVER: Chiediamo solo 1 chunk di distanza
      // Questo evita che Aternos lagghi per inviare la mappa al bot
      try {
        bot.queue('request_chunk_radius', { chunk_radius: 1 });
      } catch(e) {}

      if (loginTimer) clearTimeout(loginTimer);
      
      // Entrata morbida: diamo ad Aternos 10 secondi per stabilizzare le entità
      loginTimer = setTimeout(() => {
        console.log("✅ Bot Online e Leggero!");
        isConnected = true;
        isConnecting = false;
        lastPacketTime = Date.now();
        startAntiAFK();
      }, 10000); 
    });

    // 🚀 OTTIMIZZAZIONE CPU: Invece di ascoltare 10.000 pacchetti al secondo, 
    // ascoltiamo solo il pacchetto dell'ora solare (inviato 1 volta al secondo)
    bot.on('update_time', () => { 
      lastPacketTime = Date.now(); 
    });

    bot.on('error', (err) => { 
      console.log("⚠️ Errore:", err.message); 
      handleDisconnect(); 
    });
    
    bot.on('close', () => { 
      console.log("❌ Disconnesso."); 
      handleDisconnect(); 
    });

  } catch (err) {
    handleDisconnect();
  }
}

// ======================
// GESTIONE DISCONNESSIONI
// ======================
function handleDisconnect() {
  cleanupAll();
  if (reconnectTimeout) return;
  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    connect();
  }, 10000);
}

// ======================
// WATCHDOG INTELLIGENTE
// ======================
setInterval(() => {
  const now = Date.now();
  
  if (isConnected && (now - lastPacketTime > 60000)) {
    console.log("❄️ Rilevato lag estremo/freeze, riavvio la sessione...");
    handleDisconnect();
    return;
  }

  if (!isConnected && !reconnectTimeout) {
    isConnecting = false; 
    connect();
  }
}, 15000);

// ======================
// PULIZIA RISORSE (Previene memory leak)
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
// ANTI-AFK LEGGERO
// ======================
function startAntiAFK() {
  if (afkInterval) clearInterval(afkInterval);

  afkInterval = setInterval(() => {
    if (!isConnected || !bot) return;

    try {
      tick++;
      yaw = (yaw + 45) % 360; // Gira in modo più deciso ma meno spesso

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

      // Il braccio si muove solo se c'è un ID valido
      if (entityId !== 0n) {
        bot.queue('animate', { action_id: 1, runtime_entity_id: entityId });
      }
    } catch (e) {
      // Silenzioso in caso di fallimento per non spammare log
    }
  }, 35000); // Intervallo allungato a 35s per alleggerire ulteriormente il server
}

function stopAntiAFK() {
  if (afkInterval) { 
    clearInterval(afkInterval); 
    afkInterval = null; 
  }
}

connect();
