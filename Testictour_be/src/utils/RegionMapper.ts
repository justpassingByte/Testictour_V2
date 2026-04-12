/** Maps a sub-region ID (e.g. "VN2", "NA1") to a Riot routing cluster */
export const getRegionalRoutingValue = (region: string): string => {
  region = region.toLowerCase();
  switch (region) {
    // Americas
    case 'na':
    case 'na1':
    case 'br':
    case 'br1':
    case 'la1':
    case 'la2':
    case 'oc1':
      return 'americas';
    // Europe
    case 'euw':
    case 'euw1':
    case 'eun':
    case 'eun1':
    case 'tr':
    case 'tr1':
    case 'ru':
      return 'europe';
    // Asia / APAC
    case 'kr':
    case 'jp':
    case 'jp1':
    case 'sea':
    case 'vn2':
    case 'ph2':
    case 'sg2':
    case 'th2':
    case 'tw2':
      return 'asia';
    default:
      return 'asia'; // Default to 'asia' if region is not recognized
  }
};

/** Maps a sub-region ID to a Major Region ID (AMER | EMEA | APAC) */
export const getMajorRegion = (region: string): string => {
  region = region.toLowerCase();
  switch (region) {
    case 'na':
    case 'na1':
    case 'br':
    case 'br1':
    case 'la1':
    case 'la2':
    case 'oc1':
      return 'AMER';
    case 'euw':
    case 'euw1':
    case 'eun':
    case 'eun1':
    case 'tr':
    case 'tr1':
    case 'ru':
      return 'EMEA';
    case 'kr':
    case 'jp':
    case 'jp1':
    case 'sea':
    case 'vn2':
    case 'ph2':
    case 'sg2':
    case 'th2':
    case 'tw2':
    default:
      return 'APAC';
  }
};

export const getPlatformIdentifier = (region: string): string => {
  region = region.toLowerCase();
  switch (region) {
    case 'na':
    case 'na1':   return 'na1';
    case 'br':
    case 'br1':   return 'br1';
    case 'la1':   return 'la1';
    case 'la2':   return 'la2';
    case 'oc1':   return 'oc1';
    case 'euw':
    case 'euw1':  return 'euw1';
    case 'eun':
    case 'eun1':  return 'eun1';
    case 'tr':
    case 'tr1':   return 'tr1';
    case 'ru':    return 'ru';
    case 'kr':    return 'kr';
    case 'jp':
    case 'jp1':   return 'jp1';
    case 'sea':   return 'sea';
    case 'vn2':   return 'vn2';
    case 'ph2':   return 'ph2';
    case 'sg2':   return 'sg2';
    case 'th2':   return 'th2';
    case 'tw2':   return 'tw2';
    default:      return 'vn2'; // Default to a common SEA platform identifier
  }
};