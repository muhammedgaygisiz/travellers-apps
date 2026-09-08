/**
 * Minimal in-memory stand-in for the Firestore admin API.
 *
 * It covers exactly the surface the callables under test use — document
 * get/set/update/delete, `getAll`, `==`/`in`/`array-contains` collection and
 * collection-group queries, subcollections, dotted field paths and batched
 * writes — so they can be tested against real document state instead of a wall
 * of call assertions.
 */

export const DELETE_SENTINEL = { __fakeFirestoreDelete: true } as const;

/**
 * Stands in for `FieldValue.arrayRemove`, which is a server-side operation
 * rather than a value: the callable sends the instruction and never reads the
 * array, so a fake that stored the sentinel verbatim would report the field as
 * the sentinel instead of the array with one entry gone.
 */
export const arrayRemove = (...values: unknown[]): unknown => ({
  __fakeFirestoreArrayRemove: values,
});

type DocData = Record<string, unknown>;

const isDeleteSentinel = (value: unknown): boolean => value === DELETE_SENTINEL;

const arrayRemoveValues = (value: unknown): unknown[] | undefined => {
  const removal = (value as { __fakeFirestoreArrayRemove?: unknown[] })
    ?.__fakeFirestoreArrayRemove;

  return Array.isArray(removal) ? removal : undefined;
};

/**
 * Writes one field, resolving `a.b` against nested objects the way Firestore's
 * dotted field paths do. `update({ 'evidence.biteCount': 3 })` has to leave the
 * rest of `evidence` alone rather than replacing the object with one key.
 */
const writeField = (target: DocData, path: string, value: unknown): void => {
  const segments = path.split('.');
  const last = segments.pop() as string;
  const parent = segments.reduce<DocData>((node, segment) => {
    const child = node[segment];
    const next: DocData =
      typeof child === 'object' && child !== null && !Array.isArray(child)
        ? { ...(child as DocData) }
        : {};

    node[segment] = next;

    return next;
  }, target);

  const removal = arrayRemoveValues(value);

  if (removal) {
    const current = parent[last];

    parent[last] = (Array.isArray(current) ? current : []).filter(
      (entry) => !removal.includes(entry),
    );

    return;
  }

  parent[last] = value;
};

const applyData = (target: DocData, data: DocData): DocData => {
  const next = { ...target };

  Object.entries(data).forEach(([key, value]) => {
    if (isDeleteSentinel(value)) {
      delete next[key];

      return;
    }

    writeField(next, key, value);
  });

  return next;
};

interface Filter {
  field: string;
  operator: string;
  value: unknown;
}

const matchesFilter = (data: DocData, filter: Filter): boolean => {
  const stored = data[filter.field];

  switch (filter.operator) {
    case 'in':
      return (
        Array.isArray(filter.value) &&
        (filter.value as unknown[]).includes(stored)
      );
    case 'array-contains':
      return Array.isArray(stored) && stored.includes(filter.value);
    default:
      return stored === filter.value;
  }
};

interface DocumentSnapshot {
  exists: boolean;
  id: string;
  ref: FakeDocumentReference;
  data: () => DocData | undefined;
}

class FakeDocumentReference {
  constructor(
    private readonly store: Map<string, DocData>,
    readonly path: string,
  ) {}

  get id(): string {
    return this.path.split('/').pop() as string;
  }

  get ref(): FakeDocumentReference {
    return this;
  }

  collection(name: string): FakeCollectionReference {
    return new FakeCollectionReference(this.store, `${this.path}/${name}`);
  }

  async get(): Promise<DocumentSnapshot> {
    const data = this.store.get(this.path);

    return {
      exists: data !== undefined,
      id: this.id,
      ref: this,
      data: () => (data === undefined ? undefined : { ...data }),
    };
  }

  async set(data: DocData, options?: { merge?: boolean }): Promise<void> {
    const base = options?.merge ? (this.store.get(this.path) ?? {}) : {};

    this.store.set(this.path, applyData(base, data));
  }

  async update(data: DocData): Promise<void> {
    this.store.set(this.path, applyData(this.store.get(this.path) ?? {}, data));
  }

  async delete(): Promise<void> {
    this.store.delete(this.path);
  }
}

