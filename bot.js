const bedrock = require('bedrock-protocol');

const serverIP = 'RustedSurvival.aternos.me';
const serverPort = 58137; 
const botUsername = 'BotAFK_Rusted';

let isConnected = false;
let afkInterval = null;

function startBot() {
    console.log(`[${new Date().toLocaleTimeString()}] ⏳ Tentativo di connessione...`);

    const client = bedrock.createClient({
        host: serverIP,
        port: serverPort,
        username: botUsername,
        offline: true,
        connectTimeout: 30000 
    });

    // Variabile di controllo per evitare di chiamare retry() più volte nello stesso ciclo
    let isRetrying = false;

    // Funzione centralizzata per gestire la riconnessione
    const retry = (reason) => {
        if (isRetrying) return; // Se stiamo già riprovando, ignora le altre chiamate
        isRetrying = true;

        if (isConnected) {
            console.log(`[${new Date().toLocaleTimeString()}] ⚠️ BOT DISCONNESSO. Motivo: ${reason}`);
        } else {
            console.log(`[${new Date().toLocaleTimeString()}] ❌ ERRORE/DISCONNESSIONE. Motivo: ${reason}`);
        }
        
        isConnected = false;
        if (afkInterval) clearInterval(afkInterval);
        
        try {
            client.removeAllListeners();
            client.close(); // Forziamo la chiusura per pulire la memoria
        } catch (e) {
            // Ignoriamo eventuali errori di chiusura se il client è già distrutto
        }

        console.log(`[${new Date().toLocaleTimeString()}] 🔄 Riprovo tra 10 secondi...`);
        
        // Forza il riavvio tra 10 secondi esatti, solo 1 volta per disconnessione
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
            
            try {
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
            } catch (err) {
                // Se c'è un errore nell'invio del pacchetto AFK, avvia il riavvio
                retry('Errore durante invio pacchetti AFK (Timeout/Desync)');
            }
        }, 30000);
    });

    // Gestione specifica per le disconnessioni inviate dal server (es. riavvii, kick)
    client.on('disconnect', (packet) => {
        const reason = packet.message || packet.reason || 'Sconosciuto';
        retry(`Disconnesso dal server: ${reason}`);
    });

    client.on('kick', (packet) => {
        const reason = packet.message || packet.reason || 'Sconosciuto';
        retry(`Kikkato dal server: ${reason}`);
    });

    // Gestione per errori di rete (come il Ping Timed Out)
    client.on('error', (err) => {
        retry(`Errore di rete: ${err.message}`);
    });

    // Se la connessione si chiude per motivi generici non catturati sopra
    client.on('close', () => {
        retry('Connessione chiusa');
    });
}

// Avvio
startBot();
