// Format date
export const formatDate = (date) => {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Format time
export const formatTime = (time) => {
  const t = new Date(time);
  return t.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Get greeting based on time of day
export const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

// Calculate attendance percentage
export const calculateAttendancePercentage = (present, total) => {
  if (total === 0) return 0;
  return ((present / total) * 100).toFixed(2);
};

// Get color based on attendance percentage
export const getAttendanceColor = (percentage) => {
  if (percentage >= 75) return '#4CAF50';
  if (percentage >= 60) return '#FF9800';
  return '#F44336';
};

// Render stars for rating
export const renderStars = (rating) => {
  return '★'.repeat(rating) + '☆'.repeat(5 - rating);
};

// Validate email
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Truncate text
export const truncateText = (text, maxLength) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// Generate random ID
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Group by key
export const groupBy = (array, key) => {
  return array.reduce((result, item) => {
    const groupKey = item[key];
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {});
};

// Sort by date
export const sortByDate = (array, key, ascending = true) => {
  return array.sort((a, b) => {
    const dateA = new Date(a[key]);
    const dateB = new Date(b[key]);
    if (ascending) {
      return dateA - dateB;
    } else {
      return dateB - dateA;
    }
  });
};

// Debounce function
export const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(null, args);
    }, delay);
  };
};

// Capitalize first letter
export const capitalizeFirstLetter = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

// Get status color
export const getStatusColor = (status) => {
  switch(status) {
    case 'present': return '#4CAF50';
    case 'absent': return '#F44336';
    case 'late': return '#FF9800';
    default: return '#9E9E9E';
  }
};