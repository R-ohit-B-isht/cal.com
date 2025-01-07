export const mockApiErrors = {
  rateLimitError: {
    code: 429,
    message: "API rate limit exceeded"
  },
  authError: {
    code: 124,
    message: "Invalid access token"
  },
  networkError: {
    code: 500,
    message: "Network error occurred"
  }
};

export const mockErrorResponses = {
  rateLimit: () => Promise.reject(new Error(JSON.stringify(mockApiErrors.rateLimitError))),
  auth: () => Promise.reject(new Error(JSON.stringify(mockApiErrors.authError))),
  network: () => Promise.reject(new Error(JSON.stringify(mockApiErrors.networkError)))
};
