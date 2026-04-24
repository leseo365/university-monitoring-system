const express = require('express');
const router = express.Router();

// Helper to get Firestore instance
const getDb = (req) => req.app.locals.db;

// Get all courses
router.get('/', async (req, res) => {
  try {
    const db = getDb(req);
    
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }
    
    const snapshot = await db.collection('courses').get();
    const courses = [];
    snapshot.forEach(doc => {
      courses.push({ id: doc.id, ...doc.data() });
    });
    
    console.log(`✅ Retrieved ${courses.length} courses from Firestore`);
    res.json(courses);
  } catch (error) {
    console.error('Error in GET /courses:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get course by ID
router.get('/:id', async (req, res) => {
  try {
    const db = getDb(req);
    
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }
    
    const docRef = await db.collection('courses').doc(req.params.id).get();
    if (!docRef.exists) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    res.json({ id: docRef.id, ...docRef.data() });
  } catch (error) {
    console.error('Error in GET /courses/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new course
router.post('/', async (req, res) => {
  try {
    const db = getDb(req);
    const { name, code, description, stream, credits, semester } = req.body;
    
    if (!name || !code || !stream) {
      return res.status(400).json({ error: 'Please provide name, code, and stream' });
    }
    
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }
    
    const newCourse = {
      name,
      code,
      description: description || '',
      stream,
      credits: parseInt(credits) || 120,
      semester: parseInt(semester) || 1,
      lecturerId: null,
      lecturerName: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const docRef = await db.collection('courses').add(newCourse);
    console.log(`✅ Course created in Firestore: ${docRef.id}`);
    
    res.json({ success: true, course: { id: docRef.id, ...newCourse } });
  } catch (error) {
    console.error('Error in POST /courses:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update course
router.put('/:id', async (req, res) => {
  try {
    const db = getDb(req);
    const { id } = req.params;
    const updates = req.body;
    
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }
    
    const docRef = db.collection('courses').doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    await docRef.update({
      ...updates,
      updatedAt: new Date().toISOString()
    });
    
    console.log(`✅ Course ${id} updated in Firestore`);
    res.json({ success: true, message: 'Course updated successfully' });
  } catch (error) {
    console.error('Error in PUT /courses/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

// Assign lecturer to course
router.put('/:courseId/assign', async (req, res) => {
  try {
    const db = getDb(req);
    const { courseId } = req.params;
    const { lecturerId, lecturerName } = req.body;
    
    if (!lecturerId && !lecturerName) {
      return res.status(400).json({ error: 'Please provide lecturerId or lecturerName' });
    }
    
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }
    
    const docRef = db.collection('courses').doc(courseId);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    await docRef.update({
      lecturerId: lecturerId || null,
      lecturerName: lecturerName || null,
      assignedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    console.log(`✅ Lecturer assigned to course ${courseId} in Firestore`);
    res.json({ success: true, message: 'Lecturer assigned successfully' });
  } catch (error) {
    console.error('Error in PUT /courses/:courseId/assign:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete course
router.delete('/:id', async (req, res) => {
  try {
    const db = getDb(req);
    const { id } = req.params;
    
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }
    
    const docRef = db.collection('courses').doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    await docRef.delete();
    console.log(`✅ Course ${id} deleted from Firestore`);
    res.json({ success: true, message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /courses/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get courses by stream
router.get('/stream/:stream', async (req, res) => {
  try {
    const db = getDb(req);
    const { stream } = req.params;
    
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }
    
    const snapshot = await db.collection('courses').where('stream', '==', stream).get();
    const courses = [];
    snapshot.forEach(doc => {
      courses.push({ id: doc.id, ...doc.data() });
    });
    
    res.json(courses);
  } catch (error) {
    console.error('Error in GET /courses/stream/:stream:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get courses by lecturer
router.get('/lecturer/:lecturerId', async (req, res) => {
  try {
    const db = getDb(req);
    const { lecturerId } = req.params;
    
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }
    
    const snapshot = await db.collection('courses').where('lecturerId', '==', lecturerId).get();
    const courses = [];
    snapshot.forEach(doc => {
      courses.push({ id: doc.id, ...doc.data() });
    });
    
    res.json(courses);
  } catch (error) {
    console.error('Error in GET /courses/lecturer/:lecturerId:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;