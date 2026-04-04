const bedrock = require('bedrock-protocol');

const HOST = 'RustedSurvival.aternos.me';
const PORT = 58137;

let bot = null;
let afkInterval = null;
let isConnected = false;
let isConnecting = false;
let connectTimeout = null;
let tick = 0;

function connect() {
  if (isConnected || isConnecting) {
    console.log("Già connesso o in connessione, skip...");
    return;
  }

  isConnecting = true;
  console.log("Tentativo di connessione...");

  // sicurezza: chiudi eventuale bot vecchio
  if (bot) {
    try { bot.disconnect(); } catch(e) {}
    bot = null;
  }

  bot = bedrock.createClient({
    host: HOST,
    port: PORT,
    username: 'MobileBot',
    offline: true
  });

  // timeout anti doppia connessione
  connectTimeout = setTimeout(() => {
    if (!isConnected) {
      console.log("Timeout connessione, riavvio...");
      try { bot.disconnect(); } catch(e) {}
      isConnecting = false;
      connect();
    }
  }, 10000);

  bot.on('spawn', () => {
    console.log("Bot entrato nel server");
    isConnecting = false;
    isConnected = true;

    clearTimeout(connectTimeout);
    startAntiAFK();
  });

  bot.on('disconnect', (packet) => {
    console.log("Disconnesso. Motivo:", packet?.reason || "Chiusura");

    cleanup();
    reconnect();
  });

  bot.on('error', (err) => {
    console.log("Errore:", err.message || err);

    cleanup();
    reconnect();
  });
}

function reconnect() {
  if (isConnecting) return;

  console.log("Riconnessione tra 7 secondi...");
  setTimeout(connect, 7000);
}

function cleanup() {
  stopAntiAFK();

  if (connectTimeout) {
    clearTimeout(connectTimeout);
    connectTimeout = null;
  }

  isConnecting = false;
  isConnected = false;

  if (bot) {
    try { bot.disconnect(); } catch(e) {}
    bot = null;
  }
}

function startAntiAFK() {
  if (afkInterval) return;

  afkInterval = setInterval(() => {
    if (!bot || !bot.entity) return;

    try {
      tick++;

      bot.queue('player_auth_input', {
        pitch: 0,
        yaw: Math.random() * 360,
        head_yaw: Math.random() * 360,
        position: bot.entity.position,
        move_vector: {
          x: (Math.random() - 0.5) * 0.1,
          z: (Math.random() - 0.5) * 0.1
        },
        input_data: {},
        tick: BigInt(tick),
        delta: { x: 0, y: 0, z: 0 }
      });

      console.log("Movimento anti AFK");
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
