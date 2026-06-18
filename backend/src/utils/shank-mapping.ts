export const dataSizeToVolumeMb = (dataSize: string): number => {
  const cleaned = dataSize.trim().toUpperCase().replace(/\s/g, '');

  const gbMatch = cleaned.match(/^(\d+(?:\.\d+)?)GB$/);
  if (gbMatch) {
    return Math.round(parseFloat(gbMatch[1]) * 1000);
  }

  const mbMatch = cleaned.match(/^(\d+(?:\.\d+)?)MB$/);
  if (mbMatch) {
    return Math.round(parseFloat(mbMatch[1]));
  }

  const digitsOnly = cleaned.replace(/\D/g, '');
  if (digitsOnly) {
    return parseInt(digitsOnly, 10) * 1000;
  }

  throw new Error(`Cannot parse dataSize "${dataSize}" into volume_mb`);
};

export const mapNetworkCodeToShankId = (code: string): number | null => {
  const mapping: Record<string, number> = {
    MTN: 3,
    TELECEL: 2,
    AIRTELTIGO: 1,
  };
  return mapping[code.toUpperCase()] ?? null;
};
