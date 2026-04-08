const bedrock = require('bedrock-protocol');

const serverIP = 'RustedSurvival.aternos.me';
const serverPort = 58137;
const botUsername = 'BotAFK_Rusted';

let isConnected = false;

function startBot() {
    console.log("⏳ Connessione...");

    const client = bedrock.createClient({
        host: serverIP,
        port: serverPort,
        username: botUsername,
        offline: true
    });

    let runtimeId = 0n;
    let position = { x: 0, y: 0, z: 0 };
    let tick = 0n;
    let yaw = 0;

    client.on('start_game', (packet) => {
        isConnected = true;

        runtimeId = packet.runtime_id;
        position = packet.player_position;

        console.log("✅ Connesso!");

        // Movimento continuo (NON ogni 30s!)
        setInterval(() => {
            if (!isConnected) return;

            tick++;

            // movimento casuale realistico
            position.x += (Math.random() - 0.5) * 0.1;
            position.z += (Math.random() - 0.5) * 0.1;

            yaw += (Math.random() - 0.5) * 30;

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
                tick: tick
            });

            // azioni casuali
            if (Math.random() < 0.3) {
                client.write('animate', {
                    action_id: 'swing_arm',
                    runtime_id: runtimeId
                });
            }

        }, 1000); // ogni 1 secondo → MOLTO più realistico
    });

    // IMPORTANTE: aggiorna posizione reale dal server
    client.on('move_player', (packet) => {
        position = packet.position;
    });

    client.on('disconnect', (packet) => {
        console.log("❌ Kick:", packet.message);
    });

    client.on('error', (err) => {
        console.log("❌ Errore:", err.message);
    });

    client.on('close', () => {
        console.log("⚠️ Disconnesso");

        isConnected = false;

        setTimeout(() => {
            startBot();
        }, 10000);
    });
}

startBot();
