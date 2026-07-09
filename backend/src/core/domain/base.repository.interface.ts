/**
 * Generic repository contract (Repository Pattern).
 * Domain and application layers depend on this abstraction, never on a
 * concrete persistence technology. Infrastructure layer provides the
 * Mongoose-backed implementation per module.
 */
export interface IBaseRepository<TEntity, TId = string> {
  findById(id: TId, tenantId: string): Promise<TEntity | null>;
  findAll(tenantId: string): Promise<TEntity[]>;
  create(entity: TEntity): Promise<TEntity>;
  update(id: TId, entity: Partial<TEntity>, tenantId: string): Promise<TEntity | null>;
  delete(id: TId, tenantId: string): Promise<boolean>;
}
