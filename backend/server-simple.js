const express = require('express');
const cors = require('cors');
const ExcelJS = require('exceljs');

const app = express();
app.use(cors());
app.use(express.json());

// Sample data
const courses = [
  { id: '1', name: 'Computer Science', code: 'CS101', stream: 'Engineering', credits: 3 },
  { id: '2', name: 'Mathematics', code: 'MATH101', stream: 'Science', credits: 4 },
  { id: '3', name: 'Physics', code: 'PHY101', stream: 'Science', credits: 3 },
  { id: '4', name: 'English Literature', code: 'ENG101', stream: 'Arts', credits: 3 }
];

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'University Monitoring System API is running!',
    timestamp: new Date().toISOString(),
    endpoints: {
      courses: 'GET /api/courses',
      search: 'GET /api/search?query=term',
      export: 'GET /api/search/export/excel'
    }
  });
});

// Auth endpoints
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  res.json({ 
    success: true, 
    message: 'Login successful', 
    user: { id: 1, email: email || 'student@example.com', name: 'Demo User', role: 'student' },
    token: 'mock-token-' + Date.now()
  });
});

app.post('/api/auth/register', (req, res) => {
  const { email, name, role } = req.body;
  res.json({ 
    success: true, 
    message: 'Registration successful', 
    user: { id: Date.now(), email, name, role: role || 'student' }
  });
});

app.get('/api/auth/role', (req, res) => {
  res.json({ role: 'student' });
});

// Courses
app.get('/api/courses', (req, res) => {
  res.json(courses);
});

app.post('/api/courses', (req, res) => {
  const newCourse = { id: String(courses.length + 1), ...req.body };
  courses.push(newCourse);
  res.json({ success: true, course: newCourse });
});

// Search endpoint
app.get('/api/search', (req, res) => {
  const { query } = req.query;
  if (!query) {
    return res.json({ courses: [], lectures: [], reports: [] });
  }
  
  const searchTerm = query.toLowerCase();
  const filteredCourses = courses.filter(c => 
    c.name.toLowerCase().includes(searchTerm) || 
    c.code.toLowerCase().includes(searchTerm)
  );
  
  res.json({ courses: filteredCourses, lectures: [], reports: [] });
});

// Export to Excel
app.get('/api/search/export/excel', async (req, res) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Courses');
  
  worksheet.columns = [
    { header: 'ID', key: 'id', width: 10 },
    { header: 'Course Name', key: 'name', width: 30 },
    { header: 'Course Code', key: 'code', width: 15 },
    { header: 'Stream', key: 'stream', width: 20 },
    { header: 'Credits', key: 'credits', width: 10 }
  ];
  
  courses.forEach(course => worksheet.addRow(course));
  
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=courses.xlsx');
  await workbook.xlsx.write(res);
  res.end();
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`?? Server running on http://localhost:${PORT}`);
  console.log(`========================================`);
  console.log(`\nTest the API:`);
  console.log(`  http://localhost:${PORT}`);
  console.log(`  http://localhost:${PORT}/api/courses`);
  console.log(`  http://localhost:${PORT}/api/search?query=computer`);
  console.log(`\n========================================\n`);
});
