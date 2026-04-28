const express = require('express');
const router = express.Router();

// Helper to get Firestore instance
const getDb = (req) => req.app.locals.db;



// Submit course rating
router.post('/courses', async (req, res) => {
  try {
    const db = getDb(req);
    const { courseId, courseName, rating, review, raterName } = req.body;
    
    if (!courseId || !rating) {
      return res.status(400).json({ error: 'Course ID and rating are required' });
    }
    
    const newRating = {
      courseId,
      courseName,
      rating: parseInt(rating),
      review: review || '',
      raterName: raterName || 'Anonymous',
      createdAt: new Date().toISOString()
    };
    
    if (db) {
      const docRef = await db.collection('courseRatings').add(newRating);
      console.log(` Course rating added to Firestore: ${docRef.id}`);
      res.json({ success: true, rating: { id: docRef.id, ...newRating } });
    } else {
      res.json({ success: true, rating: { id: Date.now().toString(), ...newRating } });
    }
  } catch (error) {
    console.error('Error in POST /ratings/courses:', error);
    res.status(500).json({ error: error.message });
  }
});

// get all course ratings
router.get('/courses', async (req, res) => {
  try {
    const db = getDb(req);
    let ratings = {};
    
    if (db) {
      const snapshot = await db.collection('courseRatings').get();
      snapshot.forEach(doc => {
        const data = doc.data();
        if (!ratings[data.courseId]) {
          ratings[data.courseId] = [];
        }
        ratings[data.courseId].push({ id: doc.id, ...data });
      });
    }
    
    res.json(ratings);
  } catch (error) {
    console.error('Error in GET /ratings/courses:', error);
    res.status(500).json({ error: error.message });
  }
});

// get course rating by course ID
router.get('/courses/:courseId', async (req, res) => {
  try {
    const db = getDb(req);
    const { courseId } = req.params;
    let ratings = [];
    
    if (db) {
      const snapshot = await db.collection('courseRatings').where('courseId', '==', courseId).get();
      snapshot.forEach(doc => {
        ratings.push({ id: doc.id, ...doc.data() });
      });
    }
    
    const total = ratings.length;
    const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
    const average = total > 0 ? (sum / total).toFixed(1) : 0;
    
    res.json({
      courseId,
      averageRating: average,
      totalRatings: total,
      ratings
    });
  } catch (error) {
    console.error('Error in GET /ratings/courses/:courseId:', error);
    res.status(500).json({ error: error.message });
  }
});

// 

// Submit lecturer rating
router.post('/lecturers', async (req, res) => {
  try {
    const db = getDb(req);
    const { lecturerId, lecturerName, rating, review, raterName } = req.body;
    
    if (!lecturerId || !rating) {
      return res.status(400).json({ error: 'Lecturer ID and rating are required' });
    }
    
    const newRating = {
      lecturerId,
      lecturerName,
      rating: parseInt(rating),
      review: review || '',
      raterName: raterName || 'Anonymous',
      createdAt: new Date().toISOString()
    };
    
    if (db) {
      const docRef = await db.collection('lecturerRatings').add(newRating);
      console.log(` Lecturer rating added to Firestore: ${docRef.id}`);
      res.json({ success: true, rating: { id: docRef.id, ...newRating } });
    } else {
      res.json({ success: true, rating: { id: Date.now().toString(), ...newRating } });
    }
  } catch (error) {
    console.error('Error in POST /ratings/lecturers:', error);
    res.status(500).json({ error: error.message });
  }
});

// get all lecturer ratings
router.get('/lecturers', async (req, res) => {
  try {
    const db = getDb(req);
    let ratings = {};
    
    if (db) {
      const snapshot = await db.collection('lecturerRatings').get();
      snapshot.forEach(doc => {
        const data = doc.data();
        if (!ratings[data.lecturerId]) {
          ratings[data.lecturerId] = [];
        }
        ratings[data.lecturerId].push({ id: doc.id, ...data });
      });
    }
    
    res.json(ratings);
  } catch (error) {
    console.error('Error in GET /ratings/lecturers:', error);
    res.status(500).json({ error: error.message });
  }
});

// get lecturer rating by lecturer ID
router.get('/lecturers/:lecturerId', async (req, res) => {
  try {
    const db = getDb(req);
    const { lecturerId } = req.params;
    let ratings = [];
    
    if (db) {
      const snapshot = await db.collection('lecturerRatings').where('lecturerId', '==', lecturerId).get();
      snapshot.forEach(doc => {
        ratings.push({ id: doc.id, ...doc.data() });
      });
    }
    
    const total = ratings.length;
    const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
    const average = total > 0 ? (sum / total).toFixed(1) : 0;
    
    res.json({
      lecturerId,
      averageRating: average,
      totalRatings: total,
      ratings
    });
  } catch (error) {
    console.error('Error in GET /ratings/lecturers/:lecturerId:', error);
    res.status(500).json({ error: error.message });
  }
});

 

// submit lecture rating
router.post('/', async (req, res) => {
  try {
    const db = getDb(req);
    const { lectureId, rating, comment, lectureTitle, lecturer, courseId } = req.body;
    
    if (!lectureId || !rating) {
      return res.status(400).json({ error: 'Lecture ID and rating are required' });
    }
    
    const newRating = {
      lectureId,
      rating: parseInt(rating),
      comment: comment || '',
      lectureTitle,
      lecturer,
      courseId,
      studentId: 'student1',
      createdAt: new Date().toISOString()
    };
    
    if (db) {
      const docRef = await db.collection('ratings').add(newRating);
      res.json({ success: true, rating: { id: docRef.id, ...newRating } });
    } else {
      res.json({ success: true, rating: { id: Date.now().toString(), ...newRating } });
    }
  } catch (error) {
    console.error('Error in POST /ratings:', error);
    res.status(500).json({ error: error.message });
  }
});

// get user's ratings
router.get('/user', async (req, res) => {
  try {
    const db = getDb(req);
    let userRatings = [];
    
    if (db) {
      const snapshot = await db.collection('ratings').where('studentId', '==', 'student1').get();
      snapshot.forEach(doc => {
        userRatings.push({ id: doc.id, ...doc.data() });
      });
    }
    
    res.json(userRatings);
  } catch (error) {
    console.error('Error in GET /ratings/user:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;