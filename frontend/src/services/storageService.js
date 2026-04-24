import AsyncStorage from '@react-native-async-storage/async-storage';

class StorageService {
  // Save data
  async saveData(key, value) {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
      return { success: true };
    } catch (error) {
      console.error('Error saving data:', error);
      return { success: false, error: error.message };
    }
  }

  // Get data
  async getData(key) {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return { 
        success: true, 
        data: jsonValue != null ? JSON.parse(jsonValue) : null 
      };
    } catch (error) {
      console.error('Error getting data:', error);
      return { success: false, error: error.message, data: null };
    }
  }

  // Remove data
  async removeData(key) {
    try {
      await AsyncStorage.removeItem(key);
      return { success: true };
    } catch (error) {
      console.error('Error removing data:', error);
      return { success: false, error: error.message };
    }
  }

  // Clear all data
  async clearAll() {
    try {
      await AsyncStorage.clear();
      return { success: true };
    } catch (error) {
      console.error('Error clearing data:', error);
      return { success: false, error: error.message };
    }
  }

  // Get multiple keys
  async getMultipleKeys(keys) {
    try {
      const values = await AsyncStorage.multiGet(keys);
      const result = {};
      values.forEach(([key, value]) => {
        result[key] = value ? JSON.parse(value) : null;
      });
      return { success: true, data: result };
    } catch (error) {
      console.error('Error getting multiple keys:', error);
      return { success: false, error: error.message };
    }
  }

  // Save multiple keys
  async saveMultipleKeys(keyValuePairs) {
    try {
      const pairs = keyValuePairs.map(([key, value]) => [
        key, 
        JSON.stringify(value)
      ]);
      await AsyncStorage.multiSet(pairs);
      return { success: true };
    } catch (error) {
      console.error('Error saving multiple keys:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new StorageService();