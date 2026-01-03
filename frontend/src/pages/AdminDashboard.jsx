// frontend/src/pages/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import UploadPDF from '../components/Admin/UploadPDF';
import TestEditor from '../components/Admin/TestEditor';
import TestList from '../components/Admin/TestList';
import '../styles/Admin.css';

const AdminDashboard = ({ user, onLogout }) => {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/admin/tests', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setTests(data.tests);
      }
    } catch (error) {
      console.error('Failed to fetch tests:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>VardaanCBT</h2>
          <p className="admin-badge">Admin Panel</p>
        </div>

        <nav className="sidebar-nav">
          <Link to="/admin" className="nav-link">
            <span>📊</span> Overview
          </Link>
          <Link to="/admin/upload" className="nav-link">
            <span>📤</span> Upload Test
          </Link>
          <Link to="/admin/tests" className="nav-link">
            <span>📝</span> Manage Tests
          </Link>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <p>{user.username}</p>
            <p className="user-role">{user.role}</p>
          </div>
          <button onClick={onLogout} className="btn-logout">
            Logout
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <Routes>
          <Route path="/" element={<Overview tests={tests} />} />
          <Route path="/upload" element={<UploadPDF onUploadSuccess={fetchTests} />} />
          <Route path="/tests" element={<TestList tests={tests} onRefresh={fetchTests} />} />
          <Route path="/tests/:testId" element={<TestEditor onUpdate={fetchTests} />} />
        </Routes>
      </main>
    </div>
  );
};

const Overview = ({ tests }) => {
  const publishedCount = tests.filter(t => t.isPublished).length;
  const draftCount = tests.filter(t => !t.isPublished).length;
  const totalQuestions = tests.reduce((sum, t) => sum + t.totalQuestions, 0);

  return (
    <div className="overview">
      <h1>Dashboard Overview</h1>
      
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Tests</h3>
          <p className="stat-number">{tests.length}</p>
        </div>
        <div className="stat-card">
          <h3>Published</h3>
          <p className="stat-number">{publishedCount}</p>
        </div>
        <div className="stat-card">
          <h3>Drafts</h3>
          <p className="stat-number">{draftCount}</p>
        </div>
        <div className="stat-card">
          <h3>Total Questions</h3>
          <p className="stat-number">{totalQuestions}</p>
        </div>
      </div>

      <div className="recent-tests">
        <h2>Recent Tests</h2>
        <table>
          <thead>
            <tr>
              <th>Test Name</th>
              <th>Questions</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {tests.slice(0, 5).map(test => (
              <tr key={test.id}>
                <td>{test.name}</td>
                <td>{test.totalQuestions}</td>
                <td>
                  <span className={`status-badge ${test.isPublished ? 'published' : 'draft'}`}>
                    {test.isPublished ? 'Published' : 'Draft'}
                  </span>
                </td>
                <td>{new Date(test.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminDashboard;