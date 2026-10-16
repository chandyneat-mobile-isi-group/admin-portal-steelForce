/**
 * Contract-neutral pagination input. The concrete backend adapter decides
 * whether it sends page/pageSize or cursor/limit; UI code depends only on this
 * stable shape.
 */
export interface ListQuery {
  page?: number;
  pageSize?: number;
  cursor?: string;
  limit?: number;
  search?: string;
  sort?: string;
  filters?: Readonly<Record<string, string | number | boolean | undefined>>;
}

export interface PageResult<T> {
  items: T[];
  total?: number;
  nextCursor?: string | null;
}

export interface ReadRepository<T, TListQuery extends ListQuery = ListQuery> {
  list(query?: TListQuery, signal?: AbortSignal): Promise<PageResult<T>>;
  getById(id: string, signal?: AbortSignal): Promise<T | null>;
}

export interface CrudRepository<T, TCreate, TUpdate, TListQuery extends ListQuery = ListQuery>
  extends ReadRepository<T, TListQuery> {
  create(input: TCreate, signal?: AbortSignal): Promise<T>;
  update(id: string, input: TUpdate, signal?: AbortSignal): Promise<T>;
  delete(id: string, signal?: AbortSignal): Promise<void>;
}
