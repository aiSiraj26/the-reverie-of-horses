/**
 * Shared test fixtures — the canonical horse list and the Pioneer Soulmate
 * poem stanzas. Specs import from here so the same data isn't duplicated
 * across files.
 */

export const HORSES = [
  { id: 'buraq',           name: 'Buraq',           civilisation: 'Islamic' },
  { id: 'pegasus',         name: 'Pegasus',         civilisation: 'Greek' },
  { id: 'sleipnir',        name: 'Sleipnir',        civilisation: 'Norse' },
  { id: 'uchchaihshravas', name: 'Uchchaiḥśravas',  civilisation: 'Hindu' },
  { id: 'kanthaka',        name: 'Kanthaka',        civilisation: 'Buddhist' },
  { id: 'tianma',          name: 'Tiānmǎ',          civilisation: 'Chinese' },
  { id: 'chollima',        name: 'Chollima',        civilisation: 'Korean' },
  { id: 'tulpar',          name: 'Tulpar',          civilisation: 'Turkic' },
  { id: 'rakhsh',          name: 'Rakhsh',          civilisation: 'Persian' },
  { id: 'enbarr',          name: 'Enbarr',          civilisation: 'Celtic' },
  { id: 'caspian-mare',    name: 'The Caspian Mare', civilisation: 'Persian' },
  { id: 'kiso-steed',      name: 'The Kiso Steed',   civilisation: 'Japanese' },
] as const;

export type Horse = (typeof HORSES)[number];

export const POEM_STANZAS = [
  { opening: 'We venture', lines: ['into the unknown',  'and befriend',  'the newness',     'of our tomorrow.'] },
  { opening: 'We look',    lines: ['into the mirror',   'and find',      'the future',      'of our reflection.'] },
  { opening: 'We seek',    lines: ['only the truth',    'and embrace',   'the ugliness',    'of our humanity.'] },
  { opening: 'We thrive',  lines: ['in the chaos',      'and celebrate', 'the beauty',      'of our quandary.'] },
  { opening: 'We look',    lines: ['into the dark',     'and sense',     'the destination', 'of our soul.'] },
  { opening: 'We dive',    lines: ['into the deep',     'and discover',  'the beginning',   'of our ignorance.'] },
] as const;
