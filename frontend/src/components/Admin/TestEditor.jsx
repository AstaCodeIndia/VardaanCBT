// frontend/src/components/Admin/TestEditor.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const TestEditor = ({ onUpdate }) => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTest();
  }, [testId]);

  const fetchTest = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/admin/tests/${testId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setTest(data.test);
        if (data.test.Questions.length > 0) {
          setSelectedQuestion(data.test.Questions[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch test:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateQuestion = async (questionId, updates) => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/admin/questions/${questionId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update local state
        setTest(prev => ({
          ...prev,
          Questions: prev.Questions.map(q => 
            q.id === questionId ? data.question : q
          )
        }));
        
        setSelectedQuestion(data.question);
      }
    } catch (error) {
      console.error('Failed to update question:', error);
    } finally {
      setSaving(false);
    }
  };

  const deleteQuestion = async (questionId) => {
    if (!confirm('Delete this question?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/admin/questions/${questionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setTest(prev => ({
          ...prev,
          Questions: prev.Questions.filter(q => q.id !== questionId)
        }));
        setSelectedQuestion(test.Questions[0]);
      }
    } catch (error) {
      console.error('Failed to delete question:', error);
    }
  };

  const publishTest = async () => {
    const incomplete = test.Questions.filter(q => !q.correctOption);
    if (incomplete.length > 0) {
      alert(`${incomplete.length} questions are missing correct answers`);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/admin/tests/${testId}/publish`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          conductDate: new Date(),
          visibilityDate: new Date()
        })
      });

      if (response.ok) {
        alert('Test published successfully!');
        onUpdate();
        navigate('/admin/tests');
      }
    } catch (error) {
      console.error('Failed to publish test:', error);
    }
  };

  if (loading) return <div className="loading">Loading test...</div>;
  if (!test) return <div>Test not found</div>;

  return (
    <div className="test-editor">
      <div className="editor-header">
        <div>
          <h1>{test.name}</h1>
          <p>{test.Questions.length} Questions</p>
        </div>
        <div className="header-actions">
          <button onClick={() => navigate('/admin/tests')} className="btn-secondary">
            Back to Tests
          </button>
          <button 
            onClick={publishTest} 
            className="btn-primary"
            disabled={test.isPublished}
          >
            {test.isPublished ? '✅ Published' : '📢 Publish Test'}
          </button>
        </div>
      </div>

      <div className="editor-layout">
        <aside className="question-list">
          <h3>Questions</h3>
          {test.Questions.map((q, index) => (
            <div
              key={q.id}
              className={`question-item ${selectedQuestion?.id === q.id ? 'active' : ''}`}
              onClick={() => setSelectedQuestion(q)}
            >
              <span className="q-number">Q{q.questionNumber}</span>
              {q.correctOption ? (
                <span className="correct-badge">{q.correctOption}</span>
              ) : (
                <span className="incomplete-badge">⚠️</span>
              )}
            </div>
          ))}
        </aside>

        <main className="question-editor">
          {selectedQuestion && (
            <>
              <div className="question-preview">
                <h2>Question {selectedQuestion.questionNumber}</h2>
                <img
                  src={`http://localhost:5000${selectedQuestion.questionImageUrl}`}
                  alt={`Question ${selectedQuestion.questionNumber}`}
                  className="question-image"
                />
              </div>

              <div className="answer-selector">
                <h3>Correct Answer</h3>
                <div className="option-buttons">
                  {['A', 'B', 'C', 'D'].map(option => (
                    <button
                      key={option}
                      className={`option-btn ${selectedQuestion.correctOption === option ? 'selected' : ''}`}
                      onClick={() => updateQuestion(selectedQuestion.id, { correctOption: option })}
                      disabled={saving}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                {saving && <p className="saving-text">Saving...</p>}
              </div>

              <div className="question-actions">
                <button
                  onClick={() => deleteQuestion(selectedQuestion.id)}
                  className="btn-danger"
                >
                  🗑️ Delete Question
                </button>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default TestEditor;