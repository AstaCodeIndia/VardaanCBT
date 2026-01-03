// backend/services/pdfProcessor.js
const fs = require('fs').promises;
const path = require('path');
const { fromPath } = require('pdf2pic');
const sharp = require('sharp');

class PDFProcessor {
  constructor() {
    this.uploadDir = path.join(__dirname, '../uploads');
    this.tempDir = path.join(__dirname, '../temp');
  }

  async initialize() {
    await fs.mkdir(this.uploadDir, { recursive: true });
    await fs.mkdir(this.tempDir, { recursive: true });
  }

  async convertPDFToImages(pdfPath) {
    await this.initialize();

    const options = {
      density: 300,
      saveFilename: 'page',
      savePath: this.tempDir,
      format: 'png',
      width: 2480,
      height: 3508
    };

    const converter = fromPath(pdfPath, options);
    const imagePaths = [];
    let pageNum = 1;
    
    try {
      while (true) {
        const result = await converter(pageNum, { responseType: 'image' });
        if (!result || !result.path) break;
        
        const optimizedPath = path.join(this.tempDir, `page_${pageNum}_optimized.png`);
        await sharp(result.path).png({ quality: 95, compressionLevel: 6 }).toFile(optimizedPath);
        
        imagePaths.push(optimizedPath);
        pageNum++;
      }
    } catch (error) {
      if (pageNum === 1) throw error;
    }

    return imagePaths;
  }

  async cleanup() {
    try {
      const files = await fs.readdir(this.tempDir);
      await Promise.all(files.map(file => fs.unlink(path.join(this.tempDir, file))));
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }
}

module.exports = new PDFProcessor();