// Date Utility Functions
class DateUtils {
  /**
   * Format date to YYYY-MM-DD
   */
  static formatDate(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Add days to a date
   */
  static addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * Check if date is valid
   */
  static isValidDate(dateString) {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
  }

  /**
   * Get difference in days between two dates
   */
  static daysDifference(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2 - d1);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  /**
   * Convert ISO duration to minutes
   * Example: PT2H30M → 150 minutes
   */
  static isoDurationToMinutes(duration) {
    const match = duration.match(/PT(\d+H)?(\d+M)?/);
    if (!match) return 0;

    const hours = match[1] ? parseInt(match[1]) : 0;
    const minutes = match[2] ? parseInt(match[2]) : 0;

    return hours * 60 + minutes;
  }
}

module.exports = DateUtils;
