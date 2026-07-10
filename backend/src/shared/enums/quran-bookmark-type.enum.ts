/**
 * A `QuranBookmark` is either a plain saved position (`BOOKMARK`) or a
 * favorited Ayah (`FAVORITE`) — kept as one collection with a type flag
 * rather than two, since both are "a user-curated pointer to an Ayah"
 * with identical shape. "Last Read Position" is intentionally NOT a
 * bookmark type — it is a single, auto-tracked-per-user record, modeled
 * separately by `QuranLastRead` (upserted on every read, not user-curated).
 */
export enum QuranBookmarkType {
  BOOKMARK = 'bookmark',
  FAVORITE = 'favorite',
}
