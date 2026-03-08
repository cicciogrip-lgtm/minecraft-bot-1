const bedrock = require('bedrock-protocol')

function startBot(){

const bot = bedrock.createClient({
  host: 'Valkyrie1.aternos.me',
  port: 28603,
  username: 'MobileBot',
  offline: true
})

bot.on('spawn', () => {
  console.log("Bot entrato nel server")
})

bot.on('text', (packet) => {
  console.log(`[CHAT] ${packet.source_name}: ${packet.message}`)
})

bot.on('disconnect', () => {
  console.log("Disconnesso, riconnessione tra 5 secondi...")
  setTimeout(startBot, 5000)
})

bot.on('error', (err) => {
  console.log("Errore:", err)
})

}

startBot()
