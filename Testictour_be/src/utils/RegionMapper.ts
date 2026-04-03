export const getRegionalRoutingValue = (region: string): string => {
  region = region.toLowerCase();
  switch (region) {
    case 'na':
    case 'br':
    case 'la1':
    case 'la2':
    case 'oc1':
      return 'americas';
    case 'euw':
    case 'eun':
    case 'tr':
    case 'ru':
      return 'europe';
    case 'kr':
    case 'jp':
      return 'asia';
    case 'sea': // SEA is a special case for account-v1, often maps to asia
    case 'vn2':
    case 'ph2':
    case 'sg2':
    case 'th2':
    case 'tw2':
      return 'asia'; // Mapping SEA platform identifiers to 'asia' for account-v1
    default:
      return 'asia'; // Default to 'asia' if region is not recognized
  }
};

export const getPlatformIdentifier = (region: string): string => {
  region = region.toLowerCase();
  switch (region) {
    case 'na': return 'na1';
    case 'br': return 'br1';
    case 'la1': return 'la1';
    case 'la2': return 'la2';
    case 'oc1': return 'oc1';
    case 'euw': return 'euw1';
    case 'eun': return 'eun1';
    case 'tr': return 'tr1';
    case 'ru': return 'ru';
    case 'kr': return 'kr';
    case 'jp': return 'jp1';
    case 'sea': return 'sea'; // This will be used if a generic SEA is given
    case 'vn2': return 'vn2';
    case 'ph2': return 'ph2';
    case 'sg2': return 'sg2';
    case 'th2': return 'th2';
    case 'tw2': return 'tw2';
    default: return 'vn2'; // Default to a common SEA platform identifier
  }
}; 