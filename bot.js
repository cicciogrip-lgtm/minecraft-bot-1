const bedrock = require('bedrock-protocol')

const HOST = 'Valkyrie1.aternos.me'
const PORT = 28603

function startBot(){

console.log("Avvio bot...")

const bot = bedrock.createClient({
  host: HOST,
  port: PORT,
  username: 'MobileBot',
  offline: true
})

bot.on('spawn', () => {

  console.log("Bot entrato nel server")

  antiAFK(bot)

})

function antiAFK(bot){

setInterval(() => {

  try{

    bot.queue('player_auth_input', {
      pitch: 0,
      yaw: Math.random() * 360,
      head_yaw: Math.random() * 360,
      position: bot.entity.position,
      move_vector: {
        x: Math.random() * 0.2,
        z: Math.random() * 0.2
      },
      input_data: {},
      tick: BigInt(Date.now())
    })

    console.log("Anti AFK movimento")

  }catch{}

}, 30000)

}

bot.on('disconnect', () => {

  console.log("Disconnesso, riprovo tra 10 secondi...")

  setTimeout(startBot, 10000)

})

bot.on('error', (err) => {

  console.log("Errore:", err)

})

}

startBot()
