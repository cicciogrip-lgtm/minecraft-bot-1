const bedrock = require('bedrock-protocol')

const bot = bedrock.createClient({
  host: 'Valkyrie1.aternos.me',
  port: 28603,
  username: 'MobileBot',
  offline: true,

  skinData: {
    DeviceOS: 1, // Android
    DeviceId: "123456789",
    PlatformOnlineId: "",
    SelfSignedId: "00000000-0000-0000-0000-000000000000",
    ThirdPartyName: "MobileBot",
    ThirdPartyNameOnly: true
  }
})

bot.on('spawn', () => {
  console.log("Bot entrato nel server")

  setTimeout(() => {
    antiAFK()
  }, 10000)
})

function antiAFK() {

  setInterval(() => {

    try {

      bot.queue('player_auth_input', {
        pitch: 0,
        yaw: Math.random() * 360,
        position: bot.entity.position,
        move_vector: { x: 0, z: 0 },
        head_yaw: Math.random() * 360,
        input_data: {},
        tick: BigInt(Date.now())
      })

    } catch {}

  }, 30000)

}

bot.on('text', (packet) => {
  console.log(`[CHAT] ${packet.source_name}: ${packet.message}`)
})

bot.on('disconnect', () => {
  console.log("Bot disconnesso dal server")
})

bot.on('error', (err) => {
  console.log("Errore:", err)
})