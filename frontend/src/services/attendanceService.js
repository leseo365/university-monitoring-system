import api from '../config/api';

class AttendanceService {
  // Mark attendance (Student only)
  async markAttendance(lectureId, status, studentId) {
    try {
      const response = await api.post('/attendance', { lectureId, status, studentId });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error marking attendance:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to mark attendance' 
      };
    }
  }

  // Get attendance for a lecture
  async getLectureAttendance(lectureId) {
    try {
      const response = await api.get(`/attendance/lecture/${lectureId}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error fetching attendance:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to fetch attendance' 
      };
    }
  }

  // Get student attendance summary
  async getStudentAttendanceSummary(studentId) {
    try {
      const response = await api.get(`/attendance/student/summary?studentId=${studentId}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error fetching student summary:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to fetch attendance summary' 
      };
    }
  }

  // Get all attendance records (PRL/PL only)
  async getAllAttendance() {
    try {
      const response = await api.get('/attendance/all');
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error fetching all attendance:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to fetch attendance records' 
      };
    }
  }

  // Get attendance percentage
  async getAttendancePercentage(studentId) {
    try {
      const summary = await this.getStudentAttendanceSummary(studentId);
      if (summary.success) {
        const percentage = summary.data.percentage || 0;
        return { success: true, percentage };
      }
      return { success: false, percentage: 0 };
    } catch (error) {
      console.error('Error calculating percentage:', error);
      return { success: false, percentage: 0 };
    }
  }
}

export default new AttendanceService();