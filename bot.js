const bedrock = require('bedrock-protocol');

const serverIP = 'RustedSurvival.aternos.me'; const serverPort = 58137; const botUsername = 'BotAFK_Rusted';

let isConnected = false; let isConnecting = false; let afkTimeout = null; let retryCount = 0; const MAX_RETRIES = 50;

function log(msg) { console.log([${new Date().toLocaleTimeString()}] ${msg}); }

function startBot() { if (isConnected || isConnecting) return;

if (retryCount >= MAX_RETRIES) {
    log('❌ Numero massimo di tentativi raggiunto. Stop.');
    return;
}

isConnecting = true;
retryCount++;

log(`⏳ Connessione in corso... (Tentativo ${retryCount})`);

const client = bedrock.createClient({
    host: serverIP,
    port: serverPort,
    username: botUsername,
    offline: true,
    connectTimeout: 30000
});

let isRetrying = false;
let runtimeId = null;

const retry = (reason) => {
    if (isRetrying) return;
    isRetrying = true;

    isConnected = false;
    isConnecting = false;

    if (afkTimeout) clearTimeout(afkTimeout);

    log(`⚠️ Disconnessione: ${reason}`);

    try {
        client.removeAllListeners();
        client.close();
    } catch (e) {}

    const delay = Math.min(30000, 10000 + retryCount * 2000);
    log(`🔄 Riprovo tra ${delay / 1000}s...`);

    setTimeout(startBot, delay);
};

client.on('start_game', (packet) => {
    runtimeId = packet.runtime_id;
    isConnected = true;
    isConnecting = false;
    retryCount = 0;

    log('✅ Connesso!');

    startAFK(client, () => runtimeId, retry);
});

client.on('spawn', (packet) => {
    if (packet.runtime_id) {
        runtimeId = packet.runtime_id;
    }
});

client.on('disconnect', (p) => retry(p.message || p.reason || 'disconnect'));
client.on('kick', (p) => retry(p.message || p.reason || 'kick'));
client.on('error', (e) => retry(e.message));
client.on('close', () => retry('connessione chiusa'));

}

function startAFK(client, getRuntimeId, retry) { function doAction() { if (!isConnected) return;

const runtimeId = getRuntimeId();
    if (!runtimeId) return;

    try {
        client.write('player_auth_input', {
            pitch: 0,
            yaw: Math.random() * 360,
            position: { x: 0, y: 0, z: 0 },
            move_vector: { x: 0, z: 0 },
            input_data: ['jumping']
        });

        if (Math.random() > 0.5) {
            client.write('animate', {
                action_id: 'swing_arm',
                runtime_id: runtimeId
            });
        }

    } catch (err) {
        retry('Errore AFK');
        return;
    }

    scheduleNext();
}

function scheduleNext() {
    const delay = Math.floor(Math.random() * 20000) + 20000;
    afkTimeout = setTimeout(doAction, delay);
}

scheduleNext();

}

startBot();
