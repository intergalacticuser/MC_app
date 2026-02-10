// Utility for haptic feedback
// Uses the Web Vibration API
export const triggerHaptic = (pattern = 10) => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      // Standardize patterns
      // 'light' -> 10ms
      // 'medium' -> 40ms
      // 'heavy' -> 70ms
      // 'success' -> [10, 30, 10]
      // 'error' -> [50, 30, 50, 30, 50]
      
      let vibrationPattern = pattern;
      
      if (pattern === 'light') vibrationPattern = 10;
      else if (pattern === 'medium') vibrationPattern = 40;
      else if (pattern === 'heavy') vibrationPattern = 70;
      else if (pattern === 'success') vibrationPattern = [10, 50, 10];
      else if (pattern === 'error') vibrationPattern = [50, 50, 50, 50, 50];
      
      navigator.vibrate(vibrationPattern);
    } catch (e) {
      // Ignore errors if vibration is not supported or blocked
    }
  }
};