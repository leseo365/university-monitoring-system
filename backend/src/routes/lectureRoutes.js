const express = require('express');
const router = express.Router();

const getDb = (req) => req.app.locals.db;

router.get('/', async (req, res) => {
  try {
    const db = getDb(req);
    const { courseId } = req.query;
    if (!db) return res.status(500).json({ error: 'Database not connected' });
    let query = db.collection('lectures');
    if (courseId) query = query.where('courseId', '==', courseId);
    const snapshot = await query.get();
    const lectures = [];
    snapshot.forEach(doc => lectures.push({ id: doc.id, ...doc.data() }));
    res.json(lectures);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const db = getDb(req);
    const docRef = await db.collection('lectures').doc(req.params.id).get();
    if (!docRef.exists) return res.status(404).json({ error: 'Lecture not found' });
    res.json({ id: docRef.id, ...docRef.data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const db = getDb(req);
    const { title, description, courseId, date, time, duration, venue, totalStudents, lecturerName } = req.body;
    if (!title || !courseId || !date || !time) {
      return res.status(400).json({ error: 'Please provide all required fields' });
    }
    const newLecture = {
      title, description: description || '', courseId, date, time,
      duration: parseInt(duration) || 60, venue: venue || 'TBA',
      totalStudents: parseInt(totalStudents) || 0, attendance: 0,
      attendanceMarked: false, presentCount: 0, lecturerName: lecturerName || 'Lecturer',
      createdAt: new Date().toISOString()
    };
    const docRef = await db.collection('lectures').add(newLecture);
    res.json({ success: true, lecture: { id: docRef.id, ...newLecture } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const db = getDb(req);
    const docRef = db.collection('lectures').doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Lecture not found' });
    await docRef.delete();
    res.json({ success: true, message: 'Lecture deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/attendance', async (req, res) => {
  try {
    const db = getDb(req);
    const { id } = req.params;
    const { presentCount, totalStudents } = req.body;
    const docRef = db.collection('lectures').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Lecture not found' });
    const attendanceRate = totalStudents > 0 ? (presentCount / totalStudents) * 100 : 0;
    await docRef.update({
      presentCount: presentCount || 0,
      attendanceMarked: true,
      attendanceRate: attendanceRate.toFixed(1),
      attendanceMarkedAt: new Date().toISOString()
    });
    res.json({ success: true, message: 'Attendance marked successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
