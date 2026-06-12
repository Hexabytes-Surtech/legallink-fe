/** Shared option lists for advocate forms. */
// Canonical practice-area buckets live in one place now (lib/practice-areas).
export { PRACTICE_AREAS } from './practice-areas';

export const WB_DISTRICTS = [
  'Kolkata', 'Howrah', 'Hooghly', 'North 24 Parganas', 'South 24 Parganas',
  'Nadia', 'Murshidabad', 'Bardhaman', 'Darjeeling', 'Jalpaiguri',
  'Malda', 'Birbhum', 'Bankura', 'Purulia', 'Medinipur',
];

export const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'bn', label: 'বাংলা' },
  { value: 'hi', label: 'हिन्दी' },
];

export const COMMON_COURTS = [

  // District Level
  'District Court',
  'Sessions Court',
  'City Civil Court',        // Kolkata-specific

  // Subordinate Civil
  'Civil Judge Court',
  'Small Causes Court',      // Kolkata-specific

  // Subordinate Criminal
  'Magistrate Court',

  // Specialized
  'Family Court',
  'Labour Court',
  'Fast Track Court',

  // Consumer
  'Consumer Disputes Redressal Commission',

  // Tribunals
  'Administrative Tribunal',
  'Motor Accident Claims Tribunal',
];

export const BIO_MAX = 300;

/** This platform serves West Bengal only — the State Bar Council is fixed for everyone. */
export const STATE_BAR_COUNCIL = 'West Bengal';