class FakeQuery {
  constructor(
    private readonly store: Map<string, DocData>,
    private readonly matchesPath: (path: string) => boolean,
    private readonly filters: Filter[] = [],
    private readonly limitCount?: number,
  ) {}

  where(field: string, operator: string, value: unknown): FakeQuery {
    return new FakeQuery(
      this.store,
      this.matchesPath,
      [...this.filters, { field, operator, value }],
      this.limitCount,
    );
  }

  limit(count: number): FakeQuery {
    return new FakeQuery(this.store, this.matchesPath, this.filters, count);
  }

  async get(): Promise<{
    empty: boolean;
    size: number;
    docs: {
      id: string;
      ref: FakeDocumentReference;
      data: () => DocData;
    }[];
  }> {
    const matched = [...this.store.entries()]
      .filter(([path]) => this.matchesPath(path))
      .filter(([, data]) =>
        this.filters.every((filter) => matchesFilter(data, filter)),
      )
      .map(([path, data]) => ({
        id: path.split('/').pop() as string,
        ref: new FakeDocumentReference(this.store, path),
        data: (): DocData => ({ ...data }),
      }));

    const docs =
      this.limitCount === undefined
        ? matched
        : matched.slice(0, this.limitCount);

    return { empty: docs.length === 0, size: docs.length, docs };
  }
}

class FakeCollectionReference extends FakeQuery {
  constructor(
    private readonly documents: Map<string, DocData>,
    private readonly collectionPath: string,
  ) {
    super(documents, (path) => {
      const parent = path.split('/').slice(0, -1).join('/');

      return parent === collectionPath;
    });
  }

  doc(id: string): FakeDocumentReference {
    return new FakeDocumentReference(
      this.documents,
      `${this.collectionPath}/${id}`,
    );
  }
}

interface BatchOperation {
  run: () => void;
}

class FakeWriteBatch {
  private readonly operations: BatchOperation[] = [];

  constructor(private readonly store: Map<string, DocData>) {}

  set(
    ref: FakeDocumentReference,
    data: DocData,
    options?: { merge?: boolean },
  ): FakeWriteBatch {
    this.operations.push({
      run: () => {
        const base = options?.merge ? (this.store.get(ref.path) ?? {}) : {};

        this.store.set(ref.path, applyData(base, data));
      },
    });

    return this;
  }

  update(ref: FakeDocumentReference, data: DocData): FakeWriteBatch {
    this.operations.push({
      run: () => {
        this.store.set(
          ref.path,
          applyData(this.store.get(ref.path) ?? {}, data),
        );
      },
    });

    return this;
  }

  delete(ref: FakeDocumentReference): FakeWriteBatch {
    this.operations.push({ run: () => this.store.delete(ref.path) });

    return this;
  }

  async commit(): Promise<void> {
    this.operations.forEach((operation) => operation.run());
    this.operations.length = 0;
  }
}

export interface FakeFirestore {
  collection(name: string): FakeCollectionReference;
  doc(path: string): FakeDocumentReference;
  getAll(...refs: FakeDocumentReference[]): Promise<DocumentSnapshot[]>;
  collectionGroup(name: string): FakeQuery;
  batch(): FakeWriteBatch;
  seed(path: string, data: DocData): void;
  read(path: string): DocData | undefined;
  exists(path: string): boolean;
}

export const createFakeFirestore = (): FakeFirestore => {
  const store = new Map<string, DocData>();

  return {
    collection: (name) => new FakeCollectionReference(store, name),
    doc: (path) => new FakeDocumentReference(store, path),
    // Firestore's `getAll` rejects an empty argument list; the callers under
    // test guard for that, and the fake mirrors the batched-read shape rather
    // than the rejection.
    getAll: (...refs) => Promise.all(refs.map((ref) => ref.get())),
    collectionGroup: (name) =>
      new FakeQuery(store, (path) => {
        const segments = path.split('/');

        return segments.length > 2 && segments[segments.length - 2] === name;
      }),
    batch: () => new FakeWriteBatch(store),
    seed: (path, data) => store.set(path, { ...data }),
    read: (path): DocData | undefined => {
      const data = store.get(path);

      return data === undefined ? undefined : { ...data };
    },
    exists: (path) => store.has(path),
  };
};
