const bedrock = require('bedrock-protocol');

const serverIP = 'RustedSurvival.aternos.me';
const serverPort = 58137; 
const botUsername = 'BotAFK_Rusted';

let isConnected = false;
let isConnecting = false; // Novità: previene i doppi tentativi durante la fase di "join"
let afkInterval = null;

function startBot() {
    // Se il bot è già connesso o sta già caricando per entrare, blocca la funzione
    if (isConnected || isConnecting) {
        return; 
    }

    isConnecting = true;
    console.log(`[${new Date().toLocaleTimeString()}] ⏳ Tentativo di connessione in corso...`);

    const client = bedrock.createClient({
        host: serverIP,
        port: serverPort,
        username: botUsername,
        offline: true,
        connectTimeout: 30000 
    });

    let isRetrying = false;

    const retry = (reason) => {
        if (isRetrying) return; 
        isRetrying = true;
        isConnecting = false; // Libera il blocco della connessione

        if (isConnected) {
            console.log(`[${new Date().toLocaleTimeString()}] ⚠️ BOT DISCONNESSO. Motivo: ${reason}`);
        } else {
            console.log(`[${new Date().toLocaleTimeString()}] ❌ ERRORE/DISCONNESSIONE. Motivo: ${reason}`);
        }
        
        isConnected = false;
        if (afkInterval) clearInterval(afkInterval);
        
        try {
            client.removeAllListeners();
            client.close(); 
        } catch (e) {
            // Ignora gli errori di distruzione del client
        }

        console.log(`[${new Date().toLocaleTimeString()}] 🔄 Riprovo tra 10 secondi...`);
        
        setTimeout(() => {
            startBot();
        }, 10000);
    };

    client.on('start_game', (packet) => {
        isConnected = true;
        isConnecting = false; // Ha finito di connettersi
        const runtimeId = packet.runtime_id;
        
        console.log(`[${new Date().toLocaleTimeString()}] ✅ Connesso con successo!`);

        afkInterval = setInterval(() => {
            if (!isConnected) return;
            
            try {
                // FIX DESYNC: Rimosso il pacchetto 'move_player'. 
                // Ora il bot muove solo il braccio, evitando errori di coordinate o tick errati (tick: 0n).
                client.write('animate', { action_id: 'swing_arm', runtime_id: runtimeId });
            } catch (err) {
                retry('Errore durante invio pacchetti AFK');
            }
        }, 30000); // Manda un pugno a vuoto ogni 30 secondi
    });

    client.on('disconnect', (packet) => {
        const reason = packet.message || packet.reason || 'Sconosciuto';
        retry(`Disconnesso dal server: ${reason}`);
    });

    client.on('kick', (packet) => {
        const reason = packet.message || packet.reason || 'Sconosciuto';
        retry(`Kikkato dal server: ${reason}`);
    });

    client.on('error', (err) => {
        retry(`Errore di rete: ${err.message}`);
    });

    client.on('close', () => {
        retry('Connessione chiusa');
    });
}

// Avvio
startBot();
