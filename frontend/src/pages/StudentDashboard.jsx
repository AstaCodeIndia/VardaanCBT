// frontend/src/pages/StudentDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Student.css';

const StudentDashboard = ({ user, onLogout }) => {
  const [tests, setTests] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const [testsRes, statsRes] = await Promise.all([
        fetch('http://localhost:5000/api/student/tests', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:5000/api/student/dashboard', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (testsRes.ok && statsRes.ok) {
        const testsData = await testsRes.json();
        const statsData = await statsRes.json();
        
        setTests(testsData.tests);
        setStats(statsData);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const startTest = (testId) => {
    navigate(`/test/${testId}`);
  };

  if (loading) return <div className="loading">Loading dashboard...</div>;

  return (
    <div className="student-dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Welcome, {user.username}!</h1>
          <p>Your Level: <strong>{user.level}/100</strong></p>
        </div>
        <button onClick={onLogout} className="btn-logout">
          Logout
        </button>
      </header>

      {stats && (
        <div className="stats-section">
          <div className="stat-card">
            <h3>Level</h3>
            <p className="stat-value">{stats.stats.level}/100</p>
          </div>
          <div className="stat-card">
            <h3>Tests Attempted</h3>
            <p className="stat-value">{stats.stats.testsAttempted}</p>
          </div>
          <div className="stat-card">
            <h3>Accuracy</h3>
            <p className="stat-value">{stats.stats.accuracy}%</p>
          </div>
          <div className="stat-card">
            <h3>Questions Answered</h3>
            <p className="stat-value">{stats.stats.totalQuestions}</p>
          </div>
          <div className="stat-card">
            <h3>Correct</h3>
            <p className="stat-value correct">{stats.stats.correctAnswers}</p>
          </div>
          <div className="stat-card">
            <h3>Incorrect</h3>
            <p className="stat-value incorrect">{stats.stats.incorrectAnswers}</p>
          </div>
        </div>
      )}

      <div className="tests-section">
        <h2>Available Tests</h2>
        
        {tests.length === 0 ? (
          <div className="empty-state">
            <p>No tests available yet. Check back later!</p>
          </div>
        ) : (
          <div className="tests-grid">
            {tests.map(test => (
              <div key={test.id} className="test-card">
                <div className="test-header">
                  <h3>{test.name}</h3>
                  {test.attempted && (
                    <span className="attempted-badge">✅ Attempted</span>
                  )}
                </div>
                <div className="test-details">
                  <p>📝 {test.totalQuestions} Questions</p>
                  <p>📅 {new Date(test.conductDate).toLocaleDateString()}</p>
                  {test.attempted && (
                    <p>🎯 Score: {test.score}/{test.totalQuestions} ({test.percentage.toFixed(1)}%)</p>
                  )}
                </div>
                <button
                  onClick={() => startTest(test.id)}
                  className="btn-primary"
                  disabled={test.attempted}
                >
                  {test.attempted ? 'Already Attempted' : 'Start Test'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {stats && stats.recentTests.length > 0 && (
        <div className="recent-tests-section">
          <h2>Recent Test Performance</h2>
          <table>
            <thead>
              <tr>
                <th>Test Name</th>
                <th>Score</th>
                <th>Percentage</th>
                <th>Time Taken</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentTests.map((test, index) => (
                <tr key={index}>
                  <td>{test.testName}</td>
                  <td>{test.score}/{test.totalQuestions}</td>
                  <td>{test.percentage.toFixed(1)}%</td>
                  <td>{Math.floor(test.timeTaken / 60)}m {test.timeTaken % 60}s</td>
                  <td>{new Date(test.attemptedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;