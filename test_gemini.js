const { GoogleGenerativeAI } = require("@google/generative-ai");
// Environment variables will be loaded via Node flag

async function testGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not defined in .env");
    return;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  
  try {
    console.log("Testing with gemini-1.5-flash...");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Hola, responde con un 'OK' si recibes este mensaje.");
    const response = await result.response;
    console.log("Gemini Response:", response.text());
    console.log("Connection SUCCESSFUL!");
  } catch (error) {
    console.error("Gemini gemini-1.5-flash FAILED:", error.message);
    
    try {
      console.log("Attempting to list models...");
      // The library might not have a direct listModels but we can try common ones
      const altModel = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      const result = await altModel.generateContent("OK?");
      const response = await result.response;
      console.log("Gemini 1.5 Pro Response:", response.text());
      console.log("Connection SUCCESSFUL with 1.5 Pro!");
    } catch (err2) {
      console.error("Gemini 1.5 Pro also FAILED:", err2.message);
    }
  }
}

testGemini();
