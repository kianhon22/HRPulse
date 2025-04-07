/**
 * Capitalizes the first letter of a string
 * @param str The string to capitalize
 * @returns The string with the first letter capitalized
 */
export const capitalizeFirstLetter = (str?: string): string => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Converts a string to title case (capitalizes first letter of each word)
 * @param str The string to convert to title case
 * @returns The string in title case
 */
export const toTitleCase = (str?: string): string => {
  if (!str) return '';
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Formats a date as a string
 * @param date The date to format
 * @param format The format to use (default: 'medium')
 * @returns The formatted date string
 */
export const formatDate = (date?: Date | string | null, format: 'short' | 'medium' | 'long' = 'medium'): string => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (format === 'short') {
    return dateObj.toLocaleDateString();
  } else if (format === 'long') {
    return dateObj.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } else {
    return dateObj.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
};

export const formatTotalHours = (totalHours: number | null): string => {
  if (totalHours === null) return '--:--';
  const hours = Math.floor(totalHours);
  const minutes = Math.round((totalHours - hours) * 60);
  return `${hours} hr ${minutes} min`;
  // return `${hours} hr${hours !== 1 ? 's' : ''} ${minutes} min`;
}