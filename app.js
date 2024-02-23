import 'dotenv/config'
import bot from '@bot-whatsapp/bot'
import QRPortalWeb from '@bot-whatsapp/portal'
import BaileysProvider from '@bot-whatsapp/provider/baileys'
import MockAdapter from '@bot-whatsapp/database/mock'

import GoogleSheetService from './services/sheets/index.js'
import run from './services/openai/testgpt.js'
const googelSheet = new GoogleSheetService(process.env.ExcelUrl)

// DON'T DELETE

const paymentOptions = ['Tarjeta', 'Efectivo', 'Transferencia']
const productOptions = []
let order = []
let orderQuantity = []
let orderSpecs = []

const flowPrincipal = bot.addKeyword([bot.EVENTS.WELCOME]).addAction(async (ctx, { flowDynamic, state, gotoFlow }) => {
  try {
    const mensaje = await ctx.body

    // const regexp = /men[u\u00FA]/gim
    const regexp = /pedir/gim
    const coincidencias = mensaje.match(regexp)

    const newHistory = (state.getMyState()?.history ?? [])

    console.log(newHistory)
    newHistory.push({ role: 'user', content: ctx.body })

    // true && true
    if (coincidencias || mensaje === '1') {
      console.log('Ahio')
      return gotoFlow(flowMenu)
    }

    const ai = await run(newHistory)
    await flowDynamic(ai)
    newHistory.push({ role: 'system', content: ai })
    await state.update({ history: newHistory })
  } catch (error) {
    console.log(error)
  }
})

const flowMenu = bot
  .addKeyword(['pedir'])
  .addAnswer(
    'Hoy tenemos las siguientes opciones en inventario:',
    null,
    async (_, { flowDynamic }) => {
      const getMenu = await googelSheet.retriveDayMenu()

      let menuString = ''

      menuString += 'Te interesa alguno de nuestros productos? \n'

      let id = 1

      for (const menu of getMenu) {
        console.log(menu)
        menuString += `${id}. ${menu}\n`
        productOptions.push(menu.split('-')[0])
        id++
      }

      menuString += '\n\nPuedes escribir "Terminar" para salir de este menú.'

      await flowDynamic(menuString)
    }
  )
  .addAnswer(
    'Recuerda, por favor, seleccionar un numero',
    { capture: true },
    async (ctx, { gotoFlow, state }) => {
      // Log the items in the inventory to be sure everything's all right
      console.log('ITEMS EN INVENTARIO: \n' + productOptions.join('\n'))

      let txt = ctx.body
      const digitsRegexp = /\d+/gim
      const terminarRegexp = /terminar/gim

      txt = digitsRegexp.test(txt) ? txt.match(digitsRegexp).join(' ') : txt

      if (terminarRegexp.test(txt)) {
        console.log('Terminado')
        return gotoFlow(flowPrincipal)
      }

      for (let i = 0; i < productOptions.length; i++) {
        if (txt > 0 && txt <= productOptions.length) {
          console.log('Pedido: ', productOptions[parseInt(txt) - 1])
          // state.update({ pedido: productOptions[parseInt(txt) - 1] })
          order.push(productOptions[parseInt(txt) - 1])
          return
        }

        if (i === productOptions.length - 1) {
          return gotoFlow(flowEmpty)
        }
      }
    }
  )
  .addAnswer(
    'De qué size desea su pedido? (si su pedido no incluye talla, escriba un punto ".")',
    { capture: true },
    async (ctx, { gotoFlow, state }) => {
      // Log the items in the inventory to be sure everything's all right
      //
      const txt = ctx.body

      console.log('Spec: ', txt)
      // state.update({ cantidad: txt })
      orderSpecs.push(txt)
    }
  )
  .addAnswer(
    'Que cantidad desea?',
    { capture: true },
    async (ctx, { gotoFlow, state }) => {
      // Log the items in the inventory to be sure everything's all right
      //
      let txt = ctx.body
      const digitsRegexp = /\d+/gim

      txt = digitsRegexp.test(txt)
        ? parseInt(txt.match(digitsRegexp).join(' '))
        : txt

      if (typeof txt === 'number' && txt > 0) {
        console.log('Cantidad : ', txt)
        // state.update({ cantidad: txt })
        orderQuantity.push(txt)
      } else {
        return gotoFlow(flowEmpty)
      }
    }
  )
  .addAnswer(
    'Desea algo mas? \n\n1. Sí \n2. No \n\nCualquier opción fuera del menú se interpreta como "no"',
    { capture: true },
    async (ctx, { gotoFlow, state }) => {
      // Log the items in the inventory to be sure everything's all right
      //
      let txt = ctx.body
      const digitsRegexp = /\d+/gim

      txt = digitsRegexp.test(txt)
        ? parseInt(txt.match(digitsRegexp).join(' '))
        : txt

      if (txt === 1) {
        return gotoFlow(flowMenu)
      } else {
        return gotoFlow(flowPedido)
      }
    }
  )

