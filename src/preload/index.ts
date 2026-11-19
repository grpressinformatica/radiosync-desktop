import type { EnderecosApi } from '../main/enderecos'
import { contextBridge, ipcRenderer } from 'electron'

const enderecos: EnderecosApi = {
  cep: digits => ipcRenderer.invoke('enderecos:cep', digits),
  estados: () => ipcRenderer.invoke('enderecos:estados'),
  municipios: uf => ipcRenderer.invoke('enderecos:municipios', uf),
  ruas: input => ipcRenderer.invoke('enderecos:ruas', input),
  bairros: input => ipcRenderer.invoke('enderecos:bairros', input)
}

const api = {
  abrirContato: (url: string) => ipcRenderer.invoke('sobre:abrirContato', url),
  enderecos,
  // Ouvintes
  ouvintesList: (search?: string) => ipcRenderer.invoke('db:ouvintes:list', search),
  ouvintesSave: (o: Record<string, unknown>) => ipcRenderer.invoke('db:ouvintes:save', o),
  ouvintesDelete: (id: number) => ipcRenderer.invoke('db:ouvintes:delete', id),

  // Promoções
  promocoesList: () => ipcRenderer.invoke('db:promocoes:list'),
  promocoesSave: (p: Record<string, unknown>) => ipcRenderer.invoke('db:promocoes:save', p),
  promocoesDelete: (id: number) => ipcRenderer.invoke('db:promocoes:delete', id),

  // Participações
  participacoesList: () => ipcRenderer.invoke('db:participacoes:list'),
  participacaoMarcarLida: (id: number) => ipcRenderer.invoke('db:participacoes:marcarLida', id),
  participacoesRegister: (data: Record<string, unknown>) =>
    ipcRenderer.invoke('db:participacoes:register', data),
  participacoesCountByPromocao: () =>
    ipcRenderer.invoke('db:participacoes:countByPromocao'),

  // Sorteio
  ganhadoresList: () => ipcRenderer.invoke('db:ganhadores:list'),
  sorteioRealizar: (promocaoId: number, quantidade: number) =>
    ipcRenderer.invoke('db:sorteio:realizar', promocaoId, quantidade),

  // CSV
  csvImportOuvintes: (filePath: string) =>
    ipcRenderer.invoke('csv:import:ouvintes', filePath),
  csvExportOuvintes: (filePath: string, filter?: string) =>
    ipcRenderer.invoke('csv:export:ouvintes', filePath, filter),

  // File dialogs
  dialogOpenFile: (filters: { name: string; extensions: string[] }[]) =>
    ipcRenderer.invoke('dialog:openFile', filters),
  dialogSaveFile: (defaultName: string) =>
    ipcRenderer.invoke('dialog:saveFile', defaultName),

  // Dashboard
  dashboardStats: () => ipcRenderer.invoke('dashboard:stats'),
  dashboardAniversariantes: () => ipcRenderer.invoke('dashboard:aniversariantes'),
  dashboardPromocoesAtivas: () => ipcRenderer.invoke('dashboard:promocoes-ativas')
}

contextBridge.exposeInMainWorld('api', api)