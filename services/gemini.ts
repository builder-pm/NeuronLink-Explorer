import { ChatMessage, AIAction, DataRow, SemanticContext } from '../types';
import { generateSemanticContext } from '../utils/contextBuilder';

// Helper to get API Key (checks process.env and standard Vite env vars)

const getApiKey = () => {
  if (typeof process !== 'undefined' && process.env && process.env.OPENROUTER_API_KEY) {
    return process.env.OPENROUTER_API_KEY;
  }
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_OPENROUTER_API_KEY) {
    // @ts-ignore
    return import.meta.env.VITE_OPENROUTER_API_KEY;
  }
  // Fallback for local dev if user didn't prefix with VITE_ but we are in Vite
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.OPENROUTER_API_KEY) {
    // @ts-ignore
    return import.meta.env.OPENROUTER_API_KEY;
  }
  return null;
};

const getModel = () => {
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_OPENROUTER_MODEL) {
    // @ts-ignore
    return import.meta.env.VITE_OPENROUTER_MODEL;
  }
  return "z-ai/glm-4.5-air:free";
}

const OPENROUTER_API_KEY = getApiKey();
const OPENROUTER_MODEL = getModel();
const SITE_URL = 'http://localhost:5173'; // Default for local dev
const SITE_NAME = 'NeuronLink Lakehouse';

const BASE_SYSTEM_INSTRUCTION = `You are a helpful and expert AI assistant for "NeuronLink", a data lakehouse analysis platform.
Your goal is to help a non-technical user understand and manipulate their data.

You have two main modes of operation depending on the user's current context:
1. **MODELING**: Use this when the user is setting up their Data Model (selecting tables/fields).
2. **ANALYSIS**: Use this when the user is analyzing an existing Model (pivoting/filtering).

**CRITICAL GOVERNANCE RULE**:
You must ONLY speak about and suggest fields/tables that are explicitly listed in the "SEMANTIC CONTEXT" below.
Do not hallucinate columns that do not exist in the context.
If a user asks for a field not in the context, check if it exists in "OTHER AVAILABLE TABLES" and use the suggest_fields action.

---

### ACTION PROTOCOL

You must respond with a JSON object containing a "command" and a "response".

#### 1. MODELING MODE (Creating a Config)
If the user asks to "analyze inventory" or "track sales", and no model is selected (or they want to change it):
- Generate \`propose_model\` action.
- Select relevant tables and fields from the 'Available Tables' context.
- Infer natural joins based on foreign keys or naming conventions (e.g., customer_id).
- JSON Format:
  \`\`\`json
  {
      "command": {
          "action": "propose_model",
          "modelProposal": {
              "modelConfiguration": { "table_name": ["field1", "field2"] },
              "joins": [ { "from": "t1", "to": "t2", "type": "INNER JOIN", "on": { "from": "id", "to": "id" } } ]
          }
      },
      "response": "I've drafted a model for analyzing [Scope]. Does this look right?"
  }
  \`\`\`

#### 2. ANALYSIS MODE (Exploring Data)
If the user is in Analysis View and asks to "pivot by...", "filter for...", or "count...":
- **Pivot/Filter**:
  - Map their natural language ONLY to the "Selected Model Fields".
  - output \`propose_analysis\` (replaces old "pivot"/"filter").
  - JSON Format:
    \`\`\`json
    {
        "command": {
            "action": "propose_analysis",
            "analysisProposal": {
                "pivotConfig": { "rows": ["..."], "columns": [], "values": [{"field": "...", "aggregation": "SUM"}] },
                "filters": []
            }
        },
        "response": "I've set up the view to show [description]."
    }
    \`\`\`
- **Ad-Hoc Query**:
  - If they ask a specific question ("How many rentals from Canada?"):
  - Generate a valid SQL query using ONLY "Selected Model Fields".
  - JSON Format:
     \`\`\`json
    {
        "command": { "action": "query", "query": "SELECT ..." },
        "response": "Checking the database..."
    }
    \`\`\`

#### 3. SUGGEST FIELDS (Expansion Protocol)
If the user asks for data that requires tables/fields NOT in the current model but visible in "OTHER AVAILABLE TABLES":
- Generate \`suggest_fields\` action to recommend adding fields.
- **IMPORTANT**: Include all necessary \`suggestedJoins\` to connect the new tables to the existing model.
- JSON Format:
  \`\`\`json
  {
      "command": {
          "action": "suggest_fields",
          "suggestedFields": [
              { "table": "category", "fields": ["name", "category_id"] },
              { "table": "film_category", "fields": ["film_id", "category_id"] }
          ],
          "suggestedJoins": [
              { "from": "film", "to": "film_category", "type": "LEFT JOIN", "on": { "from": "film_id", "to": "film_id" } },
              { "from": "film_category", "to": "category", "type": "LEFT JOIN", "on": { "from": "category_id", "to": "category_id" } }
          ],
          "reason": "To analyze films by category, we need to add the category and film_category tables."
      },
      "response": "I can help with that! But first, I'll need to add some fields to your model. Click 'Add Fields' to include the category information."
  }
  \`\`\`

#### 4. GENERAL CHAT
- If no action is needed, return \`"command": null\`.

---

### METADATA USAGE GUIDE
When answering questions, leverage the semantic context:
- **Field descriptions**: Use these to understand what each field represents.
- **Sample values**: Use these to suggest valid filter values (e.g., "ratings like PG, R, PG-13").
- **Metrics**: Reference available metrics when discussing calculations.

---
`;

function generateSystemPrompt(context: SemanticContext): string {
  const isModeling = context.view === 'modeling';

  // Build tiered semantic context using contextBuilder
  const semanticContextString = generateSemanticContext({
    modelConfiguration: context.modelConfiguration,
    joins: context.joins,
    fieldMetadata: context.fieldMetadata,
    metrics: context.metrics,
    schemaRegistry: context.schemaRegistry ? { tables: context.schemaRegistry.tables } : undefined,
    sampleValues: context.sampleValues,
    maxChars: 8000 // Reserve space for system prompt
  });

  let modeInstructions = '';
  if (isModeling) {
    modeInstructions = `
**CURRENT MODE: MODELING**
The user is building their data model. Help them select tables and configure joins.
Use propose_model action to suggest table configurations.`;
  } else {
    modeInstructions = `
**CURRENT MODE: ANALYSIS**  
The user is analyzing their configured model.
Use propose_analysis for pivot/filter operations.
Use query for direct SQL questions.
Use suggest_fields if they need data outside their current model.`;
  }

  return `${BASE_SYSTEM_INSTRUCTION}\n${modeInstructions}\n\n${semanticContextString}`;
}

export async function getAIResponse(
  history: ChatMessage[],
  prompt: string,
  context: SemanticContext
): Promise<{ action: AIAction | null; textResponse: string }> {

  if (!OPENROUTER_API_KEY) {
    console.warn("OpenRouter API Key missing. Please set OPENROUTER_API_KEY in .env.local");
    return {
      action: null,
      textResponse: "AI Assistant configuration missing (API Key). Please check .env.local."
    };
  }

  // Use a capable model available on OpenRouter
  const model = OPENROUTER_MODEL;
  const systemPrompt = generateSystemPrompt(context);

  // Transform history to OpenAI format
  const messages = history.slice(-6).map(msg => ({
    role: msg.role === 'model' ? 'assistant' : msg.role,
    content: msg.text
  }));

  // Prepend system prompt
  messages.unshift({ role: 'system', content: systemPrompt } as any);

  // Append current user prompt
  messages.push({ role: 'user', content: prompt });

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": SITE_URL, // Optional, for including your app on openrouter.ai rankings.
        "X-Title": SITE_NAME, // Optional. Shows in rankings on openrouter.ai.
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": model,
        "messages": messages,
        "response_format": { "type": "json_object" } // Enforce JSON
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API Error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    let jsonStr = content.trim();
    
    // Improved JSON extraction: try to find the actual JSON object if it's wrapped in text
    if (!jsonStr.startsWith('{')) {
      const startIdx = jsonStr.indexOf('{');
      const endIdx = jsonStr.lastIndexOf('}');
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        jsonStr = jsonStr.substring(startIdx, endIdx + 1);
      }
    }

    // Strip markdown fences if still present (fallback)
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) jsonStr = match[2].trim();

    let parsedData: any = {};
    try {
      parsedData = JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse AI JSON:", jsonStr);
      return { action: null, textResponse: "I couldn't process the AI response format." };
    }

    const action = parsedData.command as AIAction | null;
    const textResponse = parsedData.response || "No response text provided.";

    // Basic validation
    if (action && !action.action) {
      return { action: null, textResponse: "I tried to act, but got confused (Invalid Action)." };
    }

    return { action, textResponse };

  } catch (e) {
    console.error("AI Error:", e);
    return {
      action: null,
      textResponse: "I'm having trouble connecting to my brain (OpenRouter) right now. Try again?"
    };
  }
}

