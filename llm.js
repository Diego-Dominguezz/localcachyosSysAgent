const OLLAMA_URL = "http://127.0.0.1:11434/api/generate";

// ========================================
// RECOMMENDED MODELS FOR SYSTEM TASKS
// ========================================
// For best results with system administration and troubleshooting,
// use reasoning-capable models:
//
// 1. qwen2.5-coder:32b    - Best for complex system tasks (19GB)
// 2. deepseek-r1:8b       - Excellent reasoning capabilities (4.9GB) 
// 3. deepseek-coder:33b   - Great for debugging issues (19GB)
// 4. codestral:22b        - Good balance of speed/capability (13GB)
// 5. mistral:7b           - Lightweight, faster but less capable (4.1GB)
//
// Install with: ollama pull <model-name>
// ========================================

const MODEL = "mistral";

async function askLLM(systemPrompt, userInput) {
  try {
    const response = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        prompt: `${systemPrompt}

USER:
${userInput}

ASSISTANT:
`,
        stream: false
      })
    });

    if (!response.ok) {
      console.error("❌ HTTP Error:", response.status);
      return null;
    }

    const data = await response.json();

    if (!data || !data.response) {
      console.error("❌ Invalid response from Ollama:", data);
      return null;
    }

    return data.response;

  } catch (err) {
    console.error("❌ Error connecting to Ollama:", err.message);
    return null;
  }
}

module.exports = { askLLM };
