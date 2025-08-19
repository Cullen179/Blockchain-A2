export interface IRepository<T, K = string> {
  findById(id: K): Promise<T | null>;
  findAll(): Promise<T[]>;
  create(entity: T): Promise<T>;
  update(id: K, entity: Partial<T>): Promise<T | null>;
  delete(id: K): Promise<boolean>;
  exists(id: K): Promise<boolean>;
}

export interface ISearchableRepository<T, K = string> extends IRepository<T, K> {
  findBy(criteria: Partial<T>): Promise<T[]>;
  count(criteria?: Partial<T>): Promise<number>;
}
