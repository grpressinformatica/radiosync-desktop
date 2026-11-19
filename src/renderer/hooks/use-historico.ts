import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export type Participacao = {
  id: number; nome: string; promocao: string | null; musica: string | null;
  mensagem: string | null; data: string; lida: number; id_promocao: number | null
}
type Ganhador = { id: number; nome: string; promocao: string; data_sorteio: string; id_promocao: number; telefone: string | null }
const api = (window as unknown as { api: {
  participacoesList(): Promise<Participacao[]>
  participacaoMarcarLida(id: number): Promise<unknown>
  ganhadoresList(): Promise<Ganhador[]>
} }).api

export const participacoesKey = ['participacoes'] as const
export const ganhadoresKey = ['ganhadores'] as const

// SQLite's datetime('now') returns UTC without an offset.
function timestamp(value: string) {
  return new Date(/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(value) ? value.replace(' ', 'T') + 'Z' : value)
}
const formato = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
export function dataHora(value: string) {
  const d = timestamp(value)
  return Number.isNaN(d.getTime()) ? 'Data não disponível' : formato.format(d)
}
function recentes<T extends { id: number }>(rows: T[], date: (row: T) => string) {
  return rows.sort((a, b) => timestamp(date(b)).getTime() - timestamp(date(a)).getTime() || b.id - a.id)
}
export function useParticipacoes() {
  return useQuery({ queryKey: participacoesKey, queryFn: async () => recentes(await api.participacoesList(), p => p.data) })
}
export function useGanhadores() {
  return useQuery({ queryKey: ganhadoresKey, queryFn: async () => recentes(await api.ganhadoresList(), g => g.data_sorteio) })
}
export function useMarcarLida() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: number) => api.participacaoMarcarLida(id), onSuccess: () => qc.invalidateQueries({ queryKey: participacoesKey }) })
}
