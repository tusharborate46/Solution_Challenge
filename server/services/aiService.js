const { GoogleGenAI, Type, Schema } = require('@google/genai');

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || 'mock-key' 
});

const DEFAULT_MODEL = 'gemini-2.5-flash';

/**
 * Prompts the AI to analyze an emergency based on user responses.
 * @param {Array} questions - Questions asked by the system.
 * @param {Array} answers - Answers provided by the user.
 * @param {Object} location - The user's coordinates.
 * @returns {Object} Structured analysis { type, severity, requiredService, confidenceScore }
 */
async function analyzeEmergency(questions, answers, location) {
  try {
    const conversation = questions.map((q, i) => `Q: ${q}\nA: ${answers[i] || 'No answer'}`).join('\n');
    
    // Using mock if no actual key is configured
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'mock-key') {
      console.log('Using mock AI response for testing');
      return {
        type: 'medical',
        severity: 'high',
        requiredService: 'ambulance',
        confidenceScore: 0.85
      };
    }

    const prompt = `You are an AI Emergency Triage Agent. Analyze the following conversation between the system and a user experiencing an emergency.
Based on the conversation, classify the emergency.

Conversation context:
${conversation}

Determine:
1. type: One of "medical", "fire", "crime", "security", "general".
2. severity: One of "low", "medium", "high", "critical".
3. requiredService: The type of service needed (e.g., "ambulance", "police", "fire_truck").
4. confidenceScore: A number between 0 and 1 indicating how confident you are in this assessment.`;

    const schema = {
      type: Type.OBJECT,
      properties: {
        type: { type: Type.STRING },
        severity: { type: Type.STRING },
        requiredService: { type: Type.STRING },
        confidenceScore: { type: Type.NUMBER }
      },
      required: ['type', 'severity', 'requiredService', 'confidenceScore']
    };

    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      }
    });

    const result = JSON.parse(response.text);
    return result;
  } catch (error) {
    console.error('Error analyzing emergency:', error);
    return {
      type: 'general',
      severity: 'medium',
      requiredService: 'police', // safe default
      confidenceScore: 0.1
    };
  }
}

/**
 * Generate the next question to ask the user.
 */
async function generateNextQuestion(previousQuestions, previousAnswers, emergencyTypeHint) {
  if (previousQuestions.length === 0) {
    return "Emergency detected. What is your name and what is the exact nature of the emergency?";
  }
  
  if (previousQuestions.length === 1) {
    return "Are you in immediate danger, and what is your current condition? (e.g., critical, stable)";
  }

  if (previousQuestions.length === 2) {
    return "Is anyone else hurt or involved? What specific help do you need right now?";
  }

  return null; // Return null if we have enough info (3 questions asked)
}

module.exports = {
  analyzeEmergency,
  generateNextQuestion
};
