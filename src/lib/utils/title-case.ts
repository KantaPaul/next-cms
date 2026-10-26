export function titleCase(str: string | null | undefined): string {
  if (!str) return '';
  // Check if the string is a blood group
  const bloodGroupPattern = /^(A|B|O|AB)\s*[+-]$/i;

  if (bloodGroupPattern.test(str.trim())) {
    // Handle blood group formatting
    const [group, sign] = str.trim().split(/\s+/);
    return group.toUpperCase() + ' ' + sign;
  }

  // List of words to keep lowercase, unless they're the first or last word
  const lowercaseWords = [
    'a',
    'an',
    'the',
    'and',
    'but',
    'or',
    'for',
    'nor',
    'on',
    'at',
    'to',
    'from',
    'by',
    'in',
    'of',
  ];

  // List of acronyms or words that should be all caps
  const uppercaseWords = [
    'id',
    'tv',
    'r&d',
    'q&a',
    'ssn',
    'irs',
    'coa',
    '(coa)',
    'hrm',
  ];

  // Function to detect if a string is all uppercase (potential acronym)
  const isAcronym = (word: string): boolean => {
    return word.length > 1 && word === word.toUpperCase();
  };

  // Function to split camelCase
  const splitCamelCase = (word: string): string[] => {
    if (isAcronym(word)) return [word.toLowerCase()];
    return word.split(/(?=[A-Z])/).map(part => part.toLowerCase());
  };

  // Split the string into words, handling camelCase and underscores
  const words = str.split(/[\s_]+/).flatMap(word =>
    // First split by hyphens, but only if not a blood group
    !bloodGroupPattern.test(word)
      ? word.split('-').flatMap(part => splitCamelCase(part))
      : [word]
  );

  // Capitalize words
  const titleCaseWords = words.map((word, index, array) => {
    // Check if it's an uppercase word
    if (uppercaseWords.includes(word)) {
      return word.toUpperCase();
    }

    // Check if it should remain lowercase
    if (
      lowercaseWords.includes(word) &&
      index !== 0 &&
      index !== array.length - 1
    ) {
      return word.toLowerCase();
    }

    // Capitalize first letter for other words
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });

  // Join the words back together
  return titleCaseWords.join(' ');
}

// Test cases
// const testCases = [
//   'A +',
//   'A -',
//   'B +',
//   'B -',
//   'O +',
//   'O -',
//   'AB +',
//   'AB -',
//   'hello-world',
//   'camelCaseTest',
//   'THE QUICK BROWN FOX',
//   'a tale of two cities',
// ];

// testCases.forEach((test) => {
//   console.log(`Input: "${test}" => Output: "${titleCase(test)}"`);
// });
