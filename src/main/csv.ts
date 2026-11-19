import type { Database } from 'sql.js'
import Papa from 'papaparse'
import { readFileSync, writeFileSync } from 'fs'
import { queryAll, runSql } from './database'

export function importarOuvintesCSV(
 db: Database,
 filePath: string
): { imported: number; updated: number; errors: string[] } {
 const raw = readFileSync(filePath, 'utf-8')
 const parsed = Papa.parse(raw, { header: true, skipEmptyLines: true })

 let imported = 0
 let updated = 0
 const errors: string[] = []

 for (let i = 0; i < parsed.data.length; i++) {
 const row = parsed.data[i] as Record<string, string>
 const nome = (row['Nome'] || '').trim()
 if (!nome) {
 errors.push(`Linha ${i + 2}: nome vazio`)
 continue
 }

 const telefone = (row['Telefone'] || '').trim() || null
 const cpf = (row['CPF'] || '').trim() || null
 const data_nascimento = (row['Nascimento'] || '').trim() || null
 const cidade = (row['Cidade'] || '').trim() || null
 const uf = (row['UF'] || '').trim() || null

 try {
 if (telefone) {
 const existing = queryAll(db, 'SELECT id FROM ouvintes WHERE telefone = ?', [telefone])
 if (existing.length > 0) {
 runSql(db,
 `UPDATE ouvintes SET nome=?, cpf=COALESCE(?,cpf), data_nascimento=COALESCE(?,data_nascimento), cidade=COALESCE(?,cidade), uf=COALESCE(?,uf) WHERE telefone=?`,
 [nome, cpf, data_nascimento, cidade, uf, telefone]
 )
 updated++
 } else {
 runSql(db,
 `INSERT INTO ouvintes (nome, telefone, cpf, data_nascimento, cidade, uf) VALUES (?, ?, ?, ?, ?, ?)`,
 [nome, telefone, cpf, data_nascimento, cidade, uf]
 )
 imported++
 }
 } else {
 runSql(db,
 `INSERT INTO ouvintes (nome, telefone, cpf, data_nascimento, cidade, uf) VALUES (?, ?, ?, ?, ?, ?)`,
 [nome, null, cpf, data_nascimento, cidade, uf]
 )
 imported++
 }
 } catch (err) {
 errors.push(`Linha ${i + 2}: ${(err as Error).message}`)
 }
 }

 return { imported, updated, errors }
}

export function exportarOuvintesCSV(
 db: Database,
 filePath: string,
 filter?: string
): { count: number } {
 let rows: Record<string, unknown>[]
 if (filter && filter.trim()) {
 const like = `%${filter.trim()}%`
 rows = queryAll(db,
 `SELECT nome AS Nome, telefone AS Telefone, cpf AS CPF, data_nascimento AS Nascimento, cidade AS Cidade, uf AS UF FROM ouvintes WHERE nome LIKE ? OR telefone LIKE ? ORDER BY nome`,
 [like, like]
 )
 } else {
 rows = queryAll(db,
 `SELECT nome AS Nome, telefone AS Telefone, cpf AS CPF, data_nascimento AS Nascimento, cidade AS Cidade, uf AS UF FROM ouvintes ORDER BY nome`
 )
 }

 const csv = Papa.unparse(rows)
 writeFileSync(filePath, '﻿' + csv, 'utf-8') // BOM for Excel compatibility
 return { count: rows.length }
}