// Rate limiting setup
const rateLimitWindowMs = 1000; // 1 second
const maxRequestsPerWindow = 1000;
const requestCounts = new Map();

export const checkRateLimit = (ip: string) => {
  const currentTime = Date.now();
  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, { count: 1, time: currentTime });
    return false; // Not rate limited
  }

  const requestData = requestCounts.get(ip);
  if (currentTime - requestData.time > rateLimitWindowMs) {
    // Reset the count after the time window has passed
    requestData.count = 1;
    requestData.time = currentTime;
    return false; // Not rate limited
  }

  if (requestData.count > maxRequestsPerWindow) {
    return true; // Rate limited
  }

  // Increase the count and continue
  requestData.count++;
  return false; // Not rate limited
};
