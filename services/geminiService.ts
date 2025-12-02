import { GoogleGenAI, Type, Schema } from "@google/genai";
import { JobParseResult } from "../types";

// Helper to ensure API key exists
const getGenAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Parses raw text (e.g., a pasted job description) into structured data.
 */
export const parseJobDescription = async (text: string): Promise<JobParseResult> => {
  const ai = getGenAI();

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      company: { type: Type.STRING, description: "The name of the company hiring." },
      role: { type: Type.STRING, description: "The job title or role." },
      location: { type: Type.STRING, description: "The location of the job (e.g. Remote, City)." },
      description: { type: Type.STRING, description: "A brief summary of the job description (max 2 sentences)." },
      keySkills: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING },
        description: "Top 5 technical or soft skills required." 
      }
    },
    required: ["company", "role", "keySkills"],
  };

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Extract the following details from this job description text: \n\n${text}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  });

  const jsonStr = response.text || "{}";
  return JSON.parse(jsonStr) as JobParseResult;
};

/**
 * Generates interview questions based on the job description.
 */
export const generateInterviewQuestions = async (role: string, company: string, description: string): Promise<string[]> => {
  const ai = getGenAI();

  const schema: Schema = {
    type: Type.ARRAY,
    items: { type: Type.STRING },
    description: "A list of 5 interview questions."
  };

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `I am applying for the position of ${role} at ${company}. 
    Based on the job description below, generate 5 likely interview questions I should prepare for.
    
    Job Description:
    ${description.substring(0, 2000)}`, // Truncate to save tokens if massive
    config: {
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  });

  const jsonStr = response.text || "[]";
  return JSON.parse(jsonStr) as string[];
};

/**
 * Analyzes an email to extract potential events (dates) or summaries.
 */
export const analyzeEmail = async (emailBody: string): Promise<{ summary: string; suggestedEvent?: { title: string; date: string } }> => {
  const ai = getGenAI();

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      summary: { type: Type.STRING, description: "A one sentence summary of the email content." },
      suggestedEvent: {
        type: Type.OBJECT,
        nullable: true,
        properties: {
          title: { type: Type.STRING },
          date: { type: Type.STRING, description: "ISO 8601 date string if a date is mentioned, otherwise null." }
        }
      }
    },
    required: ["summary"]
  };

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Analyze this email correspondence regarding a job application. 
    Summarize it and identify if there are any specific dates mentioned for interviews or meetings.
    Current Date for reference: ${new Date().toISOString()}
    
    Email Body:
    ${emailBody}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  });

  const jsonStr = response.text || "{}";
  return JSON.parse(jsonStr);
};
