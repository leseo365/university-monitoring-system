const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const admin = require('firebase-admin');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// firebase configuration 
let db;
let auth;
let firebaseConnected = false;
let useRestApi = false;
let adminSdkWorked = false;

// Firebase REST API config
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || "AIzaSyD4lD8FVko6H2UoUlvzb_O19f_ASAE2caQ";
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "university-monitoring-system";
const FIREBASE_WEB_API_KEY = process.env.FIREBASE_WEB_API_KEY || "AIzaSyD4lD8FVko6H2UoUlvzb_O19f_ASAE2caQ";

// Local fallback storage
const localDB = {
  users: [],
  courses: [],
  lecturers: [],
  lectures: [],
  reports: [],
  lecturerReports: [],
  courseRatings: [],
  lecturerRatings: [],
  lectureRatings: [],
  studentAttendance: []
};

console.log('\n========================================');
console.log('FIREBASE INITIALIZATION');
console.log('========================================\n');

// Function to initialize Firebase
async function initializeFirebase() {
  // Try environment variables first (for production)
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    try {
      console.log('Initializing Firebase with environment variables...');
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
        databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
      });
      
      db = admin.firestore();
      auth = admin.auth();
      adminSdkWorked = true;
      firebaseConnected = true;
      
      console.log('Firebase Admin SDK initialized from environment variables!');
      
      try {
        await auth.listUsers(1);
        console.log('Admin SDK connection verified!');
        return;
      } catch (error) {
        console.log('Admin SDK connection failed:', error.message);
        adminSdkWorked = false;
        firebaseConnected = false;
      }
    } catch (error) {
      console.error('Admin SDK Error from env:', error.message);
      adminSdkWorked = false;
    }
  }
  
  // Try local service account file (for development)
  const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
  
  if (!adminSdkWorked && fs.existsSync(serviceAccountPath)) {
    try {
      const fileContent = fs.readFileSync(serviceAccountPath, 'utf8');
      const serviceAccount = JSON.parse(fileContent);
      
      console.log('Service account loaded from file');
      console.log(`Project ID: ${serviceAccount.project_id}`);
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id,
        databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
      });
      
      db = admin.firestore();
      auth = admin.auth();
      adminSdkWorked = true;
      firebaseConnected = true;
      
      console.log('Firebase Admin SDK initialized from file!');
      
      try {
        await auth.listUsers(1);
        console.log('Admin SDK connection verified!');
        return;
      } catch (error) {
        console.log('Admin SDK connection failed:', error.message);
        adminSdkWorked = false;
        firebaseConnected = false;
      }
    } catch (error) {
      console.error('Admin SDK Error from file:', error.message);
      adminSdkWorked = false;
    }
  }
  
  if (!adminSdkWorked) {
    console.log('\nAttempting Firebase REST API connection...');
    
    try {
      const testResponse = await axios.post(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_WEB_API_KEY}`,
        {
          email: `test${Date.now()}@temp.com`,
          password: "test123",
          returnSecureToken: true
        },
        { timeout: 10000 }
      );
      
      if (testResponse.data) {
        useRestApi = true;
        firebaseConnected = true;
        console.log('Firebase REST API connected successfully!');
        console.log('Using REST API mode');
        return;
      }
    } catch (error) {
      console.log('REST API failed:', error.message);
    }
  }
  
  if (!firebaseConnected) {
    console.log('\nAll Firebase connection methods failed!');
    console.log('Using LOCAL IN-MEMORY STORAGE as fallback');
    console.log('Data will NOT persist after server restart\n');
  }
}

// Helper functions
async function saveToFirestore(collection, docId, data) {
  if (useRestApi) {
    try {
      await axios.patch(
        `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${collection}/${docId}?key=${FIREBASE_WEB_API_KEY}`,
        {
          fields: Object.fromEntries(Object.entries(data).map(([k, v]) => [
            k, { stringValue: String(v) }
          ]))
        },
        { timeout: 10000 }
      );
      return true;
    } catch (error) {
      console.error('REST API save error:', error.message);
      return false;
    }
  } else if (adminSdkWorked && db) {
    await db.collection(collection).doc(docId).set(data);
    return true;
  } else {
    if (!localDB[collection]) localDB[collection] = [];
    localDB[collection].push({ id: docId, ...data });
    return true;
  }
}

async function getFromFirestore(collection, queryField = null, queryValue = null) {
  if (useRestApi) {
    try {
      const response = await axios.get(
        `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${collection}?key=${FIREBASE_WEB_API_KEY}`,
        { timeout: 10000 }
      );
      
      const documents = response.data.documents || [];
      return documents.map(doc => ({
        id: doc.name.split('/').pop(),
        ...Object.fromEntries(Object.entries(doc.fields || {}).map(([k, v]) => [k, Object.values(v)[0]]))
      }));
    } catch (error) {
      console.error('REST API get error:', error.message);
      return [];
    }
  } else if (adminSdkWorked && db) {
    let query = db.collection(collection);
    if (queryField && queryValue) {
      query = query.where(queryField, '==', queryValue);
    }
    const snapshot = await query.get();
    const results = [];
    snapshot.forEach(doc => results.push({ id: doc.id, ...doc.data() }));
    return results;
  } else {
    let results = localDB[collection] || [];
    if (queryField && queryValue) {
      results = results.filter(item => item[queryField] === queryValue);
    }
    return results;
  }
}

// Start initialization
initializeFirebase().then(() => {
  console.log('\n========================================');
  console.log(`FIREBASE STATUS: ${firebaseConnected ? 'CONNECTED' : 'FALLBACK MODE'}`);
  console.log(`MODE: ${useRestApi ? 'REST API' : (adminSdkWorked ? 'ADMIN SDK' : 'LOCAL STORAGE')}`);
  console.log('========================================\n');
});

// ============ AUTHENTICATION ============
app.post('/api/auth/register', async (req, res) => {
  console.log('\nREGISTER:', req.body.email);
  
  try {
    const { name, email, password, role } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields required' });
    }
    
    const existingUsers = await getFromFirestore('users', 'email', email);
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    let firebaseUid = null;
    
    if (useRestApi) {
      try {
        const registerRes = await axios.post(
          `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_WEB_API_KEY}`,
          { email, password, returnSecureToken: true },
          { timeout: 10000 }
        );
        firebaseUid = registerRes.data.localId;
        console.log('Created via REST API:', firebaseUid);
      } catch (authError) {
        console.error('REST API auth error:', authError.response?.data?.error?.message);
        firebaseUid = Date.now().toString();
      }
    } else if (adminSdkWorked && auth) {
      try {
        const firebaseUser = await auth.createUser({ email, password, displayName: name });
        firebaseUid = firebaseUser.uid;
        console.log('Created via Admin SDK:', firebaseUid);
      } catch (authError) {
        console.error('Admin SDK auth error:', authError.message);
        firebaseUid = Date.now().toString();
      }
    } else {
      firebaseUid = Date.now().toString();
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const userData = {
      uid: firebaseUid,
      name,
      email,
      role: role || 'student',
      passwordHash: hashedPassword,
      createdAt: new Date().toISOString()
    };
    
    await saveToFirestore('users', firebaseUid, userData);
    console.log('User stored in Firestore');
    
    res.json({
      success: true,
      message: 'Registration successful',
      user: { uid: firebaseUid, name, email, role: role || 'student' }
    });
    
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  console.log('\nLOGIN:', req.body.email);
  
  try {
    const { email, password } = req.body;
    
    const users = await getFromFirestore('users', 'email', email);
    
    if (users.length === 0) {
      return res.status(401).json({ error: 'User not found. Please register first.' });
    }
    
    const userData = users[0];
    const isValid = await bcrypt.compare(password, userData.passwordHash);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid password' });
    }
    
    console.log('Login successful');
    
    res.json({
      success: true,
      user: { uid: userData.uid, name: userData.name, email: userData.email, role: userData.role }
    });
    
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============ GET ALL USERS (For debugging) ============
app.get('/api/auth/users', async (req, res) => {
  try {
    console.log('Fetching all users...');
    const users = await getFromFirestore('users');
    
    // Remove sensitive data like passwordHash before sending
    const safeUsers = users.map(user => ({
      uid: user.uid,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      hasPassword: !!user.passwordHash
    }));
    
    console.log(`Found ${safeUsers.length} users`);
    res.json({ 
      success: true, 
      users: safeUsers, 
      count: safeUsers.length 
    });
  } catch (error) {
    console.error('Error fetching users:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============ RESET PASSWORD (For debugging) ============
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    
    if (!email || !newPassword) {
      return res.status(400).json({ error: 'Email and new password required' });
    }
    
    const users = await getFromFirestore('users', 'email', email);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = users[0];
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await saveToFirestore('users', userData.uid, { ...userData, passwordHash: hashedPassword });
    
    console.log(`Password reset for: ${email}`);
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Error resetting password:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============ COURSES ============
app.get('/api/courses', async (req, res) => {
  try {
    const courses = await getFromFirestore('courses');
    res.json({ courses });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/courses', async (req, res) => {
  try {
    const { name, code, stream, credits, semester, description } = req.body;
    const courseId = `C${Date.now()}`;
    const courseData = {
      id: courseId,
      name, code, stream,
      credits: parseInt(credits) || 120,
      semester: parseInt(semester) || 1,
      description: description || '',
      lecturerId: null,
      lecturerName: null,
      createdAt: new Date().toISOString()
    };
    
    await saveToFirestore('courses', courseId, courseData);
    console.log(`Course saved to Firestore: ${name}`);
    res.json({ success: true, course: courseData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/courses/:id/assign', async (req, res) => {
  try {
    const { lecturerId } = req.body;
    const courseId = req.params.id;
    
    const lecturers = await getFromFirestore('lecturers');
    const lecturer = lecturers.find(l => l.id === lecturerId);
    
    if (useRestApi) {
      await axios.patch(
        `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/courses/${courseId}?key=${FIREBASE_WEB_API_KEY}`,
        {
          fields: {
            lecturerId: { stringValue: lecturerId },
            lecturerName: { stringValue: lecturer?.name || '' }
          }
        },
        { timeout: 10000 }
      );
    } else if (adminSdkWorked && db) {
      await db.collection('courses').doc(courseId).update({ lecturerId, lecturerName: lecturer?.name });
    } else {
      const course = localDB.courses.find(c => c.id === courseId);
      if (course) {
        course.lecturerId = lecturerId;
        course.lecturerName = lecturer?.name;
      }
    }
    
    console.log(`Lecturer assigned to course in Firestore: ${courseId}`);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/courses/:id/unassign', async (req, res) => {
  try {
    const courseId = req.params.id;
    
    if (useRestApi) {
      await axios.patch(
        `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/courses/${courseId}?key=${FIREBASE_WEB_API_KEY}`,
        {
          fields: {
            lecturerId: { stringValue: 'null' },
            lecturerName: { stringValue: '' }
          }
        },
        { timeout: 10000 }
      );
    } else if (adminSdkWorked && db) {
      await db.collection('courses').doc(courseId).update({ lecturerId: null, lecturerName: null });
    } else {
      const course = localDB.courses.find(c => c.id === courseId);
      if (course) {
        course.lecturerId = null;
        course.lecturerName = null;
      }
    }
    
    console.log(`Lecturer unassigned from course in Firestore: ${courseId}`);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/courses/:id', async (req, res) => {
  try {
    const courseId = req.params.id;
    
    if (useRestApi) {
      await axios.delete(
        `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/courses/${courseId}?key=${FIREBASE_WEB_API_KEY}`,
        { timeout: 10000 }
      );
    } else if (adminSdkWorked && db) {
      await db.collection('courses').doc(courseId).delete();
    } else {
      const index = localDB.courses.findIndex(c => c.id === courseId);
      if (index !== -1) localDB.courses.splice(index, 1);
    }
    
    console.log(`Course deleted from Firestore: ${courseId}`);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ LECTURERS ============
app.get('/api/lecturers', async (req, res) => {
  try {
    const lecturers = await getFromFirestore('lecturers');
    res.json({ lecturers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/lecturers', async (req, res) => {
  try {
    const { name, email, department, specialization } = req.body;
    const lecturerId = `LEC${Date.now()}`;
    const lecturerData = {
      id: lecturerId,
      name, email,
      department: department || '',
      specialization: specialization || '',
      createdAt: new Date().toISOString()
    };
    
    await saveToFirestore('lecturers', lecturerId, lecturerData);
    console.log(`Lecturer saved to Firestore: ${name}`);
    res.json({ success: true, lecturer: lecturerData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ LECTURES ============
app.get('/api/lectures', async (req, res) => {
  try {
    const lectures = await getFromFirestore('lectures');
    res.json({ lectures });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/lectures', async (req, res) => {
  try {
    const { title, courseId, date, time, venue, lecturerId, totalStudents } = req.body;
    const lectureId = `LEC${Date.now()}`;
    const lectureData = {
      id: lectureId,
      title, courseId, date, time, venue,
      lecturerId: lecturerId || null,
      totalStudents: parseInt(totalStudents) || 0,
      attendance: 0,
      createdAt: new Date().toISOString()
    };
    
    await saveToFirestore('lectures', lectureId, lectureData);
    console.log(`Lecture saved to Firestore: ${title}`);
    res.json({ success: true, lecture: lectureData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/lectures/:id', async (req, res) => {
  try {
    const lectureId = req.params.id;
    const { attendance } = req.body;
    
    if (useRestApi) {
      await axios.patch(
        `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/lectures/${lectureId}?key=${FIREBASE_WEB_API_KEY}`,
        {
          fields: {
            attendance: { integerValue: attendance }
          }
        },
        { timeout: 10000 }
      );
    } else if (adminSdkWorked && db) {
      await db.collection('lectures').doc(lectureId).update({ attendance });
    } else {
      const lecture = localDB.lectures.find(l => l.id === lectureId);
      if (lecture) lecture.attendance = attendance;
    }
    
    console.log(`Lecture attendance updated in Firestore: ${lectureId}`);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ LECTURER REPORTS ============
app.get('/api/lecturer-reports', async (req, res) => {
  try {
    const reports = await getFromFirestore('lecturerReports');
    console.log(`Retrieved ${reports.length} lecturer reports from Firestore`);
    res.json({ success: true, reports });
  } catch (error) {
    console.error('Error fetching lecturer reports:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/lecturer-reports', async (req, res) => {
  console.log('\nNEW LECTURER REPORT');
  console.log(`Lecturer: ${req.body.lecturerName}`);
  console.log(`Course: ${req.body.courseName} (${req.body.courseCode})`);
  
  try {
    const reportData = {
      ...req.body,
      status: 'pending',
      feedback: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const reportId = `RPT${Date.now()}`;
    await saveToFirestore('lecturerReports', reportId, reportData);
    console.log(`Report saved to Firestore! ID: ${reportId}`);
    
    res.json({ 
      success: true, 
      message: 'Report submitted successfully',
      reportId: reportId 
    });
  } catch (error) {
    console.error('Error submitting report:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/lecturer-reports/:id/feedback', async (req, res) => {
  try {
    const { id } = req.params;
    const { feedback, reviewerName } = req.body;
    
    if (useRestApi) {
      await axios.patch(
        `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/lecturerReports/${id}?key=${FIREBASE_WEB_API_KEY}`,
        {
          fields: {
            feedback: { stringValue: feedback },
            status: { stringValue: 'reviewed' },
            reviewedAt: { stringValue: new Date().toISOString() },
            reviewedBy: { stringValue: reviewerName }
          }
        },
        { timeout: 10000 }
      );
    } else if (adminSdkWorked && db) {
      await db.collection('lecturerReports').doc(id).update({
        feedback,
        status: 'reviewed',
        reviewedAt: new Date().toISOString(),
        reviewedBy: reviewerName
      });
    } else {
      const report = localDB.lecturerReports.find(r => r.id === id);
      if (report) {
        report.feedback = feedback;
        report.status = 'reviewed';
        report.reviewedAt = new Date().toISOString();
        report.reviewedBy = reviewerName;
      }
    }
    
    console.log(`Feedback added to report in Firestore: ${id}`);
    res.json({ success: true, message: 'Feedback added successfully' });
  } catch (error) {
    console.error('Error adding feedback:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============ RATINGS ============
app.post('/api/rate-course', async (req, res) => {
  console.log('\nNEW COURSE RATING');
  console.log(`Course: ${req.body.courseId}`);
  console.log(`Rating: ${req.body.rating}/5`);
  
  try {
    const { courseId, rating, review, raterName, raterRole } = req.body;
    const ratingId = `CR${Date.now()}`;
    const ratingData = {
      id: ratingId,
      courseId,
      rating: parseInt(rating),
      review: review || '',
      raterName: raterName || 'Anonymous',
      raterRole: raterRole || 'student',
      date: new Date().toISOString()
    };
    
    await saveToFirestore('courseRatings', ratingId, ratingData);
    console.log(`Course rating saved to Firestore`);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/course-ratings/:courseId', async (req, res) => {
  try {
    const ratings = await getFromFirestore('courseRatings');
    const courseRatings = ratings.filter(r => r.courseId === req.params.courseId);
    const avgRating = courseRatings.length > 0 
      ? (courseRatings.reduce((s, r) => s + parseInt(r.rating), 0) / courseRatings.length).toFixed(1)
      : 0;
    res.json({ ratings: courseRatings, avgRating: parseFloat(avgRating) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/rate-lecturer', async (req, res) => {
  console.log('\nNEW LECTURER RATING');
  console.log(`Lecturer: ${req.body.lecturerId}`);
  console.log(`Rating: ${req.body.rating}/5`);
  
  try {
    const { lecturerId, rating, review, raterName, raterRole } = req.body;
    const ratingId = `LR${Date.now()}`;
    const ratingData = {
      id: ratingId,
      lecturerId,
      rating: parseInt(rating),
      review: review || '',
      raterName: raterName || 'Anonymous',
      raterRole: raterRole || 'student',
      date: new Date().toISOString()
    };
    
    await saveToFirestore('lecturerRatings', ratingId, ratingData);
    console.log(`Lecturer rating saved to Firestore`);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/lecturer-ratings/:lecturerId', async (req, res) => {
  try {
    const ratings = await getFromFirestore('lecturerRatings');
    const lecturerRatings = ratings.filter(r => r.lecturerId === req.params.lecturerId);
    const avgRating = lecturerRatings.length > 0 
      ? (lecturerRatings.reduce((s, r) => s + parseInt(r.rating), 0) / lecturerRatings.length).toFixed(1)
      : 0;
    res.json({ ratings: lecturerRatings, avgRating: parseFloat(avgRating) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/rate-lecture', async (req, res) => {
  console.log('\nNEW LECTURE RATING');
  console.log(`Lecture: ${req.body.lectureTitle}`);
  console.log(`Rating: ${req.body.rating}/5`);
  
  try {
    const { lectureId, lectureTitle, rating, review, raterName, raterRole } = req.body;
    const ratingId = `LCR${Date.now()}`;
    const ratingData = {
      id: ratingId,
      lectureId,
      lectureTitle: lectureTitle || '',
      rating: parseInt(rating),
      review: review || '',
      raterName: raterName || 'Anonymous',
      raterRole: raterRole || 'student',
      date: new Date().toISOString()
    };
    
    await saveToFirestore('lectureRatings', ratingId, ratingData);
    console.log(`Lecture rating saved to Firestore`);
    res.json({ success: true, message: 'Rating submitted successfully' });
  } catch (error) {
    console.error('Error submitting rating:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/lecture-ratings/:lectureId', async (req, res) => {
  try {
    const ratings = await getFromFirestore('lectureRatings');
    const lectureRatings = ratings.filter(r => r.lectureId === req.params.lectureId);
    const avgRating = lectureRatings.length > 0 
      ? (lectureRatings.reduce((s, r) => s + parseInt(r.rating), 0) / lectureRatings.length).toFixed(1)
      : 0;
    res.json({ ratings: lectureRatings, avgRating: parseFloat(avgRating), count: lectureRatings.length });
  } catch (error) {
    console.error('Error fetching lecture ratings:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============ STUDENT ATTENDANCE ============
app.get('/api/student-attendance/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const attendance = await getFromFirestore('studentAttendance');
    const studentAttendance = attendance.filter(a => a.studentId === studentId);
    res.json({ attendance: studentAttendance });
  } catch (error) {
    console.error('Error fetching attendance:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/student-attendance/mark', async (req, res) => {
  console.log('\nMARKING STUDENT ATTENDANCE');
  console.log(`Student: ${req.body.studentName}`);
  console.log(`Lecture: ${req.body.lectureTitle}`);
  
  try {
    const { studentId, studentName, lectureId, lectureTitle, status, date } = req.body;
    
    if (!studentId || !lectureId || !status) {
      return res.status(400).json({ error: 'Student ID, Lecture ID, and status are required' });
    }
    
    const attendanceId = `ATT${Date.now()}`;
    const attendanceData = {
      id: attendanceId,
      studentId,
      studentName,
      lectureId,
      lectureTitle,
      status,
      date: date || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await saveToFirestore('studentAttendance', attendanceId, attendanceData);
    console.log(`Attendance saved to Firestore`);
    
    res.json({ success: true, message: 'Attendance marked successfully' });
  } catch (error) {
    console.error('Error marking attendance:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============ LEGACY REPORTS ============
app.get('/api/reports', async (req, res) => {
  try {
    const reports = await getFromFirestore('reports');
    res.json({ reports });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/reports/:id/feedback', async (req, res) => {
  try {
    const { feedback } = req.body;
    
    if (useRestApi) {
      await axios.patch(
        `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/reports/${req.params.id}?key=${FIREBASE_WEB_API_KEY}`,
        {
          fields: {
            feedback: { stringValue: feedback },
            status: { stringValue: 'reviewed' },
            reviewedAt: { stringValue: new Date().toISOString() }
          }
        },
        { timeout: 10000 }
      );
    } else if (adminSdkWorked && db) {
      await db.collection('reports').doc(req.params.id).update({
        feedback,
        status: 'reviewed',
        reviewedAt: new Date().toISOString()
      });
    } else {
      const report = localDB.reports.find(r => r.id === req.params.id);
      if (report) {
        report.feedback = feedback;
        report.status = 'reviewed';
        report.reviewedAt = new Date().toISOString();
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ STATUS ============
app.get('/api/status', (req, res) => {
  res.json({ 
    firebaseConnected: firebaseConnected,
    mode: useRestApi ? 'REST_API' : (adminSdkWorked ? 'ADMIN SDK' : 'LOCAL_STORAGE'),
    status: 'running',
    timestamp: new Date().toISOString(),
    collections: {
      users: true,
      courses: true,
      lecturers: true,
      lectures: true,
      lecturerReports: true,
      courseRatings: true,
      lecturerRatings: true,
      lectureRatings: true,
      studentAttendance: true
    }
  });
});

app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Server is running!',
    firebaseConnected: firebaseConnected,
    mode: useRestApi ? 'REST_API' : (adminSdkWorked ? 'ADMIN SDK' : 'LOCAL_STORAGE'),
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'University Monitoring System API',
    status: 'running',
    mode: useRestApi ? 'REST_API' : (adminSdkWorked ? 'ADMIN SDK' : 'LOCAL_STORAGE'),
    endpoints: {
      auth: '/api/auth',
      users: '/api/auth/users',
      courses: '/api/courses',
      lecturers: '/api/lecturers',
      lectures: '/api/lectures',
      reports: '/api/lecturer-reports',
      ratings: '/api/rate-course, /api/rate-lecturer, /api/rate-lecture',
      attendance: '/api/student-attendance'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.url}`,
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`\n========================================`);
  console.log(`Server running on http://${HOST}:${PORT}`);
  console.log(`Firebase: ${firebaseConnected ? 'CONNECTED' : 'FALLBACK'}`);
  console.log(`Mode: ${useRestApi ? 'REST API' : (adminSdkWorked ? 'ADMIN SDK' : 'LOCAL STORAGE')}`);
  console.log(`Ready to accept requests!`);
  console.log(`========================================\n`);
});

module.exports = { app, db, auth, firebaseConnected, useRestApi };