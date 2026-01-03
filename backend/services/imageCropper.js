// backend/services/imageCropper.js
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

class ImageCropper {
  constructor() {
    this.questionsDir = path.join(__dirname, '../questions');
  }

  async initialize() {
    await fs.mkdir(this.questionsDir, { recursive: true });
  }

  async cropQuestions(pageImagePath, boundingBoxes, testId) {
    await this.initialize();
    const testDir = path.join(this.questionsDir, testId);
    await fs.mkdir(testDir, { recursive: true });

    const croppedQuestions = [];

    for (const questionData of boundingBoxes) {
      try {
        const { questionNumber, boundingBox } = questionData;
        const { x, y, width, height } = boundingBox;

        const filename = `q${questionNumber}_${uuidv4()}.png`;
        const outputPath = path.join(testDir, filename);

        await sharp(pageImagePath)
          .extract({
            left: Math.max(0, Math.floor(x)),
            top: Math.max(0, Math.floor(y)),
            width: Math.floor(width),
            height: Math.floor(height)
          })
          .png({ quality: 90, compressionLevel: 6 })
          .toFile(outputPath);

        const imageUrl = `/questions/${testId}/${filename}`;

        croppedQuestions.push({
          questionNumber,
          questionImageUrl: imageUrl,
          correctOption: null
        });
      } catch (error) {
        console.error(`Failed to crop question ${questionData.questionNumber}:`, error);
      }
    }

    return croppedQuestions;
  }

  async replaceQuestionImage(testId, oldImageUrl, newImageBuffer) {
    const filename = `replaced_${uuidv4()}.png`;
    const testDir = path.join(this.questionsDir, testId);
    const outputPath = path.join(testDir, filename);

    await sharp(newImageBuffer).png({ quality: 90 }).toFile(outputPath);

    if (oldImageUrl) {
      const oldPath = path.join(__dirname, '..', oldImageUrl);
      try {
        await fs.unlink(oldPath);
      } catch (error) {
        console.log('Old image already deleted or not found');
      }
    }

    return `/questions/${testId}/${filename}`;
  }

  async deleteTestImages(testId) {
    const testDir = path.join(this.questionsDir, testId);
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Failed to delete test images:', error);
    }
  }
}

module.exports = new ImageCropper();