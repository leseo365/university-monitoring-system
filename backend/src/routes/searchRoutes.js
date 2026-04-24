const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');

const getDb = (req) => req.app.locals.db;

router.get('/', async (req, res) => {
  try {
    const db = getDb(req);
    const { query, type } = req.query;
    if (!query) return res.json({ courses: [], lectures: [], reports: [] });
    
    const searchTerm = query.toLowerCase();
    const results = {};
    
    if (!type || type === 'courses') {
      const snapshot = await db.collection('courses').get();
      results.courses = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.name?.toLowerCase().includes(searchTerm) || data.code?.toLowerCase().includes(searchTerm)) {
          results.courses.push({ id: doc.id, ...data });
        }
      });
    }
    
    if (!type || type === 'lectures') {
      const snapshot = await db.collection('lectures').get();
      results.lectures = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.title?.toLowerCase().includes(searchTerm)) {
          results.lectures.push({ id: doc.id, ...data });
        }
      });
    }
    
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/export/excel', async (req, res) => {
  try {
    const db = getDb(req);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Export');
    
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 20 },
      { header: 'Name/Title', key: 'name', width: 30 },
      { header: 'Type', key: 'type', width: 15 },
      { header: 'Details', key: 'details', width: 40 }
    ];
    
    const coursesSnapshot = await db.collection('courses').get();
    coursesSnapshot.forEach(doc => {
      const data = doc.data();
      worksheet.addRow({ id: doc.id, name: data.name, type: 'Course', details: data.code });
    });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=export.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
