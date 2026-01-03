// frontend/src/pages/TestResults.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/Results.css';

const TestResults = ({ user }) => {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResults();
  }, [submissionId]);

  const fetchResults = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/student/submissions/${submissionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setSubmission(data.submission);
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Failed to fetch results:', error);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (loading) return <div className="loading">Loading results...</div>;
  if (!submission) return <div>Results not found</div>;

  const correctCount = submission.answers.filter(a => a.isCorrect).length;
  const incorrectCount = submission.totalQuestions - correctCount;
  const percentage = (correctCount / submission.totalQuestions * 100).toFixed(1);

  return (
    <div className="results-container">
      <div className="results-header">
        <h1>Test Results</h1>
        <button onClick={() => navigate('/dashboard')} className="btn-secondary">
          Back to Dashboard
        </button>
      </div>

      <div className="results-summary">
        <div className="summary-card primary">
          <h2>Score</h2>
          <p className="score">{correctCount}/{submission.totalQuestions}</p>
          <p className="percentage">{percentage}%</p>
        </div>

        <div className="summary-card">
          <h3>Correct Answers</h3>
          <p className="stat-large correct">{correctCount}</p>
        </div>

        <div className="summary-card">
          <h3>Incorrect Answers</h3>
          <p className="stat-large incorrect">{incorrectCount}</p>
        </div>

        <div className="summary-card">
          <h3>Time Taken</h3>
          <p className="stat-large">{formatTime(submission.timeTaken)}</p>
        </div>
      </div>

      <div className="detailed-results">
        <h2>Question-wise Analysis</h2>
        
        <div className="questions-grid">
          {submission.answers.map((answer, index) => (
            <div 
              key={index}
              className={`result-card ${answer.isCorrect ? 'correct' : 'incorrect'}`}
            >
              <div className="result-header">
                <span className="q-number">Q{answer.questionNumber}</span>
                <span className={`result-badge ${answer.isCorrect ? 'correct' : 'incorrect'}`}>
                  {answer.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                </span>
              </div>

              <div className="result-details">
                <div className="answer-row">
                  <span>Your Answer:</span>
                  <span className="answer-badge">
                    {answer.selectedOption || 'Not Answered'}
                  </span>
                </div>
                {!answer.isCorrect && (
                  <div className="answer-row">
                    <span>Correct Answer:</span>
                    <span className="answer-badge correct">
                      {answer.correctOption}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TestResults;
