import api from '../config/api';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

class SearchService {
  // Search across all modules
  async search(query, type = 'all') {
    try {
      const response = await api.get('/search', { 
        params: { query, type } 
      });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Search error:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Search failed',
        data: { courses: [], lectures: [], reports: [] }
      };
    }
  }

  // Advanced search with filters
  async advancedSearch(filters) {
    try {
      const response = await api.get('/search/advanced', { params: filters });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Advanced search error:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Search failed' 
      };
    }
  }

  // Export search results to Excel
  async exportToExcel(type = 'all') {
    try {
      const response = await api.get('/search/export/excel', {
        params: { type },
        responseType: 'blob'
      });
      
      // Create a file URI
      const timestamp = new Date().getTime();
      const fileUri = FileSystem.documentDirectory + `export_${type}_${timestamp}.xlsx`;
      
      // Convert blob to base64
      const reader = new FileReader();
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      return new Promise((resolve, reject) => {
        reader.onload = async () => {
          try {
            const base64 = reader.result.split(',')[1];
            await FileSystem.writeAsStringAsync(fileUri, base64, { 
              encoding: FileSystem.EncodingType.Base64 
            });
            
            // Share the file
            if (await Sharing.isAvailableAsync()) {
              await Sharing.shareAsync(fileUri);
              resolve({ success: true, message: 'File exported and shared' });
            } else {
              resolve({ success: true, message: 'File exported successfully', fileUri });
            }
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      
    } catch (error) {
      console.error('Export error:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to export file' 
      };
    }
  }

  // Search courses only
  async searchCourses(query) {
    return this.search(query, 'courses');
  }

  // Search lectures only
  async searchLectures(query) {
    return this.search(query, 'lectures');
  }

  // Search reports only
  async searchReports(query) {
    return this.search(query, 'reports');
  }
}

export default new SearchService();