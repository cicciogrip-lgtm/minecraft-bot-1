const bedrock = require('bedrock-protocol');

const serverIP = 'RustedSurvival.aternos.me';
const serverPort = 58137; 
const botUsername = 'BotAFK_Rusted';

let isConnected = false;
let afkInterval = null;

function startBot() {
    if (isConnected) return;

    console.log(`[${new Date().toLocaleTimeString()}] ⏳ Tentativo di connessione...`);

    const client = bedrock.createClient({
        host: serverIP,
        port: serverPort,
        username: botUsername,
        offline: true,
        connectTimeout: 30000 
    });

    // Funzione centralizzata per gestire la riconnessione
    const retry = () => {
        if (isConnected) {
            console.log(`[${new Date().toLocaleTimeString()}] ⚠️ BOT DISCONNESSO.`);
        }
        
        isConnected = false;
        if (afkInterval) clearInterval(afkInterval);
        
        // Rimuove tutti i listener per evitare perdite di memoria
        client.removeAllListeners();

        console.log(`[${new Date().toLocaleTimeString()}] 🔄 Riprovo tra 10 secondi (Loop infinito)...`);
        
        // Forza il riavvio tra 10 secondi
        setTimeout(() => {
            startBot();
        }, 10000);
    };

    client.on('start_game', (packet) => {
        isConnected = true;
        const runtimeId = packet.runtime_id;
        let position = packet.player_position;
        
        console.log(`[${new Date().toLocaleTimeString()}] ✅ Connesso con successo!`);

        // Aggiorna posizione se spostato
        client.on('move_player', (p) => {
            if (p.runtime_id === runtimeId) position = p.position;
        });

        let yaw = 0;
        afkInterval = setInterval(() => {
            if (!isConnected) return;
            yaw = (yaw + 30) % 360;
            
            client.write('move_player', {
                runtime_id: runtimeId,
                position: position,
                pitch: 0,
                yaw: yaw, head_yaw: yaw,
                mode: 'normal', on_ground: true,
                ridden_runtime_id: 0n, teleport: { cause: 'unknown', source_entity_type: 0 },
                tick: 0n
            });
            client.write('animate', { action_id: 'swing_arm', runtime_id: runtimeId });
        }, 30000);
    });

    // FIX: Se c'è un errore di rete, chiama subito la funzione di retry
    client.on('error', (err) => {
        console.log(`[${new Date().toLocaleTimeString()}] ❌ Errore di rete: ${err.message}`);
        // Chiudiamo il client manualmente per scatenare la pulizia se non avviene da sola
        client.close();
    });

    // FIX: Se la connessione si chiude per qualsiasi motivo
    client.on('close', () => {
        // Usiamo un controllo per evitare di chiamare retry() due volte (sia da error che da close)
        if (isConnected || client.state === 'failed' || client.status === 'disconnected') {
            retry();
        } else {
            // Se non era ancora connesso (es. errore immediato), riprova comunque
            retry();
        }
    });
}

// Avvio
startBot();
