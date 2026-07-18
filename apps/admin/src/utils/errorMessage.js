export const getApiErrorMessage = (error, fallback = "Request failed") => {
  const data = error?.response?.data;

  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    const details = data.errors
      .map((item) => {
        const field = item.path || item.param || item.field;
        return field ? `${field}: ${item.msg}` : item.msg;
      })
      .filter(Boolean)
      .join("; ");

    return details ? `${fallback}: ${details}` : fallback;
  }

  if (data?.message) {
    return data.message === fallback ? fallback : `${fallback}: ${data.message}`;
  }

  if (error?.response?.status) {
    return `${fallback}: server returned HTTP ${error.response.status}`;
  }

  if (error?.request) {
    return `${fallback}: backend did not respond. Check that the Express API is running on port 5000.`;
  }

  if (error?.message) {
    return `${fallback}: ${error.message}`;
  }

  return fallback;
};
