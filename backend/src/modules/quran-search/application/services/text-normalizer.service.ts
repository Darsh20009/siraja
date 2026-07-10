import { Injectable } from '@nestjs/common';

/**
 * Strips Arabic diacritics ("tashkeel") and normalizes Alef/Yaa/Taa
 * Marbuta variants so both indexing and querying compare the same
 * simplified form. Without this, a MongoDB text index tokenizes on
 * whitespace only and a query typed without full diacritics (the
 * overwhelming majority of real user input) would never match text
 * stored with diacritics.
 */
@Injectable()
export class TextNormalizerService {
  normalizeArabic(input: string): string {
    return input
      .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '') // tashkeel/diacritics
      .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627') // Alef variants -> ا
      .replace(/\u0629/g, '\u0647') // Taa Marbuta -> Haa
      .replace(/\u0649/g, '\u064A') // Alef Maqsura -> Yaa
      .replace(/\u0640/g, '') // Tatweel
      .trim();
  }
}
