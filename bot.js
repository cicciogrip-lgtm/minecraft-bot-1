const bedrock = require('bedrock-protocol')

const HOST = 'Valkyrie1.aternos.me'
const PORT = 28603

let bot = null
let afkInterval = null

function connect() {

  console.log("Tentativo di connessione...")

  bot = bedrock.createClient({
    host: HOST,
    port: PORT,
    username: 'MobileBot',
    offline: true
  })

  bot.on('spawn', () => {
    console.log("Bot entrato nel server")
    startAntiAFK()
  })

  bot.on('disconnect', () => {
    console.log("Disconnesso. Riprovo tra 6 secondi...")
    stopAntiAFK()
    setTimeout(connect, 6000)
  })

  bot.on('error', (err) => {
    console.log("Errore:", err)
    stopAntiAFK()
    setTimeout(connect, 6000)
  })
}

function startAntiAFK() {

  if (afkInterval) return

  afkInterval = setInterval(() => {

    if (!bot || !bot.entity) return

    try {

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

      console.log("Movimento anti AFK")

    } catch {}

  }, 30000)
}

function stopAntiAFK() {
  if (afkInterval) {
    clearInterval(afkInterval)
    afkInterval = null
  }
}

connect()  stopAntiAFK()

  setTimeout(() => {
    reconnecting = false
    connect()
  }, 6000)
}

function startAntiAFK() {

  if (afkInterval) return

  afkInterval = setInterval(() => {

    if (!bot || !bot.entity) return

    try {

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

      console.log("Movimento anti AFK")

    } catch {}

  }, 30000)
}

function stopAntiAFK() {
  if (afkInterval) {
    clearInterval(afkInterval)
    afkInterval = null
  }
}

connect()reconnecting = true

console.log("Disconnesso. Riprovo tra 6 secondi...")

stopAntiAFK()

setTimeout(() => {

  reconnecting = false
  connect()

}, 6000)

}

function startAntiAFK(){

if(afkInterval) return

afkInterval = setInterval(() => {

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

    console.log("Movimento anti AFK")

  }catch{}

}, 30000)

}

function stopAntiAFK(){

if(afkInterval){
  clearInterval(afkInterval)
  afkInterval = null
}

}

connect()        x: Math.random() * 0.2,
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
