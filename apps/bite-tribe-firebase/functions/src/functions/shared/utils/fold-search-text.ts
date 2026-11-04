const HIRAGANA = /[ぁ-ゖゝゞ]/g;
const HIRAGANA_TO_KATAKANA_OFFSET = 0x60;

const toKatakana = (hiragana: string): string =>
  String.fromCharCode(hiragana.charCodeAt(0) + HIRAGANA_TO_KATAKANA_OFFSET);

/**
 * The form the text searches compare, so that spellings a person treats as the
 * same word match: `ﾗｰﾒﾝ`, `ラーメン` and `らーめん` fold to one value, as do
 * `ＰＩＺＺＡ` and `pizza`.
 *
 * NFKC folds half-width and full-width forms, the case mapping folds Latin case,
 * and the kana step folds hiragana onto katakana. Apply it to the query and to
 * the stored value alike. Kanji spellings stay distinct: `拉麺` does not match
 * `ラーメン`, because that takes a dictionary rather than a character mapping.
 */
export const foldSearchText = (value: string): string =>
  value.normalize('NFKC').toLocaleLowerCase().replace(HIRAGANA, toKatakana);
