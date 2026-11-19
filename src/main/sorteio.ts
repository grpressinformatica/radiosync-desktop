import type { Database } from 'sql.js'
import { queryAll, runSql, transaction } from './database'

interface Ganhador {
 id: number
 nome: string
 telefone: string | null
 cpf: string | null
 data_nascimento: string | null
 cep: string | null
 endereco: string | null
 numero: string | null
 bairro: string | null
 cidade: string | null
 uf: string | null
}

export function realizarSorteio(
 db: Database,
 promocaoId: number,
 quantidade: number
): Ganhador[] {
 if (!Number.isSafeInteger(quantidade) || quantidade < 1) throw new Error('Quantidade inválida.')

 const elegiveis = queryAll(db, `
 SELECT DISTINCT o.id, o.nome, o.telefone, o.cpf, o.data_nascimento,
 o.cep, o.endereco, o.numero, o.bairro, o.cidade, o.uf
 FROM ouvintes o
 INNER JOIN participacoes p ON p.id_ouvinte = o.id
 WHERE p.id_promocao = ?
 AND o.id NOT IN (
 SELECT g.id_ouvinte FROM ganhadores g
 WHERE julianday(g.data_sorteio) > julianday('now', '-90 days')
 )
 `, [promocaoId]) as unknown as Ganhador[]

 if (elegiveis.length === 0) return []

 // Fisher-Yates shuffle (uniform random)
 for (let i = elegiveis.length - 1; i > 0; i--) {
 const j = Math.floor(Math.random() * (i + 1));
 [elegiveis[i], elegiveis[j]] = [elegiveis[j], elegiveis[i]]
 }

 const ganhadores = elegiveis.slice(0, quantidade)

 transaction(db, () => {
   for (const g of ganhadores) {
     runSql(db, `INSERT INTO ganhadores (id_ouvinte, id_promocao) VALUES (?, ?)`, [g.id, promocaoId])
   }
 })

 return ganhadores
}