// frontend/src/components/Admin/TestList.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

const TestList = ({ tests, onRefresh }) => {
  const navigate = useNavigate();

  const deleteTest = async (testId) => {
    if (!confirm('Delete this test? This action cannot be undone.')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/admin/tests/${testId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        alert('Test deleted successfully');
        onRefresh();
      }
    } catch (error) {
      console.error('Failed to delete test:', error);
      alert('Failed to delete test');
    }
  };

  return (
    <div className="test-list-container">
      <h1>Manage Tests</h1>
      
      {tests.length === 0 ? (
        <div className="empty-state">
          <p>No tests created yet. Upload a PDF to create your first test!</p>
        </div>
      ) : (
        <div className="tests-table">
          <table>
            <thead>
              <tr>
                <th>Test Name</th>
                <th>Questions</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tests.map(test => (
                <tr key={test.id}>
                  <td><strong>{test.name}</strong></td>
                  <td>{test.totalQuestions}</td>
                  <td>
                    <span className={`status-badge ${test.isPublished ? 'published' : 'draft'}`}>
                      {test.isPublished ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td>{new Date(test.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button 
                      onClick={() => navigate(`/admin/tests/${test.id}`)}
                      className="btn-secondary"
                      style={{ marginRight: '10px' }}
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => deleteTest(test.id)}
                      className="btn-danger"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TestList;