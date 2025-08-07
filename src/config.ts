export const config = {
  // Replace this with your actual .NET Web API endpoint
  API_BASE_URL: 'http://localhost:5268',
  API_ENDPOINTS: {
    CHAT: '/api/Tutor/ask',
    // Add other endpoints as needed
  }
};

// Helper function to get full API URL
export const getApiUrl = (endpoint: string) => {
  return `${config.API_BASE_URL}${endpoint}`;
}; 