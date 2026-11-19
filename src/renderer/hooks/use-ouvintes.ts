import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

type Ouvinte = {
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

export function useOuvintes(search?: string) {
  return useQuery({
    queryKey: ['ouvintes', search ?? ''],
    queryFn: () => api.ouvintesList(search) as Promise<Ouvinte[]>
  })
}

export function useSaveOuvinte() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (o: Partial<Ouvinte> & { promoId?: number }) => api.ouvintesSave(o) as Promise<{ id: number }>,
    onSuccess: () => {
      qc.invalidateQueries()
    }
  })
}

export function useDeleteOuvinte() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.ouvintesDelete(id) as Promise<boolean>,
    onSuccess: () => {
      qc.invalidateQueries()
    }
  })
}

export function useImportCSV() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (filePath: string) =>
      api.csvImportOuvintes(filePath) as Promise<{ imported: number; updated: number; errors: string[] }>,
    onSuccess: () => {
      qc.invalidateQueries()
    }
  })
}

export function useExportCSV() {
  return useMutation({
    mutationFn: ({ filePath, filter }: { filePath: string; filter?: string }) =>
      api.csvExportOuvintes(filePath, filter) as Promise<{ count: number }>
  })
}

export function usePromocoesAtivas() {
  return useQuery({
    queryKey: ['promocoes-ativas'],
    queryFn: async () => {
      const all = (await api.promocoesList()) as Array<{ id: number; nome: string; status: string }>
      return all.filter((p) => p.status === 'ativa').map(({ id, nome }) => ({ id, nome }))
    }
  })
}

export function useDialogOpenFile() {
  return useMutation({
    mutationFn: (filters: { name: string; extensions: string[] }[]) =>
      api.dialogOpenFile(filters) as Promise<string | null>
  })
}

export function useDialogSaveFile() {
  return useMutation({
    mutationFn: (defaultName: string) =>
      api.dialogSaveFile(defaultName) as Promise<string | null>
  })
}