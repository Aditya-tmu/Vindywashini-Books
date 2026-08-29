import { INDIAN_STATES } from '../config/constants';

export interface GSTINValidationResult {
  isValid: boolean;
  stateCode?: string;
  stateName?: string;
  pan?: string;
  entityNumber?: string;
  checksumValid?: boolean;
  error?: string;
}

export function validateGSTIN(gstin: string): GSTINValidationResult {
  if (!gstin || typeof gstin !== 'string') {
    return { isValid: false, error: 'GSTIN cannot be empty' };
  }

  const cleanGstin = gstin.trim().toUpperCase();

  // GSTIN format: 2 digits state code + 10 chars PAN + 1 char entity num (1-9/A-Z) + 'Z' + 1 char checksum
  const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  if (!regex.test(cleanGstin)) {
    return {
      isValid: false,
      error: 'Invalid GSTIN format (e.g. 10AAAAA0000A1Z5)',
    };
  }

  const stateCode = cleanGstin.substring(0, 2);
  const pan = cleanGstin.substring(2, 12);
  const entityNumber = cleanGstin.substring(12, 13);
  const checksumChar = cleanGstin.substring(14, 15);

  const stateObj = INDIAN_STATES[stateCode];
  const stateName = stateObj ? stateObj.name : 'Unknown State';

  // Checksum calculation using Mod 36 algorithm
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let factor = 1;
  let sum = 0;

  for (let i = 0; i < 14; i++) {
    const codePoint = chars.indexOf(cleanGstin[i]);
    let addend = factor * codePoint;
    factor = factor === 2 ? 1 : 2;
    addend = Math.floor(addend / 36) + (addend % 36);
    sum += addend;
  }

  const remainder = sum % 36;
  const checkCodePoint = (36 - remainder) % 36;
  const calculatedChecksumChar = chars[checkCodePoint];

  const isChecksumValid = calculatedChecksumChar === checksumChar;

  return {
    isValid: isChecksumValid,
    stateCode,
    stateName,
    pan,
    entityNumber,
    checksumValid: isChecksumValid,
    error: isChecksumValid ? undefined : `Checksum mismatch (expected ${calculatedChecksumChar})`,
  };
}

export function getStateFromGSTIN(gstin: string): { stateCode: string; stateName: string } {
  if (!gstin || gstin.length < 2) return { stateCode: '10', stateName: 'Bihar' };
  const code = gstin.substring(0, 2);
  const state = INDIAN_STATES[code];
  return {
    stateCode: code,
    stateName: state ? state.name : 'Other State',
  };
}
