const bedrock = require('bedrock-protocol');

// Configurazione del server
const serverIP = 'IL_TUO_IP_DI_ATERNOS.aternos.me'; // Es: mioserver.aternos.me
const serverPort = 19132;                           // La porta di Aternos per Bedrock
const botUsername = 'BotAFK';

function startBot() {
    console.log("⏳ Connessione al server Aternos in corso...");

    const client = bedrock.createClient({
        host: 'RustedSurvival.aternos.me',
        port: 58137,
        username: BotAFK,
        // IMPORTANTE: Imposta 'offline: true' se nelle opzioni di Aternos
        // hai attivato "Cracked" (ovvero non richiede l'account Xbox/Microsoft).
        // Se invece richiede l'accesso ufficiale, lascialo a 'false'.
        offline: false 
    });

    let runtimeId = 0n; // ID univoco del bot nel server
    let position = { x: 0, y: 0, z: 0 };
    let afkInterval;

    // Evento: Il bot entra in gioco e il server gli invia i dati iniziali
    client.on('start_game', (packet) => {
        runtimeId = packet.runtime_id;
        position = packet.player_position;
        console.log("✅ Bot spawnato nel server con successo!");

        let yaw = 0;
        
        // Loop Anti-AFK: Si attiva ogni 30 secondi
        afkInterval = setInterval(() => {
            yaw = (yaw + 15) % 360; // Ruota la testa del bot di 15 gradi
            
            // 1. Inviamo un pacchetto di movimento (rotazione della visuale)
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

            // 2. Facciamo oscillare il braccio al bot (clic sinistro)
            client.write('animate', {
                action_id: 'swing_arm',
                runtime_id: runtimeId
            });

        }, 30000); 
    });

    // Se il server sposta il bot (es. acqua o spinta), aggiorniamo la nostra posizione 
    // per non mandare pacchetti errati e farci kickare per "movimento anomalo"
    client.on('move_player', (packet) => {
        if (packet.runtime_id === runtimeId) {
            position = packet.position;
        }
    });

    // Evento: Messaggio di kick o disconnessione
    client.on('disconnect', (packet) => {
        console.log(`⚠️ Kickato o disconnesso: ${packet.message}`);
    });

    // Evento: Il server si è spento o la connessione è caduta
    client.on('close', () => {
        console.log("❌ Connessione terminata. Riavvio automatico tra 1 minuto...");
        clearInterval(afkInterval); // Ferma il loop anti-AFK
        
        // Riprova a connettersi dopo 60 secondi
        setTimeout(() => {
            startBot();
        }, 60000);
    });

    client.on('error', (err) => {
        console.error("❌ Errore di connessione:", err);
    });
}

// Avvio del bot
startBot();
