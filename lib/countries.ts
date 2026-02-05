/**
 * International Country Configuration
 * Defines document types, validation rules, and property sources per country
 */

export interface DocumentConfig {
  type: string;
  label: string;
  placeholder: string;
  maxLength: number;
  required: boolean;
  validation: 'cpf' | 'cnpj' | 'numeric' | 'alphanumeric' | 'none';
}

export interface AgriculturalRegistryConfig {
  type: string;
  label: string;
  placeholder: string;
  required: boolean;
  useIntegration: boolean; // true = uses API (e.g., CAR), false = manual input
}

export interface CountryConfig {
  code: string;
  name: string;
  flag: string;
  personalDoc: DocumentConfig;
  fiscalDoc: DocumentConfig | null;
  agriculturalRegistry: AgriculturalRegistryConfig;
  propertySource: 'car' | 'manual'; // car = Brazilian CAR integration, manual = upload/draw
  requiresEsg: boolean;
}

export const COUNTRIES: Record<string, CountryConfig> = {
  BR: {
    code: 'BR',
    name: 'Brasil',
    flag: '🇧🇷',
    personalDoc: {
      type: 'cpf',
      label: 'CPF',
      placeholder: '00000000000',
      maxLength: 11,
      required: true,
      validation: 'cpf'
    },
    fiscalDoc: {
      type: 'cnpj',
      label: 'CNPJ',
      placeholder: '00000000000000',
      maxLength: 14,
      required: false,
      validation: 'cnpj'
    },
    agriculturalRegistry: {
      type: 'car',
      label: 'CAR',
      placeholder: 'Buscar pelo CAR...',
      required: true,
      useIntegration: true
    },
    propertySource: 'car',
    requiresEsg: true
  },
  AR: {
    code: 'AR',
    name: 'Argentina',
    flag: '🇦🇷',
    personalDoc: {
      type: 'dni',
      label: 'DNI',
      placeholder: '00000000',
      maxLength: 8,
      required: true,
      validation: 'numeric'
    },
    fiscalDoc: {
      type: 'cuit',
      label: 'CUIT',
      placeholder: '00-00000000-0',
      maxLength: 13,
      required: false,
      validation: 'alphanumeric'
    },
    agriculturalRegistry: {
      type: 'renspa',
      label: 'RENSPA',
      placeholder: '00.000.0.00000/00',
      required: false,
      useIntegration: false
    },
    propertySource: 'manual',
    requiresEsg: false
  },
  US: {
    code: 'US',
    name: 'Estados Unidos',
    flag: '🇺🇸',
    personalDoc: {
      type: 'ssn',
      label: 'SSN / Tax ID',
      placeholder: '000-00-0000',
      maxLength: 11,
      required: true,
      validation: 'none'
    },
    fiscalDoc: {
      type: 'ein',
      label: 'EIN',
      placeholder: '00-0000000',
      maxLength: 10,
      required: false,
      validation: 'alphanumeric'
    },
    agriculturalRegistry: {
      type: 'fsa',
      label: 'FSA Farm Number',
      placeholder: 'Farm Number',
      required: false,
      useIntegration: false
    },
    propertySource: 'manual',
    requiresEsg: false
  }
};

export type CountryCode = keyof typeof COUNTRIES;
export const DEFAULT_COUNTRY: CountryCode = 'BR';
export const COUNTRY_LIST = Object.values(COUNTRIES);

/**
 * Get country configuration by code
 */
export function getCountryConfig(code: CountryCode): CountryConfig {
  return COUNTRIES[code] || COUNTRIES.BR;
}

/**
 * Validate CPF (Brazilian individual tax ID)
 * Uses module 11 algorithm
 */
export function validateCpf(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, '');
  
  if (cleaned.length !== 11) return false;
  
  // Check for known invalid patterns
  if (/^(\d)\1+$/.test(cleaned)) return false;
  
  // Validate first check digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned[i]) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned[9])) return false;
  
  // Validate second check digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned[i]) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned[10])) return false;
  
  return true;
}

/**
 * Validate CNPJ (Brazilian company tax ID)
 * Uses module 11 algorithm
 */
export function validateCnpj(cnpj: string): boolean {
  const cleaned = cnpj.replace(/\D/g, '');
  
  if (cleaned.length !== 14) return false;
  
  // Check for known invalid patterns
  if (/^(\d)\1+$/.test(cleaned)) return false;
  
  // Validate first check digit
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleaned[i]) * weights1[i];
  }
  let remainder = sum % 11;
  const digit1 = remainder < 2 ? 0 : 11 - remainder;
  if (digit1 !== parseInt(cleaned[12])) return false;
  
  // Validate second check digit
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleaned[i]) * weights2[i];
  }
  remainder = sum % 11;
  const digit2 = remainder < 2 ? 0 : 11 - remainder;
  if (digit2 !== parseInt(cleaned[13])) return false;
  
  return true;
}

/**
 * Validate document based on type
 */
export function validateDocument(value: string, validation: DocumentConfig['validation']): boolean {
  const cleaned = value.replace(/\D/g, '');
  
  switch (validation) {
    case 'cpf':
      return validateCpf(cleaned);
    case 'cnpj':
      return validateCnpj(cleaned);
    case 'numeric':
      return /^\d+$/.test(cleaned) && cleaned.length > 0;
    case 'alphanumeric':
      return /^[a-zA-Z0-9-]+$/.test(value.replace(/\s/g, '')) && value.length > 0;
    case 'none':
      return value.length > 0;
    default:
      return true;
  }
}

/**
 * Check if country uses Brazilian CAR integration
 */
export function usesCarIntegration(countryCode: CountryCode): boolean {
  return COUNTRIES[countryCode]?.propertySource === 'car';
}

/**
 * Check if country requires ESG analysis
 */
export function requiresEsgAnalysis(countryCode: CountryCode): boolean {
  return COUNTRIES[countryCode]?.requiresEsg ?? false;
}
