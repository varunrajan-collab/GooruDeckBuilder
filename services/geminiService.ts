import { GoogleGenAI, Type, Modality } from "@google/genai";
import { DeckContent, ImageSize, SlideType, VoiceAccent } from "../types";

export const generateDeckText = async (competency: string): Promise<DeckContent> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Act as a Lead Educational Engineer. Your mission is to generate a high-quality 15-slide educational deck from this competency: "${competency}".

    UNIVERSAL CONTENT REFINEMENT: "THE SCAFFOLDING RULE"
    1. Audience Calibration: Determine the target audience's likely age (e.g., 10yo vs 17yo).
       - For Younger Learners (K-8): Use "Concrete-Relatable" language and analogies involving playgrounds or toys.
       - For Older Learners (9-12+): Use "Advanced Academic" language and analogies involving driving, professional sports, or technology.
    2. Concept Progression: Every explanation must follow this strict 3-sentence structure:
       - Sentence 1 (The Anchor): State the concept clearly using age-appropriate technical terms.
       - Sentence 2 (The Elaborated Analogy): Bridge the concept to a common relevant experience.
       - Sentence 3 (The Application): Explain its real-world importance based on the competency.
    3. No Bullets: Use cohesive, descriptive mini-paragraphs. No lists. This ensures the narration sounds like a professional talk.

    AUDIO & SYNC LOGIC:
    - audioScript: REQUIRED FOR ALL SLIDES. Podcast-quality conversational narration (50-100 words).
    - Integrated Visual Narration: For Deep Dive slides, the script MUST reference the image (e.g., "If you look at the diagram on the right, you can see the purple arrow...").
    - Quiz Narrations: Provide a "Hint-style overview" that helps the learner reason through the problem (e.g., "Think about whether the push or the pull is stronger here!").
    - Clean Scripting: Do not use math symbols like Σ, Δ, or LaTeX. Use full words (e.g., "sum of", "change in").

    VISUAL REQUIREMENTS:
    - visualPrompt: Detailed prompt for a "3D claymation" style infographic. Specify layout (split-screen comparison or hero diagram) and use mint green and soft purple colors with bold text labels.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          topic: { type: Type.STRING },
          slides: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, enum: [SlideType.INTRO, SlideType.DEEP_DIVE, SlideType.VOCABULARY, SlideType.SCENARIO, SlideType.CONCLUSION] },
                title: { type: Type.STRING },
                content: { type: Type.STRING },
                audioScript: { type: Type.STRING },
                audioDurationEstimate: { type: Type.NUMBER },
                visualPrompt: { type: Type.STRING },
                vocabulary: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      term: { type: Type.STRING },
                      definition: { type: Type.STRING },
                    },
                    required: ["term", "definition"],
                  },
                },
                quiz: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING },
                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                    correctIndex: { type: Type.INTEGER },
                  },
                  required: ["question", "options", "correctIndex"],
                },
              },
              required: ["type", "title", "content", "audioScript", "audioDurationEstimate"],
            },
          },
        },
        required: ["topic", "slides"],
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("No content generated");
  
  return JSON.parse(text) as DeckContent;
};

export const generateDeckImage = async (imagePrompt: string, size: ImageSize): Promise<string | undefined> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const fullPrompt = `${imagePrompt}. 3D claymation style, soft lighting, depth of field, mint green and soft purple colors. Bold legible labels.`;

  const isHighRes = size === "2K" || size === "4K";
  const model = isHighRes ? "gemini-3-pro-image-preview" : "gemini-2.5-flash-image";

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: { parts: [{ text: fullPrompt }] },
      config: {
        imageConfig: {
            aspectRatio: "16:9",
            ...(isHighRes ? { imageSize: size } : {})
        }
      }
    });

    for (const candidate of response.candidates || []) {
        for (const part of candidate.content.parts || []) {
            if (part.inlineData) {
                return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
    }
    throw new Error("No image data");
  } catch (e) {
    console.error("Image generation failed", e);
    return undefined;
  }
};

export const generateSlideAudio = async (text: string, accent: VoiceAccent): Promise<string | undefined> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  let voiceName = 'Kore';
  let accentInstr = 'American English';
  
  if (accent === 'British') { voiceName = 'Puck'; accentInstr = 'refined British English'; }
  else if (accent === 'Indian') { voiceName = 'Kore'; accentInstr = 'warm Indian English'; }
  else if (accent === 'Nigerian') { voiceName = 'Kore'; accentInstr = 'lively Nigerian English'; }

  // Sanitization: Remove symbols that crash TTS or cause reading errors
  const cleanText = text
    .replace(/Σ/g, "sum of ")
    .replace(/Δ/g, "change in ")
    .replace(/≠/g, "is not equal to ")
    .replace(/≈/g, "is approximately ")
    .replace(/±/g, "plus or minus ")
    .replace(/[\$\#\@\*\^\{\}\[\]]/g, ''); // Strip markup

  const promptText = `Speak naturally in a ${accentInstr} accent: ${cleanText}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: promptText }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName }
          }
        }
      }
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (e) {
    console.error("Audio generation failed", e);
    return undefined;
  }
};