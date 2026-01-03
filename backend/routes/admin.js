// backend/routes/admin.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { authenticate, authorize } = require('../middleware/authenticate');
const { Test, Question } = require('../models');
const pdfProcessor = require('../services/pdfProcessor');
const visionAI = require('../services/visionAI');
const imageCropper = require('../services/imageCropper');

const router = express.Router();

// Multer setup for PDF upload
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads');
    await fs.mkdir(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files allowed'));
    }
  }
});

// Upload PDF and extract questions
router.post('/upload-pdf', authenticate, authorize('admin'), upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'PDF file required' });
    }

    const { testName } = req.body;
    if (!testName) {
      return res.status(400).json({ error: 'Test name required' });
    }

    const pdfPath = req.file.path;

    // Step 1: Convert PDF to images
    console.log('📄 Converting PDF to images...');
    const pageImages = await pdfProcessor.convertPDFToImages(pdfPath);

    // Step 2: Create test record
    const test = await Test.create({
      name: testName,
      isPublished: false,
      totalQuestions: 0
    });

    let allQuestions = [];
    let globalQuestionNumber = 1;

    // Step 3: Process each page
    for (let pageIndex = 0; pageIndex < pageImages.length; pageIndex++) {
      const pageImage = pageImages[pageIndex];
      
      console.log(`📸 Processing page ${pageIndex + 1}...`);
      
      // Step 4: Detect questions using Vision AI
      let detectedQuestions;
      try {
        detectedQuestions = await visionAI.detectQuestionBoundaries(pageImage);
        
        if (!detectedQuestions || detectedQuestions.length === 0) {
          console.log('⚠️ AI detection failed, using fallback');
          detectedQuestions = await visionAI.fallbackDetection(pageImage, 5);
        }
      } catch (error) {
        console.error('Vision AI error:', error);
        detectedQuestions = await visionAI.fallbackDetection(pageImage, 5);
      }

      // Assign global question numbers
      const questionsWithNumbers = detectedQuestions.map(q => ({
        ...q,
        questionNumber: globalQuestionNumber++
      }));

      // Step 5: Crop questions
      console.log(`✂️ Cropping ${questionsWithNumbers.length} questions...`);
      const croppedQuestions = await imageCropper.cropQuestions(
        pageImage,
        questionsWithNumbers,
        test.id
      );

      allQuestions = allQuestions.concat(croppedQuestions);
    }

    // Step 6: Save questions to database
    const questionRecords = await Question.bulkCreate(
      allQuestions.map(q => ({
        testId: test.id,
        questionNumber: q.questionNumber,
        questionImageUrl: q.questionImageUrl,
        correctOption: null
      }))
    );

    // Update test question count
    await test.update({ totalQuestions: allQuestions.length });

    // Cleanup
    await pdfProcessor.cleanup();
    await fs.unlink(pdfPath);

    res.json({
      success: true,
      test: {
        id: test.id,
        name: test.name,
        totalQuestions: allQuestions.length
      },
      questions: questionRecords
    });

  } catch (error) {
    console.error('PDF upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all tests
router.get('/tests', authenticate, authorize('admin'), async (req, res) => {
  try {
    const tests = await Test.findAll({
      include: [
        {
          model: Question,
          attributes: ['id', 'questionNumber']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ tests });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get test with questions
router.get('/tests/:testId', authenticate, authorize('admin'), async (req, res) => {
  try {
    const test = await Test.findByPk(req.params.testId, {
      include: [
        {
          model: Question,
          order: [['questionNumber', 'ASC']]
        }
      ]
    });

    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    res.json({ test });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update question
router.put('/questions/:questionId', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { correctOption } = req.body;
    
    if (correctOption && !['A', 'B', 'C', 'D'].includes(correctOption)) {
      return res.status(400).json({ error: 'Invalid option' });
    }

    const question = await Question.findByPk(req.params.questionId);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    await question.update({ correctOption });

    res.json({ success: true, question });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete question
router.delete('/questions/:questionId', authenticate, authorize('admin'), async (req, res) => {
  try {
    const question = await Question.findByPk(req.params.questionId);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    await question.destroy();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Publish test
router.post('/tests/:testId/publish', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { conductDate, visibilityDate } = req.body;
    
    const test = await Test.findByPk(req.params.testId, {
      include: [Question]
    });

    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    // Validate all questions have correct answers
    const incomplete = test.Questions.filter(q => !q.correctOption);
    if (incomplete.length > 0) {
      return res.status(400).json({
        error: `${incomplete.length} questions missing correct answers`
      });
    }

    await test.update({
      isPublished: true,
      conductDate: conductDate || new Date(),
      visibilityDate: visibilityDate || new Date()
    });

    res.json({ success: true, test });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete test
router.delete('/tests/:testId', authenticate, authorize('admin'), async (req, res) => {
  try {
    const test = await Test.findByPk(req.params.testId);
    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    await imageCropper.deleteTestImages(test.id);
    await test.destroy();

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;