import { GoogleGenAI } from "@google/genai";

export async function generateWarehouseVisuals() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const prompts = [
    {
      id: '2d',
      text: 'A clean, professional 2D top-down warehouse blueprint for an electronics inventory dashboard. Organized rectangular zones labeled Zone-A (Laptops/Smartphones), Zone-B (Audio/Gaming), Zone-C (Monitors/Cameras), and Zone-D (Networking). Shelving units are color-coded: green for healthy stock, red for low stock. Modern UI design, minimalist aesthetic.',
    },
    {
      id: '3d',
      text: 'A high-tech 3D digital twin of an electronics warehouse. Isometric view of metal racks filled with electronics boxes (Gaming consoles, Cameras, Laptops). Floating holographic data tags showing stock levels. Some racks have a soft red glow indicating low stock. Cinematic lighting, professional logistics software look.',
    }
  ];

  const results = await Promise.all(prompts.map(async (p) => {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: p.text }] },
      config: { imageConfig: { aspectRatio: "16:9" } }
    });

    let imageUrl = '';
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        imageUrl = `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return { id: p.id, url: imageUrl };
  }));

  return results;
}
