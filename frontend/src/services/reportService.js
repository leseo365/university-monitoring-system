import api from '../config/api';

class ReportService {
  // Get all reports
  async getAllReports() {
    try {
      const response = await api.get('/reports');
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error fetching reports:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to fetch reports' 
      };
    }
  }

  // Get report by ID
  async getReportById(reportId) {
    try {
      const response = await api.get(`/reports/${reportId}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error fetching report:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Report not found' 
      };
    }
  }

  // Create new report (Lecturer only)
  async createReport(reportData) {
    try {
      const response = await api.post('/reports', reportData);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error creating report:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to create report' 
      };
    }
  }

  // Add feedback to report (PRL/PL only)
  async addFeedback(reportId, feedback) {
    try {
      const response = await api.post(`/reports/${reportId}/feedback`, { feedback });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error adding feedback:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to add feedback' 
      };
    }
  }

  // Get reports by lecturer
  async getReportsByLecturer(lecturerId) {
    try {
      const response = await api.get(`/reports?lecturerId=${lecturerId}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error fetching lecturer reports:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to fetch reports' 
      };
    }
  }
}

export default new ReportService();