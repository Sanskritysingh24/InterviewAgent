export const parseAiJson = (raw) => {
  const cleaned = String(raw).replace(/```json|```/gi, "").trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    const start = cleaned.indexOf("{")
    const end = cleaned.lastIndexOf("}")
    if (start !== -1 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1))
    }
    throw new Error("AI did not return valid JSON")
  }
}