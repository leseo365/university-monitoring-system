const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Firebase
let db;
let auth;
let firebaseConnected = false;

const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

console.log('\n========================================');
console.log('🔌 CHECKING FIREBASE CONNECTION...');
console.log('========================================\n');

if (fs.existsSync(serviceAccountPath)) {
  try {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: "https://university-monitoring-system-default-rtdb.firebaseio.com"
    });
    db = admin.firestore();
    auth = admin.auth();
    firebaseConnected = true;
    console.log('✅ Firebase Connected Successfully!');
    console.log(`📁 Project ID: ${serviceAccount.project_id}`);
    console.log(`📧 Client Email: ${serviceAccount.client_email}`);
  } catch (error) {
    console.error('❌ Firebase Error:', error.message);
    process.exit(1);
  }
} else {
  console.error('❌ serviceAccountKey.json not found');
  console.log('Please download serviceAccountKey.json from Firebase Console');
  process.exit(1);
}

console.log('\n========================================');
console.log('🚀 SERVER STARTING');
console.log('========================================\n');

// ============ AUTHENTICATION ============
app.post('/api/auth/register', async (req, res) => {
  console.log('\n========================================');
  console.log('📝 REGISTRATION REQUEST');
  console.log('========================================');
  console.log(`📧 Email: ${req.body.email}`);
  console.log(`👤 Name: ${req.body.name}`);
  console.log(`🎭 Role: ${req.body.role || 'student'}`);
  
  try {
    const { name, email, password, role } = req.body;
    
    // Check if user already exists
    console.log('🔍 Checking if user already exists...');
    const existingUser = await db.collection('users').where('email', '==', email).get();
    if (!existingUser.empty) {
      console.log('❌ REGISTRATION FAILED: User already exists');
      return res.status(400).json({ 
        success: false, 
        error: 'User already exists',
        message: `An account with ${email} already exists. Please login instead.`
      });
    }
    
    // Create user in Firebase Auth
    console.log('👤 Creating user in Firebase Auth...');
    const firebaseUser = await auth.createUser({ 
      email, 
      password, 
      displayName: name 
    });
    console.log('✅ Firebase Auth user created:', firebaseUser.uid);
    
    // Hash password for storage
    console.log('🔐 Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Store user in Firestore
    console.log('💾 Storing user in Firestore...');
    const userData = {
      uid: firebaseUser.uid,
      name,
      email,
      role: role || 'student',
      passwordHash: hashedPassword,
      createdAt: new Date().toISOString(),
      lastLogin: null
    };
    
    await db.collection('users').doc(firebaseUser.uid).set(userData);
    console.log('✅ User stored in Firestore');
    
    console.log('✅ REGISTRATION SUCCESSFUL!');
    console.log(`📧 Email: ${email}`);
    console.log(`👤 Name: ${name}`);
    console.log(`🎭 Role: ${role || 'student'}`);
    console.log('========================================\n');
    
    res.json({ 
      success: true, 
      message: 'Registration successful! You can now login.',
      user: { uid: firebaseUser.uid, name, email, role: role || 'student' }
    });
    
  } catch (error) {
    console.error('❌ REGISTRATION ERROR:', error.message);
    console.log('========================================\n');
    res.status(500).json({ 
      success: false, 
      error: error.message,
      message: 'Registration failed. Please try again.'
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  console.log('\n========================================');
  console.log('🔐 LOGIN REQUEST');
  console.log('========================================');
  console.log(`📧 Email: ${req.body.email}`);
  
  try {
    const { email, password } = req.body;
    
    // Find user in Firestore
    console.log('🔍 Searching for user in database...');
    const userQuery = await db.collection('users').where('email', '==', email).get();
    
    if (userQuery.empty) {
      console.log('❌ LOGIN FAILED: User not found');
      console.log(`📧 Email ${email} is not registered`);
      console.log('========================================\n');
      return res.status(401).json({ 
        success: false, 
        error: 'User not found',
        message: `No account found with ${email}. Please register first.`
      });
    }
    
    const userDoc = userQuery.docs[0];
    const userData = userDoc.data();
    console.log(`✅ User found: ${userData.name} (${userData.role})`);
    
    // Verify password
    console.log('🔐 Verifying password...');
    const isValid = await bcrypt.compare(password, userData.passwordHash);
    
    if (!isValid) {
      console.log('❌ LOGIN FAILED: Invalid password');
      console.log(`📧 Email: ${email} - Wrong password entered`);
      console.log('========================================\n');
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid password',
        message: 'Incorrect password. Please try again.'
      });
    }
    
    console.log('✅ Password verified successfully');
    
    // Update last login
    console.log('📝 Updating last login time...');
    await db.collection('users').doc(userData.uid).update({ 
      lastLogin: new Date().toISOString() 
    });
    
    console.log('✅ LOGIN SUCCESSFUL!');
    console.log(`📧 Email: ${userData.email}`);
    console.log(`👤 Name: ${userData.name}`);
    console.log(`🎭 Role: ${userData.role}`);
    console.log(`🕐 Last login: ${new Date().toISOString()}`);
    console.log('========================================\n');
    
    res.json({ 
      success: true, 
      message: `Welcome back, ${userData.name}!`,
      user: { 
        uid: userData.uid, 
        name: userData.name, 
        email: userData.email, 
        role: userData.role,
        lastLogin: userData.lastLogin
      }
    });
    
  } catch (error) {
    console.error('❌ LOGIN ERROR:', error.message);
    console.log('========================================\n');
    res.status(500).json({ 
      success: false, 
      error: error.message,
      message: 'Login failed. Please try again.'
    });
  }
});

// ============ COURSES ============
app.get('/api/courses', async (req, res) => {
  try {
    const snapshot = await db.collection('courses').get();
    const courses = [];
    snapshot.forEach(doc => courses.push({ id: doc.id, ...doc.data() }));
    console.log(`📚 Retrieved ${courses.length} courses`);
    res.json({ courses, count: courses.length });
  } catch (error) {
    console.error('Error fetching courses:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/courses', async (req, res) => {
  console.log('\n📚 ADDING NEW COURSE');
  console.log(`📖 Course Name: ${req.body.name}`);
  console.log(`🔢 Course Code: ${req.body.code}`);
  console.log(`🎯 Stream: ${req.body.stream}`);
  
  try {
    const { name, code, stream, credits, semester } = req.body;
    const courseData = {
      name, code, stream,
      credits: parseInt(credits) || 120,
      semester: parseInt(semester) || 1,
      lecturerId: null,
      lecturerName: null,
      createdAt: new Date().toISOString()
    };
    const docRef = await db.collection('courses').add(courseData);
    console.log(`✅ Course added successfully! ID: ${docRef.id}`);
    res.json({ success: true, message: 'Course added successfully', course: { id: docRef.id, ...courseData } });
  } catch (error) {
    console.error('❌ Error adding course:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/courses/:id/assign', async (req, res) => {
  console.log('\n👨‍🏫 ASSIGNING LECTURER TO COURSE');
  console.log(`📖 Course ID: ${req.params.id}`);
  console.log(`👨‍🏫 Lecturer ID: ${req.body.lecturerId}`);
  
  try {
    const { lecturerId } = req.body;
    const lecturer = await db.collection('lecturers').doc(lecturerId).get();
    
    if (!lecturer.exists) {
      console.log('❌ Lecturer not found');
      return res.status(404).json({ error: 'Lecturer not found' });
    }
    
    await db.collection('courses').doc(req.params.id).update({
      lecturerId,
      lecturerName: lecturer.data().name,
      assignedAt: new Date().toISOString()
    });
    
    console.log(`✅ Lecturer ${lecturer.data().name} assigned successfully`);
    res.json({ success: true, message: 'Lecturer assigned successfully' });
  } catch (error) {
    console.error('❌ Error assigning lecturer:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/courses/:id/unassign', async (req, res) => {
  console.log('\n🔄 UNASSIGNING LECTURER FROM COURSE');
  console.log(`📖 Course ID: ${req.params.id}`);
  
  try {
    await db.collection('courses').doc(req.params.id).update({ 
      lecturerId: null, 
      lecturerName: null 
    });
    console.log(`✅ Lecturer unassigned successfully`);
    res.json({ success: true, message: 'Lecturer unassigned successfully' });
  } catch (error) {
    console.error('❌ Error unassigning lecturer:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/courses/:id', async (req, res) => {
  console.log('\n🗑️ DELETING COURSE');
  console.log(`📖 Course ID: ${req.params.id}`);
  
  try {
    await db.collection('courses').doc(req.params.id).delete();
    console.log(`✅ Course deleted successfully`);
    res.json({ success: true, message: 'Course deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting course:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============ LECTURERS ============
app.get('/api/lecturers', async (req, res) => {
  try {
    const snapshot = await db.collection('lecturers').get();
    const lecturers = [];
    snapshot.forEach(doc => lecturers.push({ id: doc.id, ...doc.data() }));
    console.log(`👨‍🏫 Retrieved ${lecturers.length} lecturers`);
    res.json({ lecturers });
  } catch (error) {
    console.error('Error fetching lecturers:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/lecturers', async (req, res) => {
  console.log('\n👨‍🏫 ADDING NEW LECTURER');
  console.log(`📧 Email: ${req.body.email}`);
  console.log(`👤 Name: ${req.body.name}`);
  console.log(`📚 Department: ${req.body.department || 'Not specified'}`);
  
  try {
    const { name, email, department, specialization } = req.body;
    const lecturerData = {
      name, email,
      department: department || '',
      specialization: specialization || '',
      createdAt: new Date().toISOString()
    };
    const docRef = await db.collection('lecturers').add(lecturerData);
    console.log(`✅ Lecturer added successfully! ID: ${docRef.id}`);
    res.json({ success: true, message: 'Lecturer added successfully', lecturer: { id: docRef.id, ...lecturerData } });
  } catch (error) {
    console.error('❌ Error adding lecturer:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============ LECTURES ============
app.get('/api/lectures', async (req, res) => {
  try {
    const snapshot = await db.collection('lectures').get();
    const lectures = [];
    snapshot.forEach(doc => lectures.push({ id: doc.id, ...doc.data() }));
    console.log(`📖 Retrieved ${lectures.length} lectures`);
    res.json({ lectures });
  } catch (error) {
    console.error('Error fetching lectures:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/lectures', async (req, res) => {
  console.log('\n📖 ADDING NEW LECTURE');
  console.log(`📚 Title: ${req.body.title}`);
  console.log(`📅 Date: ${req.body.date}`);
  console.log(`⏰ Time: ${req.body.time}`);
  console.log(`📍 Venue: ${req.body.venue}`);
  
  try {
    const { title, courseId, date, time, venue, lecturerId, totalStudents } = req.body;
    const lectureData = {
      title, courseId, date, time, venue,
      lecturerId: lecturerId || null,
      totalStudents: parseInt(totalStudents) || 0,
      attendance: 0,
      createdAt: new Date().toISOString()
    };
    const docRef = await db.collection('lectures').add(lectureData);
    console.log(`✅ Lecture added successfully! ID: ${docRef.id}`);
    res.json({ success: true, message: 'Lecture added successfully', lecture: { id: docRef.id, ...lectureData } });
  } catch (error) {
    console.error('❌ Error adding lecture:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============ REPORTS ============
app.get('/api/reports', async (req, res) => {
  try {
    const snapshot = await db.collection('reports').get();
    const reports = [];
    snapshot.forEach(doc => reports.push({ id: doc.id, ...doc.data() }));
    console.log(`📋 Retrieved ${reports.length} reports`);
    res.json({ reports });
  } catch (error) {
    console.error('Error fetching reports:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/reports/:id/feedback', async (req, res) => {
  console.log('\n💬 ADDING FEEDBACK TO REPORT');
  console.log(`📋 Report ID: ${req.params.id}`);
  console.log(`💬 Feedback: ${req.body.feedback}`);
  
  try {
    const { feedback } = req.body;
    await db.collection('reports').doc(req.params.id).update({
      feedback,
      status: 'reviewed',
      reviewedAt: new Date().toISOString()
    });
    console.log(`✅ Feedback added successfully`);
    res.json({ success: true, message: 'Feedback added successfully' });
  } catch (error) {
    console.error('❌ Error adding feedback:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============ RATINGS ============
app.post('/api/rate-course', async (req, res) => {
  console.log('\n⭐ COURSE RATING SUBMITTED');
  console.log(`📖 Course ID: ${req.body.courseId}`);
  console.log(`⭐ Rating: ${req.body.rating}/5`);
  console.log(`💬 Review: ${req.body.review || 'No review'}`);
  
  try {
    const { courseId, rating, review, raterName } = req.body;
    await db.collection('courseRatings').add({
      courseId, rating: parseInt(rating), review: review || '',
      raterName: raterName || 'Anonymous', date: new Date().toISOString()
    });
    console.log(`✅ Rating submitted successfully`);
    res.json({ success: true, message: 'Rating submitted successfully' });
  } catch (error) {
    console.error('❌ Error submitting rating:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/course-ratings/:courseId', async (req, res) => {
  try {
    const snapshot = await db.collection('courseRatings').where('courseId', '==', req.params.courseId).get();
    const ratings = [];
    snapshot.forEach(doc => ratings.push(doc.data()));
    const avgRating = ratings.length > 0 ? (ratings.reduce((s, r) => s + r.rating, 0) / ratings.length).toFixed(1) : 0;
    console.log(`⭐ Retrieved ${ratings.length} ratings for course ${req.params.courseId}, Avg: ${avgRating}`);
    res.json({ ratings, avgRating: parseFloat(avgRating), count: ratings.length });
  } catch (error) {
    console.error('Error fetching ratings:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/rate-lecturer', async (req, res) => {
  console.log('\n⭐ LECTURER RATING SUBMITTED');
  console.log(`👨‍🏫 Lecturer ID: ${req.body.lecturerId}`);
  console.log(`⭐ Rating: ${req.body.rating}/5`);
  console.log(`💬 Review: ${req.body.review || 'No review'}`);
  
  try {
    const { lecturerId, rating, review, raterName } = req.body;
    await db.collection('lecturerRatings').add({
      lecturerId, rating: parseInt(rating), review: review || '',
      raterName: raterName || 'Anonymous', date: new Date().toISOString()
    });
    console.log(`✅ Rating submitted successfully`);
    res.json({ success: true, message: 'Rating submitted successfully' });
  } catch (error) {
    console.error('❌ Error submitting rating:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/lecturer-ratings/:lecturerId', async (req, res) => {
  try {
    const snapshot = await db.collection('lecturerRatings').where('lecturerId', '==', req.params.lecturerId).get();
    const ratings = [];
    snapshot.forEach(doc => ratings.push(doc.data()));
    const avgRating = ratings.length > 0 ? (ratings.reduce((s, r) => s + r.rating, 0) / ratings.length).toFixed(1) : 0;
    console.log(`⭐ Retrieved ${ratings.length} ratings for lecturer ${req.params.lecturerId}, Avg: ${avgRating}`);
    res.json({ ratings, avgRating: parseFloat(avgRating), count: ratings.length });
  } catch (error) {
    console.error('Error fetching ratings:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============ STATUS ============
app.get('/api/status', (req, res) => {
  res.json({ 
    firebaseConnected: true, 
    message: 'Firebase is connected and ready',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.json({ 
    message: 'University Monitoring System API', 
    status: 'running',
    firebaseConnected: true,
    endpoints: {
      auth: '/api/auth (register/login)',
      courses: '/api/courses',
      lecturers: '/api/lecturers',
      lectures: '/api/lectures',
      reports: '/api/reports',
      ratings: '/api/rate-course, /api/rate-lecturer'
    }
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log('\n========================================');
  console.log('✅ SERVER RUNNING');
  console.log(`📍 http://localhost:${PORT}`);
  console.log(`🔥 Firebase: CONNECTED`);
  console.log('========================================');
  console.log('\n📋 Ready to accept requests...\n');
});