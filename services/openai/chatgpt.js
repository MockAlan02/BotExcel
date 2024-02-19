import { Configuration, OpenAIApi } from 'openai'
import fs from 'fs'
import { ChatGPTAPI } from 'chatgpt'

/**
 *
 * @returns
 */
const contenidoPrompt = fs.readFileSync(
  './services/openai/prompt/VENDEDOR.txt',
  'utf-8'
)

class ChatGpt {
  openai = null
  openai2 = null
  queue = []

  constructor () {
    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY
    })
    this.openai = new OpenAIApi(configuration)
    this.openai2 = new ChatGPTAPI(configuration)
  }

  async completion (dataIn = '') {
    try {
      const response = await this.openai.createChatCompletion({
        model: 'gpt-3.5-turbo',
        messages: [
          // Aquí proporciona el historial de mensajes de la conversación
          { role: 'system', content: 'Inicio de la conversación' }, // Mensaje inicial
          { role: 'user', content: dataIn } // Mensaje del usuario
        ],
        max_tokens: 256,
        temperature: 0
      })
      return response.data
    } catch (error) {
      console.error('Error al completar el texto:', error)
      throw error // Re-throw para manejar el error en un nivel superior si es necesario
    }
  }

  addContext = (text) => {
    this.queue.push(text)
  }

  handleMsg = async (body) => {
    const completion = await this.openai2.sendMessage(body, {
      systemMessage: contenidoPrompt,
      conversationId: !this.queue.length
        ? undefined
        : this.queue[this.queue.length - 1].conversationId,
      parentMessageId: !this.queue.length
        ? undefined
        : this.queue[this.queue.length - 1].id
    })

    this.queue.push(completion)
    return completion.text
  }
}
export default ChatGpt
