// backend/services/visionAI.js
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs').promises;

class VisionAI {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  async detectQuestionBoundaries(imagePath) {
    try {
      const imageBuffer = await fs.readFile(imagePath);
      const base64Image = imageBuffer.toString('base64');

      const prompt = `You are analyzing an exam question paper image. 

CRITICAL RULES:
1. Each question includes: question text + diagrams/graphs + all 4 options (A, B, C, D)
2. Return ONLY valid JSON, no markdown, no explanation
3. Detect ALL questions visible on this page
4. Each bounding box must include the ENTIRE question block (text + options + diagrams)

Return this exact JSON format:
{
  "questions": [
    {
      "questionNumber": 1,
      "boundingBox": {
        "x": 90,
        "y": 120,
        "width": 1850,
        "height": 680
      }
    }
  ]
}

Analyze the image and return question bounding boxes.`;

      const result = await this.model.generateContent([
        prompt,
        { inlineData: { mimeType: 'image/png', data: base64Image } }
      ]);

      const response = await result.response;
      const text = response.text();
      const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleanText);
      
      return parsed.questions || [];
    } catch (error) {
      console.error('Vision AI Error:', error);
      throw new Error(`Vision AI failed: ${error.message}`);
    }
  }

  async fallbackDetection(imagePath, questionsPerPage = 5) {
    const sharp = require('sharp');
    const metadata = await sharp(imagePath).metadata();
    const pageHeight = metadata.height;
    const pageWidth = metadata.width;
    const questionHeight = Math.floor(pageHeight / questionsPerPage);
    
    const questions = [];
    for (let i = 0; i < questionsPerPage; i++) {
      questions.push({
        questionNumber: i + 1,
        boundingBox: {
          x: 50,
          y: i * questionHeight + 50,
          width: pageWidth - 100,
          height: questionHeight - 100
        }
      });
    }
    return questions;
  }
}

module.exports = new VisionAI();