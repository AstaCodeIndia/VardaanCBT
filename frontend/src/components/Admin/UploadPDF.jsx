// frontend/src/components/Admin/UploadPDF.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const UploadPDF = ({ onUploadSuccess }) => {
  const [testName, setTestName] = useState('');
  const [pdfFile, setPdfFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      setError('');
    } else {
      setError('Please select a valid PDF file');
      setPdfFile(null);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!testName || !pdfFile) {
      setError('Test name and PDF file are required');
      return;
    }

    setUploading(true);
    setError('');
    setProgress('Uploading PDF...');

    const formData = new FormData();
    formData.append('pdf', pdfFile);
    formData.append('testName', testName);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/admin/upload-pdf', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        setProgress(`Success! Created ${data.test.totalQuestions} questions`);
        setTimeout(() => {
          onUploadSuccess();
          navigate(`/admin/tests/${data.test.id}`);
        }, 1500);
      } else {
        setError(data.error || 'Upload failed');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="upload-container">
      <h1>Upload Test PDF</h1>
      <p className="subtitle">Upload a question paper PDF. AI will automatically detect and crop questions.</p>

      <form onSubmit={handleUpload} className="upload-form">
        <div className="form-group">
          <label>Test Name</label>
          <input
            type="text"
            value={testName}
            onChange={(e) => setTestName(e.target.value)}
            placeholder="e.g., Physics Mock Test 2025"
            disabled={uploading}
          />
        </div>

        <div className="form-group">
          <label>Question Paper PDF</label>
          <div className="file-input-wrapper">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              disabled={uploading}
            />
            {pdfFile && (
              <p className="file-name">📄 {pdfFile.name}</p>
            )}
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}
        {progress && <div className="progress-message">{progress}</div>}

        <button 
          type="submit" 
          className="btn-primary"
          disabled={uploading || !testName || !pdfFile}
        >
          {uploading ? '⏳ Processing...' : '📤 Upload & Extract Questions'}
        </button>
      </form>

      <div className="info-box">
        <h3>ℹ️ How it works:</h3>
        <ol>
          <li>Upload a PDF containing exam questions</li>
          <li>AI automatically detects question boundaries</li>
          <li>Each question is cropped as a single image (including options)</li>
          <li>You can then review and set correct answers</li>
          <li>Publish the test for students</li>
        </ol>
      </div>
    </div>
  );
};

export default UploadPDF;