import { ChatMessage, AIAction, DataRow, SemanticContext } from '../types';
import { generateSemanticContext } from '../utils/contextBuilder';

// AI Engine Configuration
const getAiApiKey = () => {
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_NVIDIA_API_KEY) {
    // @ts-ignore
    return import.meta.env.VITE_NVIDIA_API_KEY;
  }
  return null;
};

const AI_API_KEY = getAiApiKey();
const AI_BASE_URL = '/api/ai-engine';

export interface LlmModel {
  id: string;
  name: string;
  provider: string;
}

export const AVAILABLE_MODELS: LlmModel[] = [
  { id: 'stepfun-ai/step-3.5-flash', name: 'Step 3.5 Flash', provider: 'StepFun' },
  { id: 'moonshotai/kimi-k2.5', name: 'Kimi K2.5', provider: 'Moonshot AI' },
  { id: 'minimaxai/minimax-m2.1', name: 'MiniMax M2.1', provider: 'MiniMax' },
];

export const DEFAULT_MODEL_ID = AVAILABLE_MODELS[0].id;

const BASE_SYSTEM_INSTRUCTION = `# IDENTITY

You are NeuronLink Co-pilot — an AI data analyst embedded in a lakehouse analysis platform.

## Personality
- **Concise and direct** — no filler ("Great question!", "Sure thing!"). Get to the point.
- **Technical but accessible** — explain data concepts simply for non-technical users.
- **Proactive** — after completing an action, suggest a logical next step.
- **Honest** — if unsure, say so and ask for clarification. Never guess field names.

---

# OUTPUT FORMAT

Your ENTIRE response must be a single valid JSON object. No markdown fences. No text outside the JSON.

\`\`\`json
{
    "thought": "Brief internal reasoning — what does the user want? Which action fits?",
    "confidence": "high | medium | low",
    "command": { ... } | null,
    "response": "User-facing message (1-3 sentences, conversational)"
}
\`\`\`

**Rules:**
- \`thought\` is REQUIRED — always reason before acting.
- \`confidence\` is REQUIRED — "high" = certain, "medium" = plausible inference, "low" = guessing.
- \`command\` is null when no action is needed (general chat, clarification, etc).
- \`response\` is REQUIRED — always write a user-facing message.

---

# DATA GOVERNANCE

**ABSOLUTE RULES — never violate these:**
1. ONLY reference fields/tables explicitly listed in the SEMANTIC CONTEXT below.
2. NEVER invent, hallucinate, or assume column names that are not in the context.
3. If a user asks for something not in the current model, check "OTHER AVAILABLE TABLES" first.
4. If it exists there → use \`suggest_fields\` action.
5. If it doesn't exist anywhere → say so honestly.

---

# ACTION PROTOCOL

## Action 1: \`propose_model\` (MODELING mode only)
When the user wants to set up or change their data model.

\`\`\`json
{
    "thought": "User wants to analyze rental patterns. I'll select rental, customer, and store tables.",
    "confidence": "high",
    "command": {
        "action": "propose_model",
        "modelProposal": {
            "modelConfiguration": { "table_name": ["field1", "field2"] },
            "joins": [{ "from": "t1", "to": "t2", "type": "INNER JOIN", "on": { "from": "id", "to": "id" } }]
        }
    },
    "response": "I've drafted a model for rental analysis with 3 tables. Shall I apply it?"
}
\`\`\`

## Action 2: \`propose_analysis\` (ANALYSIS mode only)
When the user wants to pivot, aggregate, or filter data.

\`\`\`json
{
    "thought": "User asks 'show revenue by country'. I'll pivot with country as rows, SUM(amount) as value.",
    "confidence": "high",
    "command": {
        "action": "propose_analysis",
        "analysisProposal": {
            "pivotConfig": { "rows": ["country"], "columns": [], "values": [{"field": "amount", "aggregation": "SUM"}] },
            "filters": []
        }
    },
    "response": "I've set up a pivot showing total revenue by country."
}
\`\`\`

## Action 3: \`query\` (ANALYSIS mode only)
For specific questions that need a direct SQL answer.

\`\`\`json
{
    "thought": "User asks 'how many rentals from Canada?'. This needs a COUNT query with a filter.",
    "confidence": "high",
    "command": { "action": "query", "query": "SELECT COUNT(*) AS rental_count FROM rental r JOIN customer c ON r.customer_id = c.customer_id JOIN address a ON c.address_id = a.address_id JOIN city ci ON a.city_id = ci.city_id JOIN country co ON ci.country_id = co.country_id WHERE co.country = 'Canada' LIMIT 100" },
    "response": "Let me check the database for Canadian rentals..."
}
\`\`\`

### SQL Safety Rules
- **Dialect**: PostgreSQL (Supabase)
- **Read-only**: ONLY use SELECT. NEVER use DELETE, UPDATE, DROP, ALTER, INSERT, TRUNCATE.
- **Safety net**: Always end with \`LIMIT 100\` unless the user explicitly asks for all rows.
- **Identifiers**: Use double quotes for column/table names with special characters.
- **Scope**: ONLY reference tables and columns from the SEMANTIC CONTEXT.

## Action 4: \`suggest_fields\`
When the user needs data from tables NOT in their current model but visible in OTHER AVAILABLE TABLES.

\`\`\`json
{
    "thought": "User wants category data, but 'category' isn't in the model. It's available in the registry.",
    "confidence": "high",
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
        "reason": "To analyze films by category, we need to connect through the film_category bridge table."
    },
    "response": "I can help with that! I need to add 2 tables to your model first. Click 'Add Fields' to include category information."
}
\`\`\`

## No Action: General Chat / Clarification
When no action is needed — answering questions, clarifying, explaining.

\`\`\`json
{
    "thought": "User is asking what a field means. No action needed, just explain.",
    "confidence": "high",
    "command": null,
    "response": "The 'rental_rate' field represents the daily cost to rent a film, stored as a decimal."
}
\`\`\`

---

# GUARDRAILS

## Ambiguous Input → Ask for Clarification
If the user's request could map to multiple actions or fields:
\`\`\`json
{
    "thought": "User said 'show me sales'. Could mean total amount, transaction count, or breakdown by region.",
    "confidence": "low",
    "command": null,
    "response": "I can help with sales! Could you clarify what you'd like to see?\\n• Total sales revenue\\n• Number of transactions\\n• Sales by region or category"
}
\`\`\`

## Off-Topic → Polite Redirect
If the user asks something unrelated to data analysis:
\`\`\`json
{
    "thought": "This is off-topic. I should redirect to data analysis.",
    "confidence": "high",
    "command": null,
    "response": "I'm built to help with data analysis in NeuronLink. Try asking about your tables, fields, or metrics — like 'Show me revenue by month' or 'What tables are available?'"
}
\`\`\`

---

# METADATA USAGE

When answering questions, actively leverage the semantic context:
- **Field descriptions**: Use these to understand and explain what each field represents.
- **Sample values**: Use these to suggest valid filter values (e.g., "You can filter by ratings: PG, R, PG-13, G").
- **Metrics**: Reference pre-defined metrics for calculations instead of writing raw SQL.
- **Foreign keys**: Use these to determine correct join paths.
`;

function generateSystemPrompt(context: SemanticContext): string {
  const isModeling = context.view === 'modeling';

  const semanticContextString = generateSemanticContext({
    modelConfiguration: context.modelConfiguration,
    joins: context.joins,
    fieldMetadata: context.fieldMetadata,
    metrics: context.metrics,
    schemaRegistry: context.schemaRegistry ? { tables: context.schemaRegistry.tables } : undefined,
    sampleValues: context.sampleValues,
    maxChars: 8000
  });

  let modeInstructions = '';
  if (isModeling) {
    modeInstructions = `
# CURRENT MODE: MODELING
The user is on the Data Model canvas — they can see tables, fields, and join lines.
**Valid actions**: \`propose_model\`, general chat.
**Invalid actions**: \`propose_analysis\`, \`query\` (no model confirmed yet).
Help them select tables, configure joins, and understand their schema.
If they ask analytical questions, gently remind them to confirm their model first.`;
  } else {
    modeInstructions = `
# CURRENT MODE: ANALYSIS
The user is on the Table/Pivot view — they can see their data grid and pivot controls.
**Valid actions**: \`propose_analysis\`, \`query\`, \`suggest_fields\`, general chat.
**Invalid actions**: \`propose_model\` (model is already set).
Help them pivot, filter, query, and explore their confirmed data model.
If they need fields from other tables, use \`suggest_fields\`.`;
  }

  return `${BASE_SYSTEM_INSTRUCTION}\n${modeInstructions}\n\n${semanticContextString}`;
}

export async function getAIResponse(
  history: ChatMessage[],
  prompt: string,
  context: SemanticContext,
  modelId: string = DEFAULT_MODEL_ID,
  signal?: AbortSignal
): Promise<{ action: AIAction | null; textResponse: string }> {

  if (!AI_API_KEY) {
    console.warn("AI Engine API Key missing. Please set VITE_NVIDIA_API_KEY in .env.local");
    return {
      action: null,
      textResponse: "AI Engine not configured. Please set the required API Key."
    };
  }

  const systemPrompt = generateSystemPrompt(context);

  // Transform history to OpenAI format
  const messages = history.slice(-6).map(msg => ({
    role: msg.role === 'model' ? 'assistant' : msg.role,
    content: msg.text
  }));

  messages.unshift({ role: 'system', content: systemPrompt } as any);
  messages.push({ role: 'user', content: prompt });

  try {
    const response = await fetch(AI_BASE_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${AI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": modelId,
        "messages": messages,
        "temperature": 0.2,
        "max_tokens": 4096
      }),
      signal
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("AI Engine Error:", response.status, errorBody);
      throw new Error(`AI Engine Error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    let jsonStr = content.trim();

    // Strip markdown fences if present
    const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[1]) jsonStr = match[1].trim();

    // Extract JSON object if wrapped in text
    if (!jsonStr.startsWith('{')) {
      const startIdx = jsonStr.indexOf('{');
      const endIdx = jsonStr.lastIndexOf('}');
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        jsonStr = jsonStr.substring(startIdx, endIdx + 1);
      }
    }

    let parsedData: any = {};
    try {
      parsedData = JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse AI JSON:", jsonStr);
      // If JSON parsing fails, treat the entire content as a text response
      return { action: null, textResponse: content || "I couldn't process the response format." };
    }

    // Log chain-of-thought for debugging
    if (parsedData.thought) {
      console.log(`🧠 AI Thought: ${parsedData.thought}`);
    }
    if (parsedData.confidence) {
      console.log(`📊 Confidence: ${parsedData.confidence}`);
    }

    const action = parsedData.command as AIAction | null;
    const textResponse = parsedData.response || "No response text provided.";

    if (action && !action.action) {
      return { action: null, textResponse };
    }

    return { action, textResponse };

  } catch (e) {
    console.error("AI Error:", e);
    return {
      action: null,
      textResponse: "I'm having trouble connecting to the AI Co-pilot right now. Try again?"
    };
  }
}

export async function getAIResponseWithData(
  prompt: string,
  query: string,
  data: DataRow[],
  modelId: string = DEFAULT_MODEL_ID
): Promise<string> {
  if (!AI_API_KEY) return "AI Assistant not configured.";
  const summarizationPrompt = `User Question: "${prompt}"\nSQL Context: "${query}"\nData Result: ${JSON.stringify(data.slice(0, 20))}\n\nTask: Give a concise natural language answer based on the data.`;

  try {
    const response = await fetch(AI_BASE_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${AI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": modelId,
        "messages": [
          { "role": "user", "content": summarizationPrompt }
        ],
        "temperature": 0.2,
        "max_tokens": 2048
      })
    });

    if (!response.ok) throw new Error("AI Engine error");

    const resData = await response.json();
    return resData.choices?.[0]?.message?.content || "No summary available.";

  } catch (e) {
    return "Found data, but couldn't summarize it.";
  }
}

export async function generateTableDescriptions(tableNames: string[]): Promise<Record<string, string>> {
  if (tableNames.length === 0) {
    return tableNames.reduce((acc, name) => ({ ...acc, [name]: '' }), {});
  }

  const prompt = `Generate short, professional descriptions (max 1 sentence) for these database tables: ${tableNames.join(', ')}.
  Return ONLY a JSON object where keys are table names and values are descriptions.
  Example: { "users": "Stores user account information and authentication details." }`;

  try {
    const response = await fetch(AI_BASE_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${AI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": DEFAULT_MODEL_ID,
        "messages": [
          { "role": "system", "content": "You are a database architect who provides concise documentation. Respond ONLY with valid JSON." },
          { "role": "user", "content": prompt }
        ],
        "temperature": 0.1,
        "max_tokens": 2048
      })
    });

    if (!response.ok) throw new Error(`AI Engine Error: ${response.statusText}`);

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "{}";

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
