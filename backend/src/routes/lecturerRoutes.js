const express = require('express');
const router = express.Router();

const getDb = (req) => req.app.locals.db;

router.get('/', async (req, res) => {
  try {
    const db = getDb(req);
    if (!db) return res.status(500).json({ error: 'Database not connected' });
    const snapshot = await db.collection('lecturers').get();
    const lecturers = [];
    snapshot.forEach(doc => lecturers.push({ id: doc.id, ...doc.data() }));
    res.json(lecturers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const db = getDb(req);
    if (!db) return res.status(500).json({ error: 'Database not connected' });
    const docRef = await db.collection('lecturers').doc(req.params.id).get();
    if (!docRef.exists) return res.status(404).json({ error: 'Lecturer not found' });
    res.json({ id: docRef.id, ...docRef.data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const db = getDb(req);
    const { name, email, department, specialization } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Name and email required' });
    if (!db) return res.status(500).json({ error: 'Database not connected' });
    const newLecturer = { name: name.trim(), email: email.trim(), department: department || '', specialization: specialization || '', createdAt: new Date().toISOString() };
    const docRef = await db.collection('lecturers').add(newLecturer);
    res.json({ success: true, lecturer: { id: docRef.id, ...newLecturer } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const db = getDb(req);
    const { id } = req.params;
    if (!db) return res.status(500).json({ error: 'Database not connected' });
    const docRef = db.collection('lecturers').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Lecturer not found' });
    await docRef.update({ ...req.body, updatedAt: new Date().toISOString() });
    res.json({ success: true, message: 'Lecturer updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const db = getDb(req);
    const { id } = req.params;
    if (!db) return res.status(500).json({ error: 'Database not connected' });
    const docRef = db.collection('lecturers').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Lecturer not found' });
    await docRef.delete();
    res.json({ success: true, message: 'Lecturer deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
