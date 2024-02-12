import "dotenv/config";
import bot from "@bot-whatsapp/bot";
import QRPortalWeb from "@bot-whatsapp/portal";
import BaileysProvider from "@bot-whatsapp/provider/baileys";
import MockAdapter from "@bot-whatsapp/database/mock";

import ChatGpt from "./services/openai/chatgpt.js";
import GoogleSheetService from "./services/sheets/index.js";
const chatgpt = new ChatGpt();
const googelSheet = new GoogleSheetService(
  process.env.ExcelUrl
  "1Qey5DU5rEsXzayrA28_TkP-Hc9P8-CHTI3LAeew1YYc"
);

const GLOBAL_STATE = [];
const saludos = ["Hola", "Buenas", "Buenos", "Saludos", "Qué tal", "Hola qué tal", "Hola!", "Hey", "Hola de nuevo", "Hola amigo", "¡Hola!", "Hola a todos"];

const flowPrincipal = bot
  .addKeyword(saludos)
  .addAction({ capture: true }, async (ctx, { flowDynamic, fallBack }) => {
    var regex = /\bmenu\b/i;
    var coincidencias = ctx.body.match(regex);
    if (!coincidencias) {
      flowDynamic(await chatgpt.handleMsg(ctx));
      return fallBack();
    }
  });

const flowMenu = bot
  .addKeyword("menu")
  .addAnswer(
    `Hoy tenemos el siguiente menu:`,
    null,
    async (_, { flowDynamic }) => {
      const getMenu = await googelSheet.retriveDayMenu();
      for (const menu of getMenu) {
        GLOBAL_STATE.push(menu);
        await flowDynamic(menu);
      }
    }
  )
  .addAnswer(
    `Te interesa alguno?`,
    { capture: true },
    async (ctx, { gotoFlow, state }) => {
      const txt = ctx.body;
      const check = await chatgpt.completion(`
    Nuestros productos son:
    "9TATE.join("\n")}
    "
    El cliente quiere "${txt}"
    Basado en lo que tenemos en el menu y lo que quiere el cliente determinar (EXISTE, NO_EXISTE).
    La orden del cliente
    `);

      const getCheck = check.choices[0].message.content;
      console.log("Check: ", getCheck);
      if (getCheck.includes("NO_EXISTE")) {
        return gotoFlow(flowEmpty);
      } else {
        console.log("Pedido: ", ctx.body);
        state.update({ pedido: ctx.body });
        return gotoFlow(flowPedido);
      }
    }
  );

const flowEmpty = bot
  .addKeyword(bot.EVENTS.ACTION)
  .addAnswer("No te he entendido!", null, async (_, { gotoFlow }) => {
    return gotoFlow(flowMenu);
  });

const flowPedido = bot
  .addKeyword(["pedir"], { sensitive: true })
  .addAnswer(
    "¿Cual es tu nombre?",
    { capture: true },
    async (ctx, { state }) => {
      state.update({ name: ctx.body });
    }
  )
  .addAnswer(
    "¿Alguna observacion?",
    { capture: true },
    async (ctx, { state }) => {
      state.update({ observaciones: ctx.body });
    }
  )
  .addAnswer(
    "Perfecto tu pedido estara listo en un aprox 20min",
    null,
    async (ctx, { state }) => {
      const currentState = state.getMyState();
      console.log(currentState);
      await googelSheet.saveOrder({
        fecha: new Date().toDateString(),
        telefono: ctx.from,
        pedido: currentState.pedido,
        nombre: currentState.name,
        observaciones: currentState.observaciones,
      });
    }
  );

const main = async () => {
  const adapterDB = new MockAdapter();
  const adapterFlow = bot.createFlow([
    flowPrincipal,
    flowMenu,
    flowPedido,
    flowEmpty,
  ]);
  const adapterProvider = bot.createProvider(BaileysProvider);

  bot.createBot({
    flow: adapterFlow,
    provider: adapterProvider,
    database: adapterDB,
  });

  QRPortalWeb();
};

main();