export async function getAIResponseWithData(
  prompt: string,
  query: string,
  data: DataRow[]
): Promise<string> {
  if (!OPENROUTER_API_KEY) return "AI Assistant not configured.";

  const model = OPENROUTER_MODEL;
  const summarizationPrompt = `User Question: "${prompt}"\nSQL Context: "${query}"\nData Result: ${JSON.stringify(data.slice(0, 20))}\n\nTask: Give a concise natural language answer based on the data.`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": SITE_URL,
        "X-Title": SITE_NAME,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": model,
        "messages": [
          { "role": "user", "content": summarizationPrompt }
        ]
      })
    });

    if (!response.ok) throw new Error("OpenRouter error");

    const resData = await response.json();
    return resData.choices?.[0]?.message?.content || "No summary available.";

  } catch (e) {

    return "Found data, but couldn't summarize it.";

  }

}



/**

 * Generates concise, professional descriptions for a list of database tables.

 */

export async function generateTableDescriptions(tableNames: string[]): Promise<Record<string, string>> {

  if (!OPENROUTER_API_KEY || tableNames.length === 0) {

    return tableNames.reduce((acc, name) => ({ ...acc, [name]: '' }), {});

  }



  const model = OPENROUTER_MODEL;

  const prompt = `Generate short, professional descriptions (max 1 sentence) for these database tables: ${tableNames.join(', ')}.

  Return ONLY a JSON object where keys are table names and values are descriptions.

  Example: { "users": "Stores user account information and authentication details." }`;



  try {

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {

      method: "POST",

      headers: {

        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,

        "HTTP-Referer": SITE_URL,

        "X-Title": SITE_NAME,

        "Content-Type": "application/json"

      },

      body: JSON.stringify({

        "model": model,

        "messages": [

          { "role": "system", "content": "You are a database architect who provides concise documentation." },

          { "role": "user", "content": prompt }

        ],

        "response_format": { "type": "json_object" }

      })

    });



    if (!response.ok) throw new Error(`OpenRouter API Error: ${response.statusText}`);



    const data = await response.json();

    let content = data.choices?.[0]?.message?.content || "{}";



    // Robust JSON parsing (strip fences if present)

    content = content.trim();

    if (content.startsWith('```')) {

      content = content.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '');

    }



    let descriptions: Record<string, string> = {};

    try {

      descriptions = JSON.parse(content);

    } catch (e) {

      console.error("Failed to parse table descriptions JSON:", content);

    }



    // Ensure all requested tables have at least an empty string if AI missed some

    const result: Record<string, string> = {};

    tableNames.forEach(name => {

      result[name] = descriptions[name] || '';

    });



    return result;



  } catch (e) {

    console.error("Failed to generate table descriptions:", e);

    return tableNames.reduce((acc, name) => ({ ...acc, [name]: '' }), {});

  }

}

