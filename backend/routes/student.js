// backend/routes/student.js
const express = require('express');
const { authenticate } = require('../middleware/authenticate');
const { Test, Question, Submission, User } = require('../models');
const { Op } = require('sequelize');

const router = express.Router();

// Get all published tests
router.get('/tests', authenticate, async (req, res) => {
  try {
    const tests = await Test.findAll({
      where: {
        isPublished: true,
        visibilityDate: {
          [Op.lte]: new Date()
        }
      },
      attributes: ['id', 'name', 'conductDate', 'totalQuestions', 'createdAt'],
      order: [['conductDate', 'DESC']]
    });

    // Check which tests user has attempted
    const submissions = await Submission.findAll({
      where: { userId: req.user.userId },
      attributes: ['testId', 'score', 'percentage']
    });

    const submissionMap = {};
    submissions.forEach(sub => {
      submissionMap[sub.testId] = {
        attempted: true,
        score: sub.score,
        percentage: sub.percentage
      };
    });

    const testsWithStatus = tests.map(test => ({
      ...test.toJSON(),
      attempted: submissionMap[test.id]?.attempted || false,
      score: submissionMap[test.id]?.score,
      percentage: submissionMap[test.id]?.percentage
    }));

    res.json({ tests: testsWithStatus });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get test questions (start test)
router.get('/tests/:testId/questions', authenticate, async (req, res) => {
  try {
    const test = await Test.findByPk(req.params.testId, {
      include: [
        {
          model: Question,
          attributes: ['id', 'questionNumber', 'questionImageUrl'],
          order: [['questionNumber', 'ASC']]
        }
      ]
    });

    if (!test || !test.isPublished) {
      return res.status(404).json({ error: 'Test not found or not published' });
    }

    // Check if already attempted
    const existingSubmission = await Submission.findOne({
      where: {
        userId: req.user.userId,
        testId: test.id
      }
    });

    if (existingSubmission) {
      return res.status(400).json({ 
        error: 'Test already attempted',
        submission: existingSubmission
      });
    }

    res.json({ test });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submit test
router.post('/tests/:testId/submit', authenticate, async (req, res) => {
  try {
    const { answers, timeTaken } = req.body;
    // answers format: [{ questionId: 'uuid', selectedOption: 'A' }, ...]

    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'Invalid answers format' });
    }

    const test = await Test.findByPk(req.params.testId, {
      include: [Question]
    });

    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    // Check duplicate submission
    const existingSubmission = await Submission.findOne({
      where: {
        userId: req.user.userId,
        testId: test.id
      }
    });

    if (existingSubmission) {
      return res.status(400).json({ error: 'Test already submitted' });
    }

    // Grade answers
    let correctCount = 0;
    const results = [];

    for (const question of test.Questions) {
      const studentAnswer = answers.find(ans => ans.questionId === question.id);
      const selectedOption = studentAnswer?.selectedOption || null;
      const isCorrect = selectedOption === question.correctOption;

      if (isCorrect) correctCount++;

      results.push({
        questionId: question.id,
        questionNumber: question.questionNumber,
        selectedOption,
        correctOption: question.correctOption,
        isCorrect
      });
    }

    const totalQuestions = test.Questions.length;
    const percentage = (correctCount / totalQuestions) * 100;

    // Calculate level progression
    const user = await User.findByPk(req.user.userId);
    const levelIncrease = Math.floor(percentage / 10);
    const newLevel = Math.min(100, user.level + levelIncrease);
    await user.update({ level: newLevel });

    // Save submission
    const submission = await Submission.create({
      userId: req.user.userId,
      testId: test.id,
      answers: results,
      score: correctCount,
      totalQuestions,
      correctAnswers: correctCount,
      timeTaken,
      percentage
    });

    res.json({
      success: true,
      submission: {
        id: submission.id,
        score: correctCount,
        totalQuestions,
        percentage,
        timeTaken,
        results,
        newLevel
      }
    });

  } catch (error) {
    console.error('Submit error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get student dashboard stats
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const submissions = await Submission.findAll({
      where: { userId: req.user.userId },
      include: [
        {
          model: Test,
          attributes: ['name', 'conductDate']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    const user = await User.findByPk(req.user.userId);

    let totalQuestions = 0;
    let totalCorrect = 0;
    let totalIncorrect = 0;

    submissions.forEach(sub => {
      totalQuestions += sub.totalQuestions;
      totalCorrect += sub.correctAnswers;
      totalIncorrect += (sub.totalQuestions - sub.correctAnswers);
    });

    const accuracy = totalQuestions > 0 
      ? ((totalCorrect / totalQuestions) * 100).toFixed(2)
      : 0;

    res.json({
      stats: {
        level: user.level,
        testsAttempted: submissions.length,
        totalQuestions,
        correctAnswers: totalCorrect,
        incorrectAnswers: totalIncorrect,
        accuracy: parseFloat(accuracy)
      },
      recentTests: submissions.map(sub => ({
        testName: sub.Test.name,
        score: sub.score,
        totalQuestions: sub.totalQuestions,
        percentage: sub.percentage,
        timeTaken: sub.timeTaken,
        attemptedAt: sub.createdAt
      }))
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get submission details
router.get('/submissions/:submissionId', authenticate, async (req, res) => {
  try {
    const submission = await Submission.findOne({
      where: {
        id: req.params.submissionId,
        userId: req.user.userId
      },
      include: [
        {
          model: Test,
          include: [Question]
        }
      ]
    });

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    res.json({ submission });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;