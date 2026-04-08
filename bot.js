const bedrock = require('bedrock-protocol');

// Configurazione server
const serverIP = 'RustedSurvival.aternos.me';
const serverPort = 58137; 
const botUsername = 'BotAFK_Rusted';

let isConnected = false;
let reconnectTimeout = null;

function startBot() {
    // Se c'è già un tentativo in corso o è connesso, non fare nulla
    if (isConnected) return;

    console.log(`[${new Date().toLocaleTimeString()}] ⏳ Tentativo di connessione in corso...`);

    const client = bedrock.createClient({
        host: serverIP,
        port: serverPort,
        username: botUsername,
        offline: true,        // Per server Aternos con opzione "Cracked"
        connectTimeout: 30000 // 30 secondi di pazienza per il ping
    });

    let runtimeId = 0n;
    let position = { x: 0, y: 0, z: 0 };
    let afkInterval = null;

    // Quando il bot entra effettivamente nel mondo
    client.on('start_game', (packet) => {
        isConnected = true;
        runtimeId = packet.runtime_id;
        position = packet.player_position;
        console.log(`[${new Date().toLocaleTimeString()}] ✅ Bot connesso con successo!`);

        let yaw = 0;
        afkInterval = setInterval(() => {
            if (!isConnected) return;
            
            yaw = (yaw + 30) % 360;
            
            // Movimento e rotazione visuale
            client.write('move_player', {
                runtime_id: runtimeId,
                position: position,
                pitch: 0,
                yaw: yaw,
                head_yaw: yaw,
                mode: 'normal',
                on_ground: true,
                ridden_runtime_id: 0n,
                teleport: { cause: 'unknown', source_entity_type: 0 },
                tick: 0n
            });

            // Muove il braccio
            client.write('animate', { action_id: 'swing_arm', runtime_id: runtimeId });
        }, 30000); 
    });

    // Gestione degli errori (es: Ping Timed Out, Connection Refused)
    client.on('error', (err) => {
        // Messaggio specifico per l'errore
        console.log(`[${new Date().toLocaleTimeString()}] ❌ Errore di rete: ${err.message}`);
        isConnected = false;
    });

    // Gestione della disconnessione (sia kick che spegnimento server)
    client.on('close', () => {
        isConnected = false;
        if (afkInterval) clearInterval(afkInterval);

        console.log(`[${new Date().toLocaleTimeString()}] ⚠️ BOT DISCONNESSO.`);
        console.log(`[${new Date().toLocaleTimeString()}] 🔄 Avvio loop di riconnessione (ogni 10s)...`);

        // Cancella eventuali timeout precedenti per evitare sovrapposizioni
        if (reconnectTimeout) clearTimeout(reconnectTimeout);
        
        // Loop infinito: aspetta 10 secondi e richiama startBot
        reconnectTimeout = setTimeout(() => {
            startBot();
        }, 10000);
    });
}

// Primo avvio
startBot();
