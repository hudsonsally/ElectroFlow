import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function getInventoryInsights(inventoryData: any[]) {
  const prompt = `Analyze this warehouse inventory data and provide 4-5 actionable insights.
  Include:
  1. PREDICTIVE ANALYSIS: Identify items that are selling slowly or not at all.
  2. SUGGESTIONS: For slow-moving stock, suggest specific actions like:
     - Moving to a "Clearance Section".
     - Offering specific discount percentages.
     - Creating "Combo Deals" with faster-moving related products.
  3. STOCK ALERTS: Identify items that are below their minimum threshold and need immediate reordering.
  4. OPTIMIZATION: Suggest layout or logistics improvements.

  Data: ${JSON.stringify(inventoryData)}
  
  Return the response in JSON format with an array of objects called 'insights', each having:
  - 'title': A concise headline.
  - 'description': Detailed analysis and specific suggestion.
  - 'priority': 'High', 'Medium', or 'Low'.
  - 'type': 'Predictive', 'Alert', 'Optimization', or 'Marketing'.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            insights: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  priority: { type: Type.STRING },
                  type: { type: Type.STRING }
                },
                required: ["title", "description", "priority", "type"]
              }
            }
          },
          required: ["insights"]
        }
      }
    });

    return JSON.parse(response.text || '{"insights": []}');
  } catch (error) {
    console.error("Gemini Insight Error:", error);
    return { insights: [] };
  }
}

export async function chatWithInventory(message: string, dbContext: any) {
  const prompt = `You are ElectroFlow AI, a world-class electronics logistics and warehouse management expert. 
  You have real-time access to the ElectroFlow inventory database.
  
  CORE RESPONSIBILITIES:
  1. Provide precise stock levels, SKU details, and order statuses.
  2. Offer expert advice on high-value electronics handling (ESD safety, climate control, fragile packaging).
  3. Assist with inventory optimization across categories: Laptops, Smartphones, Audio, Monitors, Gaming, Wearables, Cameras, and Networking.
  4. Analyze global market trends, consumer demand, and tech news using Google Search to provide strategic inventory advice.
  5. All financial values are in Indian Rupees (₹).
  
  CURRENT WAREHOUSE STATE:
  ${JSON.stringify(dbContext)}
  
  USER QUERY: ${message}
  
  GUIDELINES:
  - Be professional, technical, and extremely concise.
  - Use Markdown for scannable tables and bullet points.
  - Prioritize "Actionable Intelligence" over long descriptions.
  - Use Google Search to cross-reference internal data with external market trends.
  - If stock is low for high-demand items, suggest immediate reordering based on market popularity.
  - Mention specific storage requirements (e.g., Zone-C) only if critical to the query.
  - Keep responses crisp and avoid unnecessary filler text.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }] // Allow general knowledge grounding
      }
    });

    return response.text || "I'm sorry, I couldn't process that request.";
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return "I'm having trouble connecting to my brain right now. Please try again.";
  }
}

export async function analyzeWarehouseBlueprint(base64Image: string, mimeType: string) {
  const prompt = `Analyze this warehouse blueprint/floor plan. 
  Identify the major storage zones, aisles, and any specific areas like loading docks or offices.
  Provide a structured summary of the layout including:
  1. List of detected Zones (e.g., Zone A, Zone B).
  2. Estimated number of racks or shelving units.
  3. A brief description of the flow (e.g., "Entrance is at the bottom, shipping on the right").
  
  Return the analysis in a professional, concise format.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { data: base64Image, mimeType } },
          { text: prompt }
        ]
      }
    });

    return response.text || "Analysis failed. Please try a clearer image.";
  } catch (error) {
    console.error("Blueprint Analysis Error:", error);
    return "Error analyzing blueprint. Ensure the file is a valid image.";
  }
}
