import api from '../config/api';

class RatingService {
  // Submit rating (Student only)
  async submitRating(lectureId, rating, comment, studentId) {
    try {
      const response = await api.post('/ratings', { lectureId, rating, comment, studentId });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error submitting rating:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to submit rating' 
      };
    }
  }

  // Get ratings for a lecturer
  async getLecturerRatings(lecturerId) {
    try {
      const response = await api.get(`/ratings/lecturer/${lecturerId}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error fetching lecturer ratings:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to fetch ratings' 
      };
    }
  }

  // Get ratings for a lecture
  async getLectureRatings(lectureId) {
    try {
      const response = await api.get(`/ratings/lecture/${lectureId}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error fetching lecture ratings:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to fetch ratings' 
      };
    }
  }

  // Get average rating for a lecture
  async getLectureAverageRating(lectureId) {
    try {
      const result = await this.getLectureRatings(lectureId);
      if (result.success && result.data.averageRating) {
        return { success: true, averageRating: result.data.averageRating };
      }
      return { success: false, averageRating: 0 };
    } catch (error) {
      console.error('Error calculating average rating:', error);
      return { success: false, averageRating: 0 };
    }
  }
}

export default new RatingService();