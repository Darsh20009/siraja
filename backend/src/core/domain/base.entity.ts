/**
 * Base domain entity.
 * Framework-agnostic — must never import from Nest, Mongoose, or Express.
 * Identity-based equality, as per DDD Entity semantics.
 */
export abstract class BaseEntity<Id = string> {
  protected readonly _id: Id;

  protected constructor(id: Id) {
    this._id = id;
  }

  get id(): Id {
    return this._id;
  }

  equals(other?: BaseEntity<Id>): boolean {
    if (!other) return false;
    return this._id === other._id;
  }
}
