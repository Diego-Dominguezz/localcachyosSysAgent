const OLLAMA_URL = "http://127.0.0.1:11434/api/generate";

// 👉 MODELO AQUÍ
// Usa "mistral" (≈4 GB, excelente balance)
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
      console.error("❌ Error HTTP:", response.status);
      return null;
    }

    const data = await response.json();

    if (!data || !data.response) {
      console.error("❌ Respuesta inválida de Ollama:", data);
      return null;
    }

    return data.response;

  } catch (err) {
    console.error("❌ Error conectando con Ollama:", err.message);
    return null;
  }
}

module.exports = { askLLM };