const flowSalir = bot
  .addKeyword(bot.EVENTS.ACTION)
  .addAnswer(
    'Saliendo...',
    null,
    async (_, { gotoFlow }) => {
      order = []
      orderSpecs = []
      orderQuantity = []
      return gotoFlow(flowPrincipal)
    }
  )

const flowEmpty = bot
  .addKeyword(bot.EVENTS.ACTION)
  .addAnswer(
    'Disculpa, no he entendido tu pedido. Selecciona algo en entre las opciones.',
    null,
    async (_, { gotoFlow }) => {
      order = []
      orderSpecs = []
      orderQuantity = []
      return gotoFlow(flowMenu)
    }
  )

const flowPedido = bot
  .addKeyword(['pedir'], { sensitive: true })
  .addAnswer(
    '¿Cual es tu nombre?',
    { capture: true },
    async (ctx, { state }) => {
      state.update({ name: ctx.body })
    }
  )
  .addAnswer(
    'De que manera desea pagar? \n1. Tarjeta \n2. Efectivo \n3. Transferencia Bancaria',
    { capture: true },
    async (ctx, { state, gotoFlow, flowDynamic, fallBack }) => {
      let txt = ctx.body
      const digitsRegexp = /\d+/gim

      txt = digitsRegexp.test(txt) ? txt.match(digitsRegexp).join(' ') : txt

      const paymentOption = paymentOptions[parseInt(txt) - 1]

      console.log(paymentOption)

      console.log(paymentOptions.includes(paymentOption))

      for (let i = 0; i < paymentOptions.length; i++) {
        if (paymentOptions.includes(paymentOption)) {
          console.log('Metodo de pago: ', paymentOption)

          state.update({ tipoPago: paymentOption })
          return
        }

        if (i === paymentOptions.length - 1) {
          flowDynamic('Por favor, selecciona un metodo de pago valido')
          return fallBack()
        }
      }
    }
  )
  .addAnswer(
    '¿Tiene alguna observación del producto, como la persona que lo va a recibir,? (Escribe un mensaje)',
    { capture: true },
    async (ctx, { state }) => {
      state.update({ observaciones: ctx.body })
    }
  )
  .addAnswer(
    'Quieres un resumen de tu pedido? \n\n1. Sí \n2. No',
    { capture: true },
    async (ctx, { gotoFlow, state, flowDynamic }) => {
      let txt = ctx.body
      const digitsRegexp = /\d+/gim

      txt = digitsRegexp.test(txt)
        ? parseInt(txt.match(digitsRegexp).join(' '))
        : txt

      if (txt === 2) {
        return
      }

      let pedido = ''

      for (let i = 0; i < order.length; i++) {
        pedido += `\nPedido: ${orderQuantity[i]} x ${order[i]} \n`
      }

      await flowDynamic(
        `Aqui tiene un resumen de su pedido: \n\n${pedido} \nNombre: ${state.getMyState().name
        } \nTipo de pago: ${state.getMyState().tipoPago} \nObservaciones: ${state.getMyState().observaciones
        }`
      )
    }
  )
  .addAnswer(
    'Desea añadir algo a su pedido \n\n1. Sí (mostrar menú) \n2. No',
    { capture: true },
    async (ctx, { state, gotoFlow, flowDynamic }) => {
      let txt = ctx.body
      const digitsRegexp = /\d+/gim

      txt = digitsRegexp.test(txt)
        ? parseInt(txt.match(digitsRegexp).join(' '))
        : txt

      if (typeof txt !== 'number' || txt === 2) {
        return
      }

      return gotoFlow(flowMenu)
    }
  )
  .addAnswer(
    'Perfecto! Un representante se estara contactando contigo para informar del estado de tu pedido.',
    null,
    async (ctx, { state, gotoFlow }) => {
      // For each element in the order array (and the order quantity array since they ought to be the same length)
      for (let i = 0; i < order.length; i++) {
        state.update({ pedido: order[i] })
        state.update({ cantidad: orderQuantity[i] })
        state.update({ especificacion: orderSpecs[i] })

        const currentState = state.getMyState()
        console.log(currentState.pedido)
        console.log(currentState.cantidad)
        await googelSheet.saveOrder({
          fecha: new Date().toDateString(),
          telefono: ctx.from,
          pedido: currentState.pedido,
          especificacion: currentState.especificacion,
          cantidad: currentState.cantidad,
          nombre: currentState.name,
          tipoPago: currentState.tipoPago,
          observaciones: currentState.observaciones
        })
      }

      return gotoFlow(flowPrincipal)
    }
  )

const main = async () => {
  const adapterDB = new MockAdapter()
  const adapterFlow = bot.createFlow([
    flowPrincipal,
    flowMenu,
    flowPedido,
    flowSalir,
    flowEmpty
  ])
  const adapterProvider = bot.createProvider(BaileysProvider)

  bot.createBot({
    flow: adapterFlow,
    provider: adapterProvider,
    database: adapterDB
  })

  QRPortalWeb()
}

main()
