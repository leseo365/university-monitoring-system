const express = require('express');
const router = express.Router();

const getDb = (req) => req.app.locals.db;

router.get('/', async (req, res) => {
  try {
    const db = getDb(req);
    if (!db) return res.status(500).json({ error: 'Database not connected' });
    const snapshot = await db.collection('prlReports').orderBy('submittedAt', 'desc').get();
    const reports = [];
    snapshot.forEach(doc => reports.push({ id: doc.id, ...doc.data() }));
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const db = getDb(req);
    const { id } = req.params;
    if (!db) return res.status(500).json({ error: 'Database not connected' });
    const docRef = await db.collection('prlReports').doc(id).get();
    if (!docRef.exists) return res.status(404).json({ error: 'Report not found' });
    res.json({ id: docRef.id, ...docRef.data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const db = getDb(req);
    const { title, content, submittedBy } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Title and content required' });
    if (!db) return res.status(500).json({ error: 'Database not connected' });
    const newReport = { title, content, submittedBy: submittedBy || 'PRL', submittedAt: new Date().toISOString(), status: 'pending', feedback: null, createdAt: new Date().toISOString() };
    const docRef = await db.collection('prlReports').add(newReport);
    res.json({ success: true, report: { id: docRef.id, ...newReport } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/feedback', async (req, res) => {
  try {
    const db = getDb(req);
    const { id } = req.params;
    const { feedback } = req.body;
    if (!feedback) return res.status(400).json({ error: 'Feedback required' });
    if (!db) return res.status(500).json({ error: 'Database not connected' });
    const docRef = db.collection('prlReports').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Report not found' });
    await docRef.update({ feedback, status: 'reviewed', reviewedAt: new Date().toISOString() });
    res.json({ success: true, message: 'Feedback added' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const db = getDb(req);
    const { id } = req.params;
    if (!db) return res.status(500).json({ error: 'Database not connected' });
    const docRef = db.collection('prlReports').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Report not found' });
    await docRef.delete();
    res.json({ success: true, message: 'Report deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
