import React, { useState, useEffect } from 'react';
import './PerformanceReport.css';

const PerformanceReport = ({ studentId }) => {
  const [marksData, setMarksData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Define the order of exam sections as requested
  const examSections = [
    'Internal 1',
    'Internal 2',
    'Internal 3',
    'Mid Term',
    'Final Exam'
  ];

  useEffect(() => {
    if (!studentId) {
      setLoading(false);
      return;
    }

    const fetchMarks = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/marks/${studentId}`);
        const data = await response.json();

        if (data.success) {
          setMarksData(data.marks);
        } else {
          setError(data.error || 'Failed to load marks data');
        }
      } catch (err) {
        console.error('Error fetching marks:', err);
        setError('Unable to connect to the server.');
      } finally {
        setLoading(false);
      }
    };

    fetchMarks();
  }, [studentId]);

  const handleDownload = () => {
    if (!studentId) return;
    // Trigger the download endpoint directly
    window.location.href = `http://localhost:5000/api/marks/${studentId}/download`;
  };

  // Helper to get marks for a specific exam type
  const getMarksForExam = (examType) => {
    return marksData.filter(record => record.examType === examType);
  };

  if (loading) return <div className="loading">Loading performance report...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!studentId) return <div className="info-message">Please select a student to view the report.</div>;

  return (
    <div className="performance-report-container">
      <div className="report-header">
        <h2>Student Performance Report</h2>
        <button onClick={handleDownload} className="download-btn">
          Download Report (CSV)
        </button>
      </div>

      {marksData.length === 0 ? (
        <p className="no-data">No performance records found for this student.</p>
      ) : (
        <div className="exam-sections">
          {examSections.map((examType) => {
            const exams = getMarksForExam(examType);
            if (exams.length === 0) return null;

            return (
              <div key={examType} className="exam-section-card">
                <h3 className="exam-title">{examType}</h3>
                {exams.map((record) => (
                  <div key={record.id} className="exam-record">
                    <p className="exam-date">Date: {new Date(record.date).toLocaleDateString()}</p>
                    <table className="marks-table">
                      <thead>
                        <tr>
                          <th>Subject</th>
                          <th>Marks Obtained</th>
                          <th>Total Marks</th>
                          <th>Percentage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {record.subjects.map((sub, index) => {
                          const percentage = sub.total > 0 ? ((sub.marks / sub.total) * 100).toFixed(2) : '0.00';
                          return (
                            <tr key={index}>
                              <td>{sub.subject}</td>
                              <td>{sub.marks}</td>
                              <td>{sub.total}</td>
                              <td>{percentage}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PerformanceReport;