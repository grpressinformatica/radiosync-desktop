import { registrarEnderecos } from './enderecos'
import type { Database } from 'sql.js'
import { destinosSobre } from '../shared/sobre'
import { ipcMain, dialog, shell } from 'electron'
import { getDb, queryAll, runSql, saveDatabase, transaction } from './database'
import { importarOuvintesCSV, exportarOuvintesCSV } from './csv'
import { realizarSorteio } from './sorteio'
import { getDashboardStats, getAniversariantesHoje, getPromocoesAtivas } from './dashboard'

function checkEnrollment(db: Database, promoId: unknown, listenerId: unknown, fromCadastro: boolean): boolean {
  const [promo] = queryAll(db, 'SELECT status, permite_multipla_participacao FROM promocoes WHERE id=?', [promoId])
  if (promo?.status !== 'ativa') throw new Error('Selecione uma promoção ativa.')
  if (listenerId != null && (fromCadastro || !promo.permite_multipla_participacao)) {
    const [existing] = queryAll(db, 'SELECT id FROM participacoes WHERE id_promocao=? AND id_ouvinte=? LIMIT 1', [promoId, listenerId])
    if (existing) {
      if (fromCadastro) return false // Saving a listener again is not another entry.
      throw new Error('Ouvinte já participa desta promoção.')
    }
  }
  return true
}

export function registerIpcHandlers(): void {
 registrarEnderecos(ipcMain)
 ipcMain.handle('sobre:abrirContato', (_e, url: unknown) => {
   if (typeof url !== 'string' || !destinosSobre.has(url)) throw new Error('Link de contato desconhecido.')
   return shell.openExternal(url)
 })
 // === Ouvintes ===
 ipcMain.handle('db:ouvintes:list', async (_e, search?: string) => {
 const db = await getDb()
 if (search && search.trim()) {
 const like = `%${search.trim()}%`
 return queryAll(db,
 `SELECT * FROM ouvintes WHERE nome LIKE ? OR telefone LIKE ? ORDER BY nome`,
 [like, like]
 )
 }
 return queryAll(db, `SELECT * FROM ouvintes ORDER BY nome`)
 })

 ipcMain.handle('db:ouvintes:save', async (_e, o: Record<string, unknown>) => {
 const db = await getDb()
 const id = transaction(db, () => {
   const fields = [o.nome, o.telefone || null, o.cpf || null, o.data_nascimento || null, o.cep || null, o.endereco || null, o.numero || null, o.bairro || null, o.cidade || null, o.uf || null]
   let listenerId = o.id
   if (listenerId != null) {
     const { changes } = runSql(db, `UPDATE ouvintes SET nome=?, telefone=?, cpf=?, data_nascimento=?, cep=?, endereco=?, numero=?, bairro=?, cidade=?, uf=? WHERE id=?`, [...fields, listenerId])
     if (!changes) throw new Error('Ouvinte não encontrado.')
   } else {
     listenerId = runSql(db, `INSERT INTO ouvintes (nome, telefone, cpf, data_nascimento, cep, endereco, numero, bairro, cidade, uf) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, fields).lastId
   }
   if (o.promoId != null && checkEnrollment(db, o.promoId, listenerId, true)) {
     runSql(db, 'INSERT INTO participacoes (id_ouvinte, id_promocao) VALUES (?, ?)', [listenerId, o.promoId])
   }
   return listenerId
 })
 saveDatabase()
 return { id }
 })

 ipcMain.handle('db:ouvintes:delete', async (_e, id: number) => {
 const db = await getDb()
 runSql(db, `DELETE FROM ouvintes WHERE id=?`, [id])
 saveDatabase()
 return true
 })

 // === Promoções ===
 ipcMain.handle('db:promocoes:list', async () => {
 const db = await getDb()
 return queryAll(db, `SELECT * FROM promocoes ORDER BY criado_em DESC`)
 })

 ipcMain.handle('db:promocoes:save', async (_e, p: Record<string, unknown>) => {
 const db = await getDb()
 if (p.id) {
 runSql(db,
 `UPDATE promocoes SET nome=?, descricao=?, parceiro=?, inicio=?, fim=?, hora_encerramento=?, qtd_ganhadores=?, status=?, mensagem_divulgacao=?, permite_multipla_participacao=? WHERE id=?`,
 [p.nome, p.descricao || null, p.parceiro || null, p.inicio, p.fim, p.hora_encerramento || null, p.qtd_ganhadores ?? 1, p.status ?? 'ativa', p.mensagem_divulgacao || null, p.permite_multipla_participacao ? 1 : 0, p.id]
 )
 saveDatabase()
 return { id: p.id }
 }
 const result = runSql(db,
 `INSERT INTO promocoes (nome, descricao, parceiro, inicio, fim, hora_encerramento, qtd_ganhadores, status, mensagem_divulgacao, permite_multipla_participacao) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
 [p.nome, p.descricao || null, p.parceiro || null, p.inicio, p.fim, p.hora_encerramento || null, p.qtd_ganhadores ?? 1, p.status ?? 'ativa', p.mensagem_divulgacao || null, p.permite_multipla_participacao ? 1 : 0]
 )
 saveDatabase()
 return { id: result.lastId }
 })

 ipcMain.handle('db:promocoes:delete', async (_e, id: number) => {
 const db = await getDb()
 runSql(db, `DELETE FROM promocoes WHERE id=?`, [id])
 saveDatabase()
 return true
 })

 // === Participações ===
 ipcMain.handle('db:participacoes:register', async (_e, data: Record<string, unknown>) => {
 const db = await getDb()
 if (data.id_promocao != null) checkEnrollment(db, data.id_promocao, data.id_ouvinte, false)
 const result = runSql(db,
 `INSERT INTO participacoes (id_ouvinte, id_promocao, musica, mensagem, nome_avulso, telefone_avulso) VALUES (?, ?, ?, ?, ?, ?)`,
 [data.id_ouvinte || null, data.id_promocao || null, data.musica || null, data.mensagem || null, data.nome_avulso || null, data.telefone_avulso || null]
 )
 saveDatabase()
 return { id: result.lastId }
 })

 ipcMain.handle('db:participacoes:list', async () => queryAll(await getDb(), `
   SELECT p.id, COALESCE(o.nome, p.nome_avulso, 'Desconhecido') AS nome, pr.nome AS promocao,
          p.musica, p.mensagem, p.data, p.lida, p.id_promocao
   FROM participacoes p LEFT JOIN ouvintes o ON o.id = p.id_ouvinte
   LEFT JOIN promocoes pr ON pr.id = p.id_promocao
   ORDER BY datetime(p.data) DESC, p.id DESC`))

 ipcMain.handle('db:participacoes:marcarLida', async (_e, id: number) => {
   const db = await getDb()
   const { changes } = runSql(db, 'UPDATE participacoes SET lida=1 WHERE id=?', [id])
   if (changes) saveDatabase()
   return changes > 0
 })

 ipcMain.handle('db:participacoes:countByPromocao', async () => {
 const db = await getDb()
 return queryAll(db,
 `SELECT id_promocao, COUNT(DISTINCT COALESCE(id_ouvinte, -id)) as total FROM participacoes GROUP BY id_promocao`
 )
 })

 ipcMain.handle('db:ganhadores:list', async () => queryAll(await getDb(), `
   SELECT g.id, COALESCE(o.nome, 'Desconhecido') AS nome, pr.nome AS promocao,
          g.data_sorteio, g.id_promocao, o.telefone
   FROM ganhadores g LEFT JOIN ouvintes o ON o.id = g.id_ouvinte
   LEFT JOIN promocoes pr ON pr.id = g.id_promocao
   ORDER BY datetime(g.data_sorteio) DESC, g.id DESC`))

 // === Sorteio ===
 ipcMain.handle('db:sorteio:realizar', async (_e, promocaoId: number, quantidade: number) => {
 const db = await getDb()
 const ganhadores = realizarSorteio(db, promocaoId, quantidade)
 saveDatabase()
 return ganhadores
 })

 // === CSV ===
 ipcMain.handle('csv:import:ouvintes', async (_e, filePath: string) => {
 const db = await getDb()
 const result = importarOuvintesCSV(db, filePath)
 saveDatabase()
 return result
 })

 ipcMain.handle('csv:export:ouvintes', async (_e, filePath: string, filter?: string) => {
 const db = await getDb()
 return exportarOuvintesCSV(db, filePath, filter)
 })

 // === File Dialogs ===
 ipcMain.handle('dialog:openFile', async (_e, filters: { name: string; extensions: string[] }[]) => {
 const result = await dialog.showOpenDialog({ properties: ['openFile'], filters })
 return result.canceled ? null : result.filePaths[0]
 })

 ipcMain.handle('dialog:saveFile', async (_e, defaultName: string) => {
 const result = await dialog.showSaveDialog({ defaultPath: defaultName, filters: [{ name: 'CSV', extensions: ['csv'] }] })
 return result.canceled ? null : result.filePath
 })

 // === Dashboard ===
 ipcMain.handle('dashboard:stats', async () => getDashboardStats(await getDb()))
 ipcMain.handle('dashboard:aniversariantes', async () => getAniversariantesHoje(await getDb()))
 ipcMain.handle('dashboard:promocoes-ativas', async () => getPromocoesAtivas(await getDb()))
}