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

// Inizializziamo pos con valori numerici sicuri per evitare "undefined"
let pos = { x: 0, y: 0, z: 0 }; 
let yaw = 0;
let entityId = 0n;

function connect() {
  if (isConnected) return;
  // Se sta connettendo da più di 30s, permettiamo un nuovo tentativo (reset del blocco)
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
      connectTimeout: 15000 
    });

    bot.on('start_game', (packet) => {
      // Salviamo la posizione solo se il pacchetto la contiene davvero
      if (packet.player_position && typeof packet.player_position.x !== 'undefined') {
        pos = packet.player_position;
      }
      entityId = packet.runtime_entity_id; 
    });

    bot.on('spawn', () => {
      console.log("📨 Spawn rilevato. Attesa stabilità...");
      
      if (loginTimer) clearTimeout(loginTimer);
      loginTimer = setTimeout(() => {
        console.log("✅ Bot ONLINE!");
        isConnected = true;
        isConnecting = false;
        lastPacketTime = Date.now();
        startAntiAFK();
      }, 5000);
    });

    bot.on('packet', () => { lastPacketTime = Date.now(); });

    bot.on('error', (err) => { 
      console.log("⚠️ Errore:", err.message);
      handleDisconnect(); 
    });

    bot.on('close', () => {
      console.log("❌ Connessione chiusa.");
      handleDisconnect();
    });

  } catch (err) {
    console.log("⚠️ Errore creazione client:", err.message);
    handleDisconnect();
  }
}

function handleDisconnect() {
  cleanupAll();
  if (reconnectTimeout) return;
  
  console.log("🔄 Riconnessione tra 10s...");
  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    connect();
  }, 10000);
}

// WATCHDOG MIGLIORATO
setInterval(() => {
  const now = Date.now();

  // Se il bot è "connesso" ma non arrivano pacchetti da 60s
  if (isConnected && (now - lastPacketTime > 60000)) {
    console.log("❄️ Timeout rilevato, riavvio...");
    handleDisconnect();
    return;
  }

  // Se il bot è spento e non sta già aspettando il timer di riconnessione
  if (!isConnected && !reconnectTimeout) {
    console.log("🔍 Watchdog: Bot offline, forzo riavvio.");
    isConnecting = false; // Sblocca il lucchetto
    connect();
  }
}, 15000);

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
  if (afkInterval) clearInterval(afkInterval);

  afkInterval = setInterval(() => {
    // PROTEZIONE CRITICA PER LA X:
    // Se pos non è un oggetto o x non esiste, non inviare il pacchetto
    if (!isConnected || !bot || !pos || typeof pos.x === 'undefined') {
      console.log("⏳ In attesa di coordinate valide...");
      return;
    }

    try {
      tick++;
      yaw = (yaw + 20) % 360;

      bot.queue('player_auth_input', {
        pitch: 0,
        yaw: yaw,
        head_yaw: yaw,
        position: { 
            x: Number(pos.x), 
            y: Number(pos.y), 
            z: Number(pos.z) 
        }, 
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
      console.log("🟢 Anti-AFK OK");
    } catch (e) 
  }, 30000);
}

function stopAntiAFK() {
  if (afkInterval) {
    clearInterval(afkInterval);
    afkInterval = null;
  }
}

connect();
