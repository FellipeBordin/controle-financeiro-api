import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  throw new Error("OPENAI_API_KEY não definida no .env");
}

export const openai = new OpenAI({
  apiKey,
});
