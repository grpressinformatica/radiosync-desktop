import type { Database } from 'sql.js'
import { queryAll } from './database'

export type DashboardStats = {
 ouvintes: number
 promocoes: number
 pendentes: number
 ganhadores: number
}

export type Aniversariante = { nome: string; telefone: string | null }

export type PromocaoAtiva = { nome: string; dias: number }

export function getDashboardStats(db: Database): DashboardStats {
 const [ouv] = queryAll(db, 'SELECT COUNT(*) as c FROM ouvintes')
 const [promo] = queryAll(db, "SELECT COUNT(*) as c FROM promocoes WHERE status='ativa'")
 const [pend] = queryAll(db, "SELECT COUNT(*) as c FROM participacoes WHERE lida=0")
 const [ganh] = queryAll(db, 'SELECT COUNT(*) as c FROM ganhadores')
 return {
 ouvintes: Number((ouv as Record<string, unknown>)?.c ?? 0),
 promocoes: Number((promo as Record<string, unknown>)?.c ?? 0),
 pendentes: Number((pend as Record<string, unknown>)?.c ?? 0),
 ganhadores: Number((ganh as Record<string, unknown>)?.c ?? 0),
 }
}

export function getAniversariantesHoje(db: Database): Aniversariante[] {
 const hoje = new Date()
 const mmdd = `${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`
 return queryAll(db,
 "SELECT nome, telefone FROM ouvintes WHERE data_nascimento IS NOT NULL AND substr(data_nascimento,6,5)=?",
 [mmdd]
 ).map(r => ({ nome: String(r.nome), telefone: (r.telefone as string) ?? null }))
}

export function getPromocoesAtivas(db: Database): PromocaoAtiva[] {
 const hoje = new Date()
 hoje.setHours(0, 0, 0, 0)
 const rows = queryAll(db,
 "SELECT nome, fim FROM promocoes WHERE status='ativa' AND fim >= date('now') ORDER BY fim ASC LIMIT 5"
 )
 return rows.map(r => {
 const fim = new Date(String(r.fim) + 'T12:00:00')
 const dias = Math.max(0, Math.ceil((fim.getTime() - hoje.getTime()) / 86400000))
 return { nome: String(r.nome), dias }
 })
}