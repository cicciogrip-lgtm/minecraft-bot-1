const bedrock = require('bedrock-protocol');

const serverIP = 'RustedSurvival.aternos.me';
const serverPort = 58137; 
const botUsername = 'BotAFK_Rusted';

let isConnected = false;

function startBot() {
    if (isConnected) return;

    console.log(`[${new Date().toLocaleTimeString()}] ⏳ Tentativo di connessione...`);

    const client = bedrock.createClient({
        host: serverIP,
        port: serverPort,
        username: botUsername,
        // SOLUZIONE AUTENTICAZIONE: 
        // Impostando 'offline' a true, il bot non ti chiederà di accedere a Microsoft/Xbox Live.
        offline: true, 
        // SOLUZIONE PING TIMEOUT: 
        // Aumentiamo il tempo di attesa per la risposta del server
        connectTimeout: 30000 
    });

    let runtimeId = 0n;
    let position = { x: 0, y: 0, z: 0 };
    let afkInterval;

    client.on('start_game', (packet) => {
        isConnected = true;
        runtimeId = packet.runtime_id;
        position = packet.player_position;
        console.log("✅ Connesso! Il server è ora attivo grazie al bot.");

        let yaw = 0;
        afkInterval = setInterval(() => {
            if (!isConnected) return;
            yaw = (yaw + 30) % 360;
            
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

            client.write('animate', { action_id: 'swing_arm', runtime_id: runtimeId });
        }, 30000); 
    });

    // Gestione errori (incluso il Ping Timed Out)
    client.on('error', (err) => {
        console.error(`❌ Errore: ${err.message}`);
        // Se il server è offline o in timeout, forziamo la chiusura per resettare
        isConnected = false;
        client.close(); 
    });

    client.on('close', () => {
        isConnected = false;
        clearInterval(afkInterval);
        console.log("🔄 Server non raggiungibile o connessione persa. Riprovo tra 10 secondi...");
        
        // Riprova sempre, indipendentemente dal tipo di errore
        setTimeout(startBot, 10000);
    });
}

startBot();
