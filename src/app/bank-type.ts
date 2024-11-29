export type BankType = typeof BankType[keyof typeof BankType]
export const BankType = {
  'cba_au': 'cba_au',
  'ing_au': 'ing_au',
  'anz_au': 'anz_au',
  'kiwi_nz': 'kiw_nz',
} as const

export type BankLabel = typeof BankLabel[keyof typeof BankLabel]
export const BankLabel = {
  [BankType.cba_au]: 'Commonwealth Bank of Australia',
  [BankType.ing_au]: 'ING Australia',
  [BankType.anz_au]: 'ANZ Australia (Coming soon)',
  [BankType.kiwi_nz]: 'KiwiBank New Zealand (Coming soon)',
} as const
