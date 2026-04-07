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

// Inizializziamo SEMPRE con numeri, mai con null o undefined
let pos = { x: 0, y: 100, z: 0 }; 
let yaw = 0;
let entityId = 0n;

function connect() {
  if (isConnected) return;
  if (isConnecting && (Date.now() - lastPacketTime < 30000)) return;

  isConnecting = true;
  lastPacketTime = Date.now(); 
  console.log(`🔌 [${new Date().toLocaleTimeString()}] Connessione...`);

  cleanupBot();

  try {
    bot = bedrock.createClient({
      host: HOST, port: PORT, username: USERNAME,
      offline: true, connectTimeout: 20000 
    });

    bot.on('start_game', (packet) => {
      // Se il pacchetto ha dati, usali, altrimenti tieni quelli di default
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
      if (loginTimer) clearTimeout(loginTimer);
      loginTimer = setTimeout(() => {
        console.log("✅ Bot Online!");
        isConnected = true;
        isConnecting = false;
        lastPacketTime = Date.now();
        startAntiAFK();
      }, 5000);
    });

    bot.on('packet', () => { lastPacketTime = Date.now(); });
    bot.on('error', (err) => { console.log("⚠️ Errore:", err.message); handleDisconnect(); });
    bot.on('close', () => { console.log("❌ Chiuso."); handleDisconnect(); });

  } catch (err) {
    handleDisconnect();
  }
}

function handleDisconnect() {
  cleanupAll();
  if (reconnectTimeout) return;
  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    connect();
  }, 10000);
}

// Watchdog che sblocca tutto se il bot si incanta
setInterval(() => {
  if (!isConnected && !reconnectTimeout) {
    isConnecting = false; 
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
    if (!isConnected || !bot) return;

    try {
      tick++;
      yaw = (yaw + 30) % 360;

      // Inviamo il pacchetto con la garanzia che pos.x sia un numero
      bot.queue('player_auth_input', {
        pitch: 0,
        yaw: yaw,
        head_yaw: yaw,
        position: {
            x: pos.x || 0,
            y: pos.y || 100,
            z: pos.z || 0
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
    } catch (e) {
      // Se fallisce, non facciamo nulla, il watchdog rileverà il problema se serve
    }
  }, 25000);
}

function stopAntiAFK() {
  if (afkInterval) { clearInterval(afkInterval); afkInterval = null; }
}

connect();
