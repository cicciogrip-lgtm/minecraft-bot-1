const bedrock = require('bedrock-protocol');

const HOST = 'Valkyrie1.aternos.me';
const PORT = 28603;

let bot = null;
let afkInterval = null;
let isConnected = false;
let isConnecting = false;

function connect() {
  if (isConnected || isConnecting) return;

  isConnecting = true;
  console.log("Tentativo di connessione...");

  bot = bedrock.createClient({
    host: HOST,
    port: PORT,
    username: 'MobileBot',
    offline: true
  });

  bot.on('spawn', () => {
    console.log("Bot entrato nel server");
    isConnecting = false;
    isConnected = true;
    startAntiAFK();
  });

  bot.on('disconnect', (packet) => {
    console.log("Disconnesso. Motivo:", packet?.reason || "Chiusura");
    stopAntiAFK();
    isConnecting = false;
    isConnected = false;
    console.log("Riconnessione tra 7 secondi...");
    setTimeout(connect, 7000);
  });

  bot.on('error', (err) => {
    console.log("Errore:", err.message || err);
    stopAntiAFK();
    isConnecting = false;
    isConnected = false;
    console.log("Riconnessione tra 7 secondi...");
    setTimeout(connect, 7000);
  });
}

function startAntiAFK() {
  if (afkInterval) return;
  afkInterval = setInterval(() => {
    if (!bot || !bot.entity) return;
    try {
      bot.queue('player_auth_input', {
        pitch: 0,
        yaw: Math.random() * 360,
        head_yaw: Math.random() * 360,
        position: bot.entity.position,
        move_vector: { x: (Math.random() - 0.5) * 0.1, z: (Math.random() - 0.5) * 0.1 },
        input_data: {},
        tick: BigInt(Date.now()),
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

connect();    isConnected = false;
    
    console.log("Riprovo tra 7 secondi...");
    setTimeout(connect, 7000);
  });

  bot.on('error', (err) => {
    console.log("Errore riscontrato:", err.message || err);
    stopAntiAFK();
    isConnecting = false;
    isConnected = false;
    
    console.log("Riprovo tra 7 secondi...");
    setTimeout(connect, 7000);
  });
}

function startAntiAFK() {
  if (afkInterval) return;

  afkInterval = setInterval(() => {
    if (!bot || !bot.entity) return;

    try {
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
        tick: BigInt(Date.now()),
        delta: { x: 0, y: 0, z: 0 }
      });
      console.log("Movimento anti AFK eseguito");
    } catch (e) {
      // Errore silenzioso se il pacchetto non parte
    }
  }, 30000);
}

function stopAntiAFK() {
  if (afkInterval) {
    clearInterval(afkInterval);
    afkInterval = null;
  }
}

// Avvio
connect();    console.log("Disconnesso. Motivo:", packet?.reason || "Sconosciuto");
    stopAntiAFK();
    isConnecting = false;
    isConnected = false; // Segna che è uscito
    
    console.log("Riprovo tra 7 secondi...");
    setTimeout(connect, 7000); // 7000 millisecondi = 7 secondi
  });

  bot.on('error', (err) => {
    console.log("Errore:", err.message || err);
    stopAntiAFK();
    isConnecting = false;
    isConnected = false;
    
    console.log("Riprovo tra 7 secondi...");
    setTimeout(connect, 7000); // 7000 millisecondi = 7 secondi
  });
}

function startAntiAFK() {
  if (afkInterval) return;

  afkInterval = setInterval(() => {
    if (!bot || !bot.entity) return;

    try {
      bot.queue('player_auth_input', {
        pitch: 0,
        yaw: Math.random() * 360,
        head_yaw: Math.random() * 360,
        position: bot.entity.position,
        move_vector: {
          x: Math.random() * 0.2,
          z: Math.random() * 0.2
        },
        input_data: {},
        tick: BigInt(Date.now())
      });

      console.log("Movimento anti AFK");
    } catch {}

  }, 30000);
}

function stopAntiAFK() {
  if (afkInterval) {
    clearInterval(afkInterval);
    afkInterval = null;
  }
}

connect();  bot.on('disconnect', (packet) => {
    isConnecting = false;
    stopAntiAFK();
    
    let delay = 6000;
    if (packet.reason === 'server_id_conflict') {
      console.log("Conflitto di sessione rilevato. Aspetto 15 secondi...");
      delay = 15000; // Tempo extra per far resettare Aternos
    } else {
      console.log("Disconnesso. Motivo:", packet.reason);
    }

    setTimeout(connect, delay);
  });

  bot.on('error', (err) => {
    isConnecting = false;
    stopAntiAFK();
    
    // Evitiamo di spammare tentativi se il server è offline (Ping timed out)
    if (err.message.includes('timeout') || err.message.includes('ETIMEDOUT')) {
      console.log("Server non raggiungibile (timeout). Riprovo tra 30 secondi...");
      setTimeout(connect, 30000);
    } else {
      console.error("Errore:", err.message);
      setTimeout(connect, 6000);
    }
  });
}

function startAntiAFK() {
  if (afkInterval) return;
  afkInterval = setInterval(() => {
    if (!bot || !bot.entity) return;
    try {
      bot.queue('player_auth_input', {
        pitch: 0,
        yaw: Math.random() * 360,
        head_yaw: Math.random() * 360,
        position: bot.entity.position,
        move_vector: { x: (Math.random() - 0.5) * 0.1, z: (Math.random() - 0.5) * 0.1 },
        input_data: {},
        tick: BigInt(Date.now()),
        delta: { x: 0, y: 0, z: 0 }
      });
      console.log("Movimento anti-AFK eseguito");
    } catch (e) {}
  }, 30000);
}

function stopAntiAFK() {
  if (afkInterval) {
    clearInterval(afkInterval);
    afkInterval = null;
  }
}

// Avvio iniziale
connect();
function startAntiAFK() {
  if (afkInterval) return;

  afkInterval = setInterval(() => {
    if (!bot || !bot.entity) return;

    try {
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
        tick: BigInt(Date.now()),
        delta: { x: 0, y: 0, z: 0 }
      });
      console.log("Movimento anti-AFK eseguito");
    } catch (e) {
      // Ignora errori temporanei durante l'invio
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
