/**
 * In-memory fake Prisma client for CafeOS service unit/e2e tests.
 *
 * CustomerService/AiStationService DB profilini sokar (findMany/findFirst/
 * count/create/createMany/update/upsert/deleteMany), nested `{ create: [...] }`
 * ilişki yazımını ve `include` (items/orders) çözümlerini destekler.
 * Gerçek PostgreSQL kullanmadan servis mantığını doğrulamak içindir.
 */
// @ts-nocheck
export type AnyRow = Record<string, any>;

function opMatch(value: any, cond: Record<string, any>): boolean {
  for (const [op, exp] of Object.entries(cond)) {
    if (op === 'equals') { if (value !== exp) return false; }
    else if (op === 'in') { if (!(Array.isArray(exp) && exp.includes(value))) return false; }
    else if (op === 'not') { if (value === exp) return false; }
    else if (op === 'gt') { if (!(value > exp)) return false; }
    else if (op === 'gte') { if (!(value >= exp)) return false; }
    else if (op === 'lt') { if (!(value < exp)) return false; }
    else if (op === 'lte') { if (!(value <= exp)) return false; }
    else return true; // bilinmeyen op → eşitlik varsayma
  }
  return true;
}

function matches(row: AnyRow, where?: AnyRow): boolean {
  if (!where) return true;
  for (const [key, cond] of Object.entries(where)) {
    if (cond && typeof cond === 'object' && !Array.isArray(cond) && !(cond instanceof Date)) {
      const keys = Object.keys(cond);
      const isOp = keys.every((k) => ['equals', 'in', 'not', 'gt', 'gte', 'lt', 'lte'].includes(k));
      if (isOp) { if (!opMatch(row[key], cond)) return false; continue; }
      for (const [inner, v] of Object.entries(cond)) { if (row[inner] !== v) return false; }
      continue;
    }
    if (row[key] !== cond) return false;
  }
  return true;
}

let seq = 1;
const freshId = (ctx: string) => `fake-${ctx}-${seq++}`;

interface RelationDef {
  coll: FakeColl;
  fk: string;
}
/** include anahtarı → hangi coll + FK (test kapsamındaki ilişkiler). */
let RELATIONS: Record<string, RelationDef> = {};

export class FakeColl {
  rows: AnyRow[] = [];

  constructor(public name: string) {}

  private _rel(key: string): RelationDef | undefined {
    return RELATIONS[key];
  }

  /** include kümesini satıra uygula: { items: true }, { orders: { include: {...} } } */
  private _applyInclude(row: AnyRow, include?: any): AnyRow {
    if (!include) return row;
    for (const [key, sub] of Object.entries(include)) {
      const rel = this._rel(key);
      if (!rel) continue;
      const children = rel.coll.rows.filter((r) => r[rel.fk] === row.id);
      row[key] = sub && typeof sub === 'object' && sub.include
        ? children.map((c) => rel.coll._applyInclude(c, sub.include))
        : children;
    }
    return row;
  }

  private _writeNested(row: AnyRow, data: AnyRow): void {
    for (const [key, val] of Object.entries(data)) {
      if (val && typeof val === 'object' && !Array.isArray(val) && Array.isArray(val.create)) {
        const rel = this._rel(key);
        const created: AnyRow[] = [];
        for (const childData of val.create) {
          const child: AnyRow = { ...childData };
          if (!child.id) child.id = freshId(rel ? rel.coll.name : key);
          if (rel) {
            child[rel.fk] = row.id;
            rel.coll._writeNested(child, childData);
            rel.coll.rows.push(child);
          }
          created.push(child);
        }
        row[key] = created;
      }
    }
  }

  findMany(opts: { where?: AnyRow; include?: any; orderBy?: any; take?: number } = {}): AnyRow[] {
    let rows = this.rows.filter((r) => matches(r, opts.where));
    if (opts.orderBy) {
      const entries: Array<[string, string]> = Array.isArray(opts.orderBy)
        ? opts.orderBy.map((o) => Object.entries(o)[0] as [string, string])
        : [Object.entries(opts.orderBy)[0] as [string, string]];
      rows = [...rows].sort((a, b) => {
        for (const [k, dir] of entries) {
          const av = a[k]?.getTime?.() ?? a[k];
          const bv = b[k]?.getTime?.() ?? b[k];
          if (av < bv) return dir === 'asc' ? -1 : 1;
          if (av > bv) return dir === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    if (opts.take != null) rows = rows.slice(0, opts.take);
    return opts.include ? rows.map((r) => this._applyInclude({ ...r }, opts.include)) : rows;
  }

  findFirst(opts: { where?: AnyRow; include?: any; orderBy?: any } = {}): AnyRow | null {
    const rows = this.findMany(opts);
    return rows[0] ?? null;
  }

  findUnique(opts: { where: AnyRow; include?: any }): AnyRow | null {
    return this.findFirst({ where: opts.where, include: opts.include });
  }

  count(opts: { where?: AnyRow } = {}): number {
    return this.rows.filter((r) => matches(r, opts.where)).length;
  }

  create(opts: { data: AnyRow; include?: any }): AnyRow {
    const row: AnyRow = { ...opts.data };
    if (!row.id) row.id = freshId(this.name);
    // Prisma @default(now()) / @updatedAt semantiği
    if (row.createdAt == null) row.createdAt = new Date();
    if (row.createdAt instanceof Date === false) row.createdAt = new Date(row.createdAt);
    if (row.updatedAt == null) row.updatedAt = new Date();
    this._writeNested(row, opts.data);
    this.rows.push(row);
    return this._applyInclude(row, opts.include);
  }

  createMany(opts: { data: AnyRow[]; skipDuplicates?: boolean }): { count: number } {
    let n = 0;
    for (const d of opts.data) {
      if (!d.id) d.id = freshId(this.name);
      if (opts.skipDuplicates && this.rows.some((r) => r.id === d.id)) continue;
      this.rows.push({ ...d });
      n++;
    }
    return { count: n };
  }

  update(opts: { where: AnyRow; data: AnyRow; include?: any }): AnyRow {
    const row = this.rows.find((r) => matches(r, opts.where));
    if (!row) throw new Error(`${this.name}.update: satır bulunamadı`);
    Object.assign(row, opts.data);
    row.updatedAt = new Date();
    this._writeNested(row, opts.data);
    return this._applyInclude(row, opts.include);
  }

  upsert(opts: { where: AnyRow; create: AnyRow; update: AnyRow; include?: any }): AnyRow {
    const existing = this.rows.find((r) => matches(r, opts.where));
    if (existing) return this.update({ where: opts.where, data: opts.update });
    return this.create({ data: opts.create });
  }

  deleteMany(opts: { where?: AnyRow } = {}): { count: number } {
    const before = this.rows.length;
    this.rows = this.rows.filter((r) => !matches(r, opts.where));
    return { count: before - this.rows.length };
  }
}

/** tüm modellerin coll'larını üreten kök fake Prisma. */
export function createFakePrisma() {
  const db: any = {
    cafeTable: new FakeColl('cafeTable'),
    cafeMenuItem: new FakeColl('cafeMenuItem'),
    cafeInventory: new FakeColl('cafeInventory'),
    order: new FakeColl('order'),
    orderItem: new FakeColl('orderItem'),
    dayShift: new FakeColl('dayShift'),
    tableAccount: new FakeColl('tableAccount'),
    lead: new FakeColl('lead'),
  };
  RELATIONS = {
    items: { coll: db.orderItem, fk: 'orderId' },
    orders: { coll: db.order, fk: 'accountId' },
  };
  return db;
}