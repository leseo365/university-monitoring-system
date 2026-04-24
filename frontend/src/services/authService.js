import api from '../config/api';

class CourseService {
  // Get all courses
  async getAllCourses() {
    try {
      const response = await api.get('/courses');
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error fetching courses:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to fetch courses' 
      };
    }
  }

  // Get course by ID
  async getCourseById(courseId) {
    try {
      const response = await api.get(`/courses/${courseId}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error fetching course:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Course not found' 
      };
    }
  }

  // Create new course (PL only)
  async createCourse(courseData) {
    try {
      const response = await api.post('/courses', courseData);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error creating course:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to create course' 
      };
    }
  }

  // Update course
  async updateCourse(courseId, courseData) {
    try {
      const response = await api.put(`/courses/${courseId}`, courseData);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error updating course:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to update course' 
      };
    }
  }

  // Delete course (PL only)
  async deleteCourse(courseId) {
    try {
      const response = await api.delete(`/courses/${courseId}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error deleting course:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to delete course' 
      };
    }
  }

  // Assign lecturer to course (PL only)
  async assignLecturer(courseId, lecturerId) {
    try {
      const response = await api.put(`/courses/${courseId}/assign`, { lecturerId });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error assigning lecturer:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to assign lecturer' 
      };
    }
  }

  // Get courses by stream (PRL only)
  async getCoursesByStream(stream) {
    try {
      const response = await api.get(`/courses?stream=${stream}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error fetching courses by stream:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to fetch courses' 
      };
    }
  }
}

export default new CourseService();