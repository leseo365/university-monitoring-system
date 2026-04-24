import api from '../config/api';

class LectureService {
  // Get all lectures
  async getAllLectures() {
    try {
      const response = await api.get('/lectures');
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error fetching lectures:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to fetch lectures' 
      };
    }
  }

  // Get lecture by ID
  async getLectureById(lectureId) {
    try {
      const response = await api.get(`/lectures/${lectureId}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error fetching lecture:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Lecture not found' 
      };
    }
  }

  // Get lectures by course
  async getLecturesByCourse(courseId) {
    try {
      const response = await api.get(`/lectures?courseId=${courseId}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error fetching course lectures:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to fetch lectures' 
      };
    }
  }

  // Create new lecture (Lecturer only)
  async createLecture(lectureData) {
    try {
      const response = await api.post('/lectures', lectureData);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error creating lecture:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to create lecture' 
      };
    }
  }

  // Update lecture
  async updateLecture(lectureId, lectureData) {
    try {
      const response = await api.put(`/lectures/${lectureId}`, lectureData);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error updating lecture:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to update lecture' 
      };
    }
  }

  // Delete lecture
  async deleteLecture(lectureId) {
    try {
      const response = await api.delete(`/lectures/${lectureId}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error deleting lecture:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to delete lecture' 
      };
    }
  }
}

export default new LectureService();