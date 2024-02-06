import { Configuration, OpenAIApi } from "openai";

/**
 *
 * @returns
 */
const completion = async (dataIn = "") => {
  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const openai = new OpenAIApi(configuration);
  try {
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        // Aquí proporciona el historial de mensajes de la conversación
        { role: "system", content: "Inicio de la conversación" }, // Mensaje inicial
        { role: "user", content: dataIn }, // Mensaje del usuario
      ],
      max_tokens: 256,
      temperature: 0,
    });
    return response.data;
  } catch (error) {
    console.error("Error al completar el texto:", error);
    throw error; // Re-throw para manejar el error en un nivel superior si es necesario
  }
};

export default { completion };
