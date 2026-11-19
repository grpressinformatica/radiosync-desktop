import initSqlJs, { type Database } from 'sql.js'
import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, renameSync, rmSync } from 'fs'

let db: Database | null = null

export async function getDb(): Promise<Database> {
  if (!db) throw new Error('Database not initialized')
  return db
}

export function saveDatabase(): void {
  if (!db) return
  const dbPath = join(app.getPath('userData'), 'radiosync.db')
  const tempPath = `${dbPath}.${process.pid}.tmp`
  try {
    const data = db.export()
    // export closes and reopens the sql.js connection, resetting its PRAGMAs.
    db.run('PRAGMA foreign_keys = ON')
    writeFileSync(tempPath, data, { flush: true })
    renameSync(tempPath, dbPath)
  } catch (error) {
    // Do not allow an unpersisted change to leak into a later successful save.
    db.close()
    db = null
    rmSync(tempPath, { force: true })
    throw error
  }
}

export async function initDatabase(): Promise<void> {
  const SQL = await initSqlJs()
  const dbPath = join(app.getPath('userData'), 'radiosync.db')

  if (existsSync(dbPath)) {
    const buffer = readFileSync(dbPath)
    db = new SQL.Database(buffer)
  } else {
    db = new SQL.Database()
  }

  db.run('PRAGMA foreign_keys = ON')

  db.run(`
    CREATE TABLE IF NOT EXISTS ouvintes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      telefone TEXT UNIQUE,
      cpf TEXT,
      data_nascimento TEXT,
      cep TEXT,
      endereco TEXT,
      numero TEXT,
      bairro TEXT,
      cidade TEXT,
      uf TEXT,
      criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS promocoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      descricao TEXT,
      parceiro TEXT,
      inicio TEXT NOT NULL,
      fim TEXT NOT NULL,
      hora_encerramento TEXT,
      qtd_ganhadores INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'ativa',
      mensagem_divulgacao TEXT,
      permite_multipla_participacao INTEGER NOT NULL DEFAULT 0,
      criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS participacoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_ouvinte INTEGER REFERENCES ouvintes(id),
      id_promocao INTEGER REFERENCES promocoes(id),
      musica TEXT,
      mensagem TEXT,
      data TEXT NOT NULL DEFAULT (datetime('now')),
      nome_avulso TEXT,
      telefone_avulso TEXT
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS ganhadores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_ouvinte INTEGER NOT NULL REFERENCES ouvintes(id),
      id_promocao INTEGER NOT NULL REFERENCES promocoes(id),
      data_sorteio TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  if (!queryAll(db, 'PRAGMA table_info(participacoes)').some(column => column.name === 'lida')) {
    db.run('ALTER TABLE participacoes ADD COLUMN lida INTEGER NOT NULL DEFAULT 0')
  }

  db.run(`CREATE INDEX IF NOT EXISTS idx_participacoes_promocao ON participacoes(id_promocao)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_ganhadores_data ON ganhadores(data_sorteio)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_ouvintes_nome ON ouvintes(nome)`)

  saveDatabase()
}

// Helper: run a SELECT and return array of objects
export function queryAll(db: Database, sql: string, params: unknown[] = []): Record<string, unknown>[] {
  const stmt = db.prepare(sql)
  stmt.bind(params as never[])
  const results: Record<string, unknown>[] = []
  while (stmt.step()) {
    results.push(stmt.getAsObject())
  }
  stmt.free()
  return results
}

// Helper: run INSERT/UPDATE/DELETE and return changes info
export function runSql(db: Database, sql: string, params: unknown[] = []): { lastId: number; changes: number } {
  db.run(sql, params as never[])
  const lastId = (db.exec('SELECT last_insert_rowid() as id')[0]?.values[0]?.[0] as number) ?? 0
  const changes = db.getRowsModified()
  return { lastId, changes }
}

// All work must be synchronous; export only after the commit succeeds.
export function transaction<T>(db: Database, work: () => T): T {
  db.run('BEGIN')
  try {
    const result = work()
    db.run('COMMIT')
    return result
  } catch (error) {
    db.run('ROLLBACK')
    throw error
  }
}
