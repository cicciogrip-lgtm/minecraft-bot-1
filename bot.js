const bedrock = require('bedrock-protocol');

// Configurazione specifica per il tuo server
const serverIP = 'RustedSurvival.aternos.me';
const serverPort = 58137; 
const botUsername = 'BotAFK_Rusted';

let isConnected = false;

function startBot() {
    // Evita di far partire più connessioni contemporaneamente
    if (isConnected) return;

    console.log(`[${new Date().toLocaleTimeString()}] ⏳ Tentativo di connessione a ${serverIP}...`);

    const client = bedrock.createClient({
        host: serverIP,
        port: serverPort,
        username: botUsername,
        offline: false // Imposta a true se il server Aternos ha l'opzione "Cracked" attiva
    });

    let runtimeId = 0n;
    let position = { x: 0, y: 0, z: 0 };
    let afkInterval;

    client.on('start_game', (packet) => {
        isConnected = true;
        runtimeId = packet.runtime_id;
        position = packet.player_position;
        console.log("✅ Bot connesso e in gioco!");

        let yaw = 0;
        
        // Loop Anti-AFK (ogni 30 secondi)
        afkInterval = setInterval(() => {
            if (!isConnected) return;
            
            yaw = (yaw + 30) % 360;
            
            // Movimento visuale
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

            // Animazione braccio
            client.write('animate', {
                action_id: 'swing_arm',
                runtime_id: runtimeId
            });
        }, 30000); 
    });

    // Aggiorna posizione se il server lo sposta
    client.on('move_player', (packet) => {
        if (packet.runtime_id === runtimeId) {
            position = packet.position;
        }
    });

    // Gestione Errori
    client.on('error', (err) => {
        console.error(`❌ Errore rilevato: ${err.message}`);
        isConnected = false;
    });

    // Gestione Chiusura/Disconnessione
    client.on('close', () => {
        if (isConnected) {
            console.log("⚠️ Connessione persa.");
            isConnected = false;
        }
        
        clearInterval(afkInterval);

        console.log("🔄 Riprovo tra 10 secondi...");
        setTimeout(() => {
            startBot();
        }, 10000); // 10 secondi di attesa
    });
}

// Avvio iniziale
startBot();
