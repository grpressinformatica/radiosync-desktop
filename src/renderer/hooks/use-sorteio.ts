import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { ganhadoresKey } from './use-historico'

type PromoSorteio = { id: number; nome: string; qtd_ganhadores: number; status: string }

type Ganhador = {
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

const api = (window as unknown as { api: Record<string, (...args: unknown[]) => Promise<unknown>> }).api

export function usePromocoesParaSorteio() {
  return useQuery({
    queryKey: ['promocoes-sorteio'],
    queryFn: async () => {
      const all = (await api.promocoesList()) as Array<{
        id: number; nome: string; qtd_ganhadores: number; status: string
      }>
      return all.filter((p) => p.status === 'ativa' || p.status === 'encerrada') as PromoSorteio[]
    }
  })
}

export function useRealizarSorteio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ promocaoId, quantidade }: { promocaoId: number; quantidade: number }) =>
      api.sorteioRealizar(promocaoId, quantidade) as Promise<Ganhador[]>,
    onSuccess: () => qc.invalidateQueries({ queryKey: ganhadoresKey })
  })
}