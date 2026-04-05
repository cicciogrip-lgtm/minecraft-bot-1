const bedrock = require('bedrock-protocol');

const HOST = 'RustedSurvival.aternos.me';
const PORT = 58137;
const USERNAME = 'MobileBot';

let bot = null;
let afkInterval = null;
let reconnectTimeout = null;

let isConnected = false;
let isConnecting = false;

// Controllo attività
let lastPacketTime = Date.now();
let tick = 0n; // In Bedrock il tick deve essere un BigInt (es: 1n, 2n)

// Posizione e rotazione (aggiornate quando entra nel server)
let pos = { x: 0, y: 0, z: 0 };
let yaw = 0;

// ======================
// CONNESSIONE
// ======================
function connect() {
  if (isConnected || isConnecting) return;

  isConnecting = true;
  lastPacketTime = Date.now(); // Resetta il timer per il watchdog
  console.log(`🔌 Tentativo di connessione a ${HOST}...`);

  cleanupBot();

  try {
    bot = bedrock.createClient({
      host: HOST,
      port: PORT,
      username: USERNAME,
      offline: true, // Funziona solo se Aternos è in modalità "Cracked"
      connectTimeout: 10000 // Se il server è spento, fallisce in 10s invece di bloccarsi
    });
  } catch (err) {
    console.log("⚠️ Errore di creazione del client:", err.message);
    handleDisconnect();
    return;
  }

  // Cattura la posizione iniziale quando entra
  bot.on('start_game', (packet) => {
    pos = packet.player_position;
  });

  bot.on('spawn', () => {
    console.log("✅ Entrato nel server!");
    isConnected = true;
    isConnecting = false;
    lastPacketTime = Date.now();
    startAntiAFK();
  });

  bot.on('packet', () => {
    lastPacketTime = Date.now();
  });

  bot.on('disconnect', (packet) => {
    console.log("❌ Disconnesso dal server:", packet?.reason || "Motivo sconosciuto");
    handleDisconnect();
  });

  bot.on('error', (err) => {
    console.log("⚠️ Errore di rete (Il server potrebbe essere spento):", err.message);
    handleDisconnect();
  });

  bot.on('close', () => {
    handleDisconnect();
  });

  // Gestione del kick in caso di riavvio Aternos
  bot.on('player_list', (packet) => {
    if (!isConnected) return;
    if (packet.records?.type === 'remove') {
      for (const player of packet.records.records) {
        if (player.username === USERNAME) {
          console.log("🚨 Bot rimosso dalla player list (Kick/Restart)!");
          handleDisconnect();
        }
      }
    }
  });
}

// ======================
// RECONNECT INFINITO
// ======================
function handleDisconnect() {
  cleanupAll();

  if (reconnectTimeout) return;

  console.log("🔄 Riprovo a connettermi tra 10 secondi...");
  
  // Attende 10 secondi per non spammare richieste ad Aternos
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

  // 1. Se il bot è morto e non sta provando a connettersi
  if (!isConnected && !isConnecting) {
    console.log("🔍 Bot offline rilevato dal watchdog, riavvio...");
    connect();
    return;
  }

  // 2. Se è bloccato in fase di "Connessione..." da più di 20s (es: server in avvio ma non pronto)
  if (isConnecting && (now - lastPacketTime > 20000)) {
    console.log("⏱️ Connessione in stallo, resetto...");
    handleDisconnect();
    return;
  }

  // 3. Se è "connesso" ma non riceve nulla da 30s (Server laggato o crashato)
  if (isConnected && (now - lastPacketTime > 30000)) {
    console.log("❄️ Bot freezato (nessun dato dal server), forzo riavvio...");
    handleDisconnect();
  }

}, 15000);

// ======================
// PULIZIA SICURA
// ======================
function cleanupBot() {
  if (bot) {
    bot.removeAllListeners(); // IMPORTANTISSIMO per evitare memory leak durante i reconnect
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
// ANTI AFK AGGIORNATO
// ======================
function startAntiAFK() {
  if (afkInterval) return;

  afkInterval = setInterval(() => {
    if (!isConnected || !bot) return;

    try {
      tick++;
      yaw = (yaw + 10) % 360; // Ruota la visuale in modo progressivo

      // Pacchetto di movimento compatibile
      bot.queue('player_auth_input', {
        pitch: 0,
        yaw: yaw,
        head_yaw: yaw,
        position: pos, // Usa la posizione salvata dal server
        move_vector: { x: 0, z: 0 },
        input_data: 0n, // Obbligatorio usare BigInt nelle nuove versioni
        input_mode: 'mouse',
        play_mode: 'screen',
        interaction_model: 'touch',
        tick: tick,
        delta: { x: 0, y: 0, z: 0 }
      });

      // Extra: Simula il movimento del braccio (swing) per ingannare ulteriormente l'Anti-AFK
      bot.queue('animate', {
        action_id: 1, 
        runtime_entity_id: 1n 
      });

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

// ======================
// START
// ======================
connect();
