import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ChatMessage, AIAction, DataRow } from '../types';

let ai: GoogleGenAI | null = null;
try {
    // Defensively check for `process` to avoid ReferenceError in browser environments.
    // The execution environment is expected to provide this.
    if(typeof process !== 'undefined' && process.env && process.env.API_KEY) {
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
} catch (e) {
    console.error("Failed to initialize GoogleGenAI:", e);
}


const systemInstruction = `You are a helpful and expert AI assistant for a data analysis application called NeuronLink.
Your goal is to help a non-technical user understand and manipulate a dataset.
The available tables are 'jobs', 'countries', and 'sources'. Their schemas are implicitly defined by the available fields: [{availableFields}].

When the user asks a question or gives a command, you must do two things:
1.  First, determine if the user's request is a command to modify the data view (like pivoting or filtering), OR if it requires querying the database for an answer (e.g., "how many...").
    -   If it's a pivot/filter command, generate a JSON object with "action": "pivot" or "action": "filter".
        -   Example pivot: "show me total jobs by country name" -> \`{"action": "pivot", "config": {"rows": ["country_name"], "columns": [], "values": [{"field": "total_jobs", "aggregation": "SUM"}]}}\`
        -   Example filter: "show me data for Canada" -> \`{"action": "filter", "config": {"field": "country_name", "operator": "equals", "value": "Canada"}}\`
    -   If the request requires getting data from the database (e.g., "what is the most common language", "how many jobs from Nike?"), generate a JSON object with "action": "query" and a "query" key containing a valid SQLite query.
        -   Example query: "how many jobs are from Nike?" -> \`{"action": "query", "query": "SELECT count(*) FROM jobs WHERE advertiser = 'Nike';"}\`
        -   Example query: "what are the top 3 languages?" -> \`{"action": "query", "query": "SELECT language, count(*) as count FROM jobs GROUP BY language ORDER BY count DESC LIMIT 3;"}\`
    -   If the request is a simple question that doesn't require a command (e.g., "what is this app?"), the "command" key should be null.

2.  Second, you MUST provide a friendly, natural language text response to the user.
    - If you generated a pivot/filter command, confirm what you did (e.g., "Sure, I've created a pivot table...").
    - If you generated a query command, tell the user you are looking up the answer (e.g., "Let me check the database for you...").
    - If there's no command, just provide the answer.

The final response format MUST be a single JSON object like this:
{
  "command": <JSON object for the command (pivot, filter, or query), or null>,
  "response": "<Your friendly text response to the user>"
}
`;


export async function getAIResponse(
  history: ChatMessage[],
  prompt: string,
  availableFields: string[]
): Promise<{ action: AIAction | null; textResponse: string }> {
  
  if (!ai) {
      return {
          action: null,
          textResponse: "The AI Assistant has not been configured with an API key. Please add your API_KEY to the environment variables."
      };
  }

  const model = "gemini-2.5-flash-preview-04-17";
  const fullSystemInstruction = systemInstruction.replace('{availableFields}', availableFields.join(', '));
  
  // Only use the last 6 messages to keep the context concise
  const recentHistory = history.slice(-6);
  const contents = recentHistory.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.text }]
  }));
  contents.push({ role: 'user', parts: [{ text: prompt }] });

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: model,
        contents: contents,
        config: {
            systemInstruction: fullSystemInstruction,
            responseMimeType: "application/json",
            temperature: 0,
        },
    });

    let jsonStr = response.text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }
    
    const parsedData = JSON.parse(jsonStr);

    const action = parsedData.command as AIAction | null;
    const textResponse = parsedData.response || "I'm not sure how to respond to that. Please try again.";

    // Basic validation
    if (action && !action.action) {
        console.error("Invalid action received from AI:", action);
        return { action: null, textResponse: "I tried to perform an action, but the structure was invalid." };
    }

    return { action, textResponse };

  } catch (e) {
    console.error("Failed to parse or fetch AI response:", e);
    // Fallback response for errors
    return {
      action: null,
      textResponse: "I'm having a little trouble thinking right now. Please try your request again in a moment."
    };
  }
}

export async function getAIResponseWithData(
  prompt: string,
  query: string,
  data: DataRow[]
): Promise<string> {
    if (!ai) return "AI Assistant not configured.";

    const model = "gemini-2.5-flash-preview-04-17";
    const summarizationPrompt = `The user asked: "${prompt}". You generated the SQL query: "${query}". The result of the query is this JSON: ${JSON.stringify(data)}. Based on this data, formulate a concise, natural language response to the user's original question.`;
    
    try {
        const response = await ai.models.generateContent({
            model,
            contents: summarizationPrompt,
        });
        return response.text;
    } catch(e) {
        console.error("Failed to get summary from AI:", e);
        return "I found some data, but had trouble summarizing it. The raw result is: " + JSON.stringify(data);
    }
}