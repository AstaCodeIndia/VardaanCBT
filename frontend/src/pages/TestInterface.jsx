// frontend/src/pages/TestInterface.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/CBT.css';

const TestInterface = ({ user }) => {
  const { testId } = useParams();
  const navigate = useNavigate();
  
  const [test, setTest] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [markedForReview, setMarkedForReview] = useState(new Set());
  const [visited, setVisited] = useState(new Set([0]));
  const [startTime] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTest();
  }, [testId]);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime]);

  const fetchTest = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/student/tests/${testId}/questions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setTest(data.test);
      } else {
        const data = await response.json();
        alert(data.error);
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Failed to fetch test:', error);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (option) => {
    setAnswers({
      ...answers,
      [currentQuestion.id]: option
    });
  };

  const handleClearResponse = () => {
    const newAnswers = { ...answers };
    delete newAnswers[currentQuestion.id];
    setAnswers(newAnswers);
  };

  const handleMarkForReview = () => {
    const newMarked = new Set(markedForReview);
    if (newMarked.has(currentQuestion.id)) {
      newMarked.delete(currentQuestion.id);
    } else {
      newMarked.add(currentQuestion.id);
    }
    setMarkedForReview(newMarked);
  };

  const handleSaveAndNext = () => {
    if (currentQuestionIndex < test.Questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      setVisited(new Set([...visited, nextIndex]));
    }
  };

  const goToQuestion = (index) => {
    setCurrentQuestionIndex(index);
    setVisited(new Set([...visited, index]));
  };

  const handleSubmit = async () => {
    const answeredCount = Object.keys(answers).length;
    const unansweredCount = test.Questions.length - answeredCount;
    
    if (unansweredCount > 0) {
      if (!confirm(`You have ${unansweredCount} unanswered questions. Submit anyway?`)) {
        return;
      }
    }

    try {
      const token = localStorage.getItem('token');
      const submissionData = test.Questions.map(q => ({
        questionId: q.id,
        selectedOption: answers[q.id] || null
      }));

      const response = await fetch(`http://localhost:5000/api/student/tests/${testId}/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          answers: submissionData,
          timeTaken: elapsedTime
        })
      });

      if (response.ok) {
        const data = await response.json();
        navigate(`/results/${data.submission.id}`);
      } else {
        const data = await response.json();
        alert(data.error);
      }
    } catch (error) {
      console.error('Submit failed:', error);
      alert('Failed to submit test');
    }
  };

  const getQuestionStatus = (index, questionId) => {
    if (!visited.has(index)) return 'not-visited';
    if (markedForReview.has(questionId) && answers[questionId]) return 'marked-answered';
    if (markedForReview.has(questionId)) return 'marked';
    if (answers[questionId]) return 'answered';
    return 'visited';
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (loading) return <div className="loading">Loading test...</div>;
  if (!test) return <div>Test not found</div>;

  const currentQuestion = test.Questions[currentQuestionIndex];

  return (
    <div className="cbt-interface">
      <header className="cbt-header">
        <div className="header-left">
          <h1>{test.name}</h1>
          <span className="user-name">{user.username}</span>
        </div>
        <div className="header-right">
          <div className="timer">
            ⏱️ {formatTime(elapsedTime)}
          </div>
        </div>
      </header>

      <div className="cbt-body">
        <aside className="question-palette">
          <h3>Question Palette</h3>
          <div className="palette-grid">
            {test.Questions.map((q, index) => (
              <button
                key={q.id}
                className={`palette-btn ${getQuestionStatus(index, q.id)} ${index === currentQuestionIndex ? 'current' : ''}`}
                onClick={() => goToQuestion(index)}
              >
                {index + 1}
              </button>
            ))}
          </div>

          <div className="palette-legend">
            <div className="legend-item">
              <span className="legend-badge not-visited"></span>
              <span>Not Visited</span>
            </div>
            <div className="legend-item">
              <span className="legend-badge visited"></span>
              <span>Not Answered</span>
            </div>
            <div className="legend-item">
              <span className="legend-badge answered"></span>
              <span>Answered</span>
            </div>
            <div className="legend-item">
              <span className="legend-badge marked"></span>
              <span>Marked</span>
            </div>
            <div className="legend-item">
              <span className="legend-badge marked-answered"></span>
              <span>Answered & Marked</span>
            </div>
          </div>
        </aside>

        <main className="question-area">
          <div className="question-header">
            <h2>Question {currentQuestionIndex + 1} of {test.Questions.length}</h2>
          </div>

          <div className="question-content">
            <img
              src={`http://localhost:5000${currentQuestion.questionImageUrl}`}
              alt={`Question ${currentQuestionIndex + 1}`}
              className="question-snapshot"
            />
          </div>

          <div className="options-container">
            <div className="option-buttons">
              {['A', 'B', 'C', 'D'].map(option => (
                <button
                  key={option}
                  className={`option-btn ${answers[currentQuestion.id] === option ? 'selected' : ''}`}
                  onClick={() => handleSelectOption(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="navigation-buttons">
            <button onClick={handleClearResponse} className="btn-secondary">
              Clear Response
            </button>
            <button onClick={handleMarkForReview} className="btn-secondary">
              {markedForReview.has(currentQuestion.id) ? 'Unmark Review' : 'Mark for Review'}
            </button>
            <button onClick={handleSaveAndNext} className="btn-primary">
              Save & Next
            </button>
          </div>

          <div className="submit-section">
            <button onClick={handleSubmit} className="btn-submit">
              Submit Test
            </button>
          </div>
        </main>
      </div>
    </div>
  );
};

export default TestInterface;