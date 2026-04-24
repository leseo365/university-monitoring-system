const express = require('express');
const router = express.Router();

// Helper to get db from app locals
const getDb = (req) => req.app.locals.db;

// Mock reports database (fallback)
let lecturerReports = [];

// Submit lecturer report
router.post('/lecturer/reports', async (req, res) => {
  const reportData = req.body;
  const db = getDb(req);
  
  console.log('📝 New lecturer report submission:', reportData);
  
  const newReport = {
    id: Date.now().toString(),
    ...reportData,
    status: 'pending',
    reviewedAt: null,
    feedback: null,
    feedbackGivenAt: null
  };
  
  try {
    if (db) {
      await db.collection('lecturerReports').add(newReport);
      console.log('✅ Report stored in Firestore');
    }
    
    lecturerReports.unshift(newReport);
    res.json({ success: true, report: newReport });
  } catch (error) {
    console.error('Error submitting report:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all lecturer reports
router.get('/lecturer/reports', async (req, res) => {
  const db = getDb(req);
  const lecturerName = req.query.lecturerName;
  
  try {
    let reports = [];
    
    if (db) {
      let query = db.collection('lecturerReports');
      if (lecturerName) {
        query = query.where('lecturerName', '==', lecturerName);
      }
      const snapshot = await query.get();
      snapshot.forEach(doc => {
        reports.push({ id: doc.id, ...doc.data() });
      });
    } else {
      reports = lecturerReports;
      if (lecturerName) {
        reports = reports.filter(r => r.lecturerName === lecturerName);
      }
    }
    
    res.json(reports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;