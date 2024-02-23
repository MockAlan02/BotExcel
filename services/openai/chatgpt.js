import 'dotenv/config'
import fs from 'fs'
import OpenAI from 'openai'

/**
 *
 *
 * @param {*} history
 * @returns
 */
const contenidoPrompt = fs.readFileSync(
  './services/openai/prompt/VENDEDOR.txt',
  'utf-8'
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})
const run = async (history) => {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: contenidoPrompt
        },
        ...history
      ],
      temperature: 1,
      max_tokens: 256,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    })
    return response.choices[0].message.content
  } catch (error) {
    console.error('Error:', error.message)
    return null
  }
}

export default run
