const express = require('express');
const router = express.Router();

// Helper to get db from app locals
const getDb = (req) => req.app.locals.db;

// Mark attendance
router.post('/', async (req, res) => {
  const { lectureId, lectureTitle, status, studentId, studentName, courseId } = req.body;
  const db = getDb(req);
  
  console.log('📝 Attendance marking:', { lectureId, status, studentId });
  
  if (!lectureId || !status) {
    return res.status(400).json({ error: 'Please provide lectureId and status' });
  }
  
  if (!db) {
    return res.status(500).json({ error: 'Database not connected' });
  }
  
  try {
    // Check if already marked
    const snapshot = await db.collection('attendance')
      .where('lectureId', '==', lectureId)
      .where('studentId', '==', studentId || 'student1')
      .get();
    
    if (!snapshot.empty) {
      return res.status(400).json({ error: 'Attendance already marked for this lecture' });
    }
    
    const record = {
      lectureId,
      lectureTitle: lectureTitle || '',
      status,
      studentId: studentId || 'student1',
      studentName: studentName || 'Student',
      courseId: courseId || '',
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    
    const docRef = await db.collection('attendance').add(record);
    console.log(`✅ Attendance stored in Firestore: ${docRef.id}`);
    
    // Also update the lecture's attendance count
    const lectureRef = db.collection('lectures').doc(lectureId);
    const lectureDoc = await lectureRef.get();
    
    if (lectureDoc.exists) {
      const currentData = lectureDoc.data();
      const currentAttendance = currentData.attendance || 0;
      const totalStudents = currentData.totalStudents || 0;
      
      let newAttendance = currentAttendance;
      if (status === 'present') {
        newAttendance = currentAttendance + 1;
      }
      
      const attendanceRate = totalStudents > 0 ? (newAttendance / totalStudents) * 100 : 0;
      
      await lectureRef.update({
        attendance: newAttendance,
        attendanceRate: attendanceRate.toFixed(1),
        updatedAt: new Date().toISOString()
      });
    }
    
    res.json({ success: true, attendance: { id: docRef.id, ...record } });
  } catch (error) {
    console.error('Error marking attendance:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mark bulk attendance for a lecture (lecturer marks multiple students)
router.post('/bulk', async (req, res) => {
  const { lectureId, lectureTitle, students, courseId } = req.body;
  const db = getDb(req);
  
  console.log('📝 Bulk attendance marking for lecture:', lectureId);
  
  if (!lectureId || !students || !Array.isArray(students)) {
    return res.status(400).json({ error: 'Please provide lectureId and students array' });
  }
  
  if (!db) {
    return res.status(500).json({ error: 'Database not connected' });
  }
  
  try {
    const batch = db.batch();
    let presentCount = 0;
    
    for (const student of students) {
      const record = {
        lectureId,
        lectureTitle: lectureTitle || '',
        status: student.status || 'present',
        studentId: student.studentId || `student_${Date.now()}_${Math.random()}`,
        studentName: student.studentName || 'Student',
        courseId: courseId || '',
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      
      if (student.status === 'present') {
        presentCount++;
      }
      
      const docRef = db.collection('attendance').doc();
      batch.set(docRef, record);
    }
    
    await batch.commit();
    console.log(`✅ Bulk attendance stored in Firestore: ${students.length} records`);
    
    // Update the lecture's attendance count
    const lectureRef = db.collection('lectures').doc(lectureId);
    const lectureDoc = await lectureRef.get();
    
    if (lectureDoc.exists) {
      const currentData = lectureDoc.data();
      const totalStudents = currentData.totalStudents || 0;
      const attendanceRate = totalStudents > 0 ? (presentCount / totalStudents) * 100 : 0;
      
      await lectureRef.update({
        attendance: presentCount,
        attendanceRate: attendanceRate.toFixed(1),
        attendanceMarked: true,
        attendanceMarkedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    
    res.json({ success: true, message: `${students.length} attendance records saved`, presentCount });
  } catch (error) {
    console.error('Error marking bulk attendance:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user's attendance records (for student dashboard)
router.get('/user', async (req, res) => {
  const db = getDb(req);
  const studentId = req.query.studentId || 'student1';
  
  console.log('📋 Fetching user attendance for student:', studentId);
  
  if (!db) {
    return res.status(500).json({ error: 'Database not connected' });
  }
  
  try {
    const snapshot = await db.collection('attendance')
      .where('studentId', '==', studentId)
      .get();
    
    const userAttendance = [];
    snapshot.forEach(doc => {
      userAttendance.push({ id: doc.id, ...doc.data() });
    });
    
    console.log(`✅ Retrieved ${userAttendance.length} attendance records from Firestore`);
    res.json(userAttendance);
  } catch (error) {
    console.error('Error fetching user attendance:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get attendance for a lecture (for lecturer/PRL)
router.get('/lecture/:lectureId', async (req, res) => {
  const { lectureId } = req.params;
  const db = getDb(req);
  
  if (!db) {
    return res.status(500).json({ error: 'Database not connected' });
  }
  
  try {
    const snapshot = await db.collection('attendance')
      .where('lectureId', '==', lectureId)
      .get();
    
    const records = [];
    snapshot.forEach(doc => {
      records.push({ id: doc.id, ...doc.data() });
    });
    
    const total = records.length;
    const present = records.filter(a => a.status === 'present').length;
    const absent = records.filter(a => a.status === 'absent').length;
    const late = records.filter(a => a.status === 'late').length;
    const percentage = total > 0 ? (present / total) * 100 : 0;
    
    res.json({
      total,
      present,
      absent,
      late,
      percentage: percentage.toFixed(2),
      records
    });
  } catch (error) {
    console.error('Error fetching lecture attendance:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get attendance summary for a student
router.get('/student/summary', async (req, res) => {
  const db = getDb(req);
  const studentId = req.query.studentId || 'student1';
  
  if (!db) {
    return res.status(500).json({ error: 'Database not connected' });
  }
  
  try {
    const snapshot = await db.collection('attendance')
      .where('studentId', '==', studentId)
      .get();
    
    const studentRecords = [];
    snapshot.forEach(doc => {
      studentRecords.push({ id: doc.id, ...doc.data() });
    });
    
    const total = studentRecords.length;
    const present = studentRecords.filter(a => a.status === 'present').length;
    const absent = studentRecords.filter(a => a.status === 'absent').length;
    const late = studentRecords.filter(a => a.status === 'late').length;
    const percentage = total > 0 ? (present / total) * 100 : 0;
    
    // Get course-wise breakdown
    const courseWise = {};
    studentRecords.forEach(record => {
      if (record.courseId) {
        if (!courseWise[record.courseId]) {
          courseWise[record.courseId] = { total: 0, present: 0 };
        }
        courseWise[record.courseId].total++;
        if (record.status === 'present') {
          courseWise[record.courseId].present++;
        }
      }
    });
    
    res.json({
      total,
      present,
      absent,
      late,
      percentage: percentage.toFixed(2),
      courseWise,
      records: studentRecords
    });
  } catch (error) {
    console.error('Error fetching student summary:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all attendance (for PRL/PL)
router.get('/all', async (req, res) => {
  const db = getDb(req);
  
  if (!db) {
    return res.status(500).json({ error: 'Database not connected' });
  }
  
  try {
    const snapshot = await db.collection('attendance').get();
    const allAttendance = [];
    snapshot.forEach(doc => {
      allAttendance.push({ id: doc.id, ...doc.data() });
    });
    
    res.json(allAttendance);
  } catch (error) {
    console.error('Error fetching all attendance:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get attendance statistics for a course
router.get('/course/:courseId/stats', async (req, res) => {
  const { courseId } = req.params;
  const db = getDb(req);
  
  if (!db) {
    return res.status(500).json({ error: 'Database not connected' });
  }
  
  try {
    const snapshot = await db.collection('attendance')
      .where('courseId', '==', courseId)
      .get();
    
    const records = [];
    snapshot.forEach(doc => {
      records.push({ id: doc.id, ...doc.data() });
    });
    
    const totalStudents = new Set(records.map(r => r.studentId)).size;
    const totalLectures = new Set(records.map(r => r.lectureId)).size;
    const totalPresent = records.filter(r => r.status === 'present').length;
    const overallAttendance = records.length > 0 ? (totalPresent / records.length) * 100 : 0;
    
    res.json({
      courseId,
      totalStudents,
      totalLectures,
      totalRecords: records.length,
      totalPresent,
      overallAttendance: overallAttendance.toFixed(2),
      records
    });
  } catch (error) {
    console.error('Error fetching course attendance stats:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;