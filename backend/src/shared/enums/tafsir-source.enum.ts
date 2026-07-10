/**
 * Curated set of Tafsir (exegesis) sources supported at launch. New
 * sources are additive — extend this enum, no migration needed since
 * `Tafsir.source` is just a string field with this enum for validation.
 */
export enum TafsirSource {
  IBN_KATHIR = 'ibn_kathir',
  TABARI = 'tabari',
  SAADI = 'saadi',
  QURTUBI = 'qurtubi',
  MUYASSAR = 'muyassar',
}
