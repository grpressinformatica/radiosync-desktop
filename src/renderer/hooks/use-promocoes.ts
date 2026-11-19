import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

type Promocao = {
 id: number
 nome: string
 status: string
 descricao: string | null
 parceiro: string | null
 inicio: string
 fim: string
 hora_encerramento: string | null
 qtd_ganhadores: number
 mensagem_divulgacao: string | null
 permite_multipla_participacao: boolean
}

type ContagemParticipacoes = { id_promocao: number; total: number }

const api = (window as unknown as { api: Record<string, (...args: unknown[]) => Promise<unknown>> }).api

export function usePromocoes() {
 return useQuery({
 queryKey: ['promocoes'],
 queryFn: () => api.promocoesList() as Promise<Promocao[]>
 })
}

export function useSavePromocao() {
 const qc = useQueryClient()
 return useMutation({
 mutationFn: (p: Partial<Promocao>) => api.promocoesSave(p) as Promise<{ id: number }>,
 onSuccess: () => {
 qc.invalidateQueries()
 }
 })
}

export function useDeletePromocao() {
 const qc = useQueryClient()
 return useMutation({
 mutationFn: (id: number) => api.promocoesDelete(id) as Promise<boolean>,
 onSuccess: () => {
 qc.invalidateQueries()
 }
 })
}

export function useContagensParticipacoes() {
 return useQuery({
 queryKey: ['participacoes-contagem'],
 queryFn: () => api.participacoesCountByPromocao() as Promise<ContagemParticipacoes[]>
 })
}

// --- Participações ---

type OuvinteSimples = { id: number; nome: string; telefone: string | null; cpf: string | null }
type PromocaoAtiva = { id: number; nome: string; permite_multipla_participacao: boolean }

export function useOuvintesSimples() {
 return useQuery({
 queryKey: ['ouvintes-simples'],
 queryFn: async () => {
 const all = (await api.ouvintesList()) as OuvinteSimples[]
 return all.map(({ id, nome, telefone, cpf }) => ({ id, nome, telefone, cpf }))
 }
 })
}

export function usePromocoesAtivasComMulti() {
 return useQuery({
 queryKey: ['promocoes-ativas-multi'],
 queryFn: async () => {
 const all = (await api.promocoesList()) as Array<{ id: number; nome: string; status: string; permite_multipla_participacao: number }>
 return all
 .filter((p) => p.status === 'ativa')
 .map(({ id, nome, permite_multipla_participacao }) => ({
 id,
 nome,
 permite_multipla_participacao: !!permite_multipla_participacao
 })) as PromocaoAtiva[]
 }
 })
}

export function useRegistrarParticipacao() {
 const qc = useQueryClient()
 return useMutation({
 mutationFn: (data: Record<string, unknown>) =>
 api.participacoesRegister(data) as Promise<{ id: number }>,
 onSuccess: () => {
 qc.invalidateQueries()
 }
 })
}