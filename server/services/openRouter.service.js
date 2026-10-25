import axios from "axios"

export const askAi = async (messages, { json = false, temperature } = {}) => {
    try {
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            throw new Error("Messages array is empty.")
        }

        const body = {
            model: process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini",
            messages,
            ...(Number.isFinite(temperature) ? { temperature } : {}),
        }
        if (json) body.response_format = { type: "json_object" }

        const response = await axios.post(
            "https://openrouter.ai/api/v1/chat/completions",
            body,
            {
                headers: {
                    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json",
                },
                timeout: 30000,
            }
        )

        const content = response?.data?.choices?.[0]?.message?.content
        if (!content || !content.trim()) {
            throw new Error("AI returned empty response.")
        }
        return content
    } catch (error) {
        console.error("OpenRouter Error:", error.response?.data || error.message)
        throw new Error("OpenRouter API Error")
    }
}