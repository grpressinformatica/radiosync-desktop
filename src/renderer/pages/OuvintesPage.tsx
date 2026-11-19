import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Plus, Search, Pencil, Trash2, Download, Upload, ChevronLeft, ChevronRight } from "lucide-react"
import { EnderecoCampos, lerCidadePadrao } from "@/components/EnderecoCampos"
import {
  useOuvintes,
  useSaveOuvinte,
  useDeleteOuvinte,
  useImportCSV,
  useExportCSV,
  usePromocoesAtivas,
  useDialogOpenFile,
  useDialogSaveFile,
} from "@/hooks/use-ouvintes"

const PAGE_SIZE = 50

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

const EMPTY: Partial<Ouvinte> = {
  nome: "", telefone: "", cpf: "", data_nascimento: "",
  cep: "", endereco: "", numero: "", bairro: "", cidade: "", uf: "",
}

export default function OuvintesPage() {
  const [busca, setBusca] = useState("")
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<Partial<Ouvinte> | null>(null)
  const [participar, setParticipar] = useState(false)
  const [promoInscricao, setPromoInscricao] = useState<string>("none")
  const [confirmDel, setConfirmDel] = useState<Ouvinte | null>(null)

  const { data: ouvintes, isLoading } = useOuvintes()
  const { data: promocoesAtivas } = usePromocoesAtivas()
  const saveMutation = useSaveOuvinte()
  const deleteMutation = useDeleteOuvinte()
  const importMutation = useImportCSV()
  const exportMutation = useExportCSV()
  const openFileMutation = useDialogOpenFile()
  const saveFileMutation = useDialogSaveFile()

  const filtered = useMemo(() => {
    if (!busca.trim()) return ouvintes ?? []
    const q = busca.toLowerCase()
    return (ouvintes ?? []).filter(
      (o) =>
        o.nome?.toLowerCase().includes(q) ||
        o.telefone?.includes(q) ||
        o.cpf?.includes(q) ||
        o.cidade?.toLowerCase().includes(q),
    )
  }, [ouvintes, busca])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  useEffect(() => { setPage(1) }, [busca])
  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [page, totalPages])
  const pageRows = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page],
  )

  async function handleSave() {
    if (!editing) return
    if (!editing.nome?.trim()) {
      toast.error("Nome obrigatório")
      return
    }
    try {
      if (participar && !promocoesAtivas?.some(p => String(p.id) === promoInscricao)) {
        toast.error("Escolha uma promoção ativa antes de salvar.")
        return
      }
      await saveMutation.mutateAsync({ ...editing, nome: editing.nome.trim(), promoId: participar ? Number(promoInscricao) : undefined })
      toast.success(participar ? "Ouvinte salvo e inscrito na promoção" : "Ouvinte salvo")
      setEditing(null)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  async function handleDelete() {
    if (!confirmDel) return
    try {
      await deleteMutation.mutateAsync(confirmDel.id)
      toast.success("Ouvinte removido")
      setConfirmDel(null)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  async function handleExport() {
    const filePath = await saveFileMutation.mutateAsync(
      `ouvintes-${new Date().toISOString().substring(0, 10)}.csv`
    )
    if (!filePath) return
    try {
      const result = await exportMutation.mutateAsync({ filePath, filter: busca || undefined })
      toast.success(`${result.count} ouvintes exportados`)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  async function handleImport() {
    const filePath = await openFileMutation.mutateAsync([
      { name: "CSV", extensions: ["csv"] },
    ])
    if (!filePath) return
    try {
      const result = await importMutation.mutateAsync(filePath)
      toast.success(`Importado: ${result.imported} novos, ${result.updated} atualizados`)
      if (result.errors.length > 0) {
        toast.warning(`${result.errors.length} erros na importação`)
      }
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">Ouvintes</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "ouvinte" : "ouvintes"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleImport} disabled={openFileMutation.isPending || importMutation.isPending}>
            <Upload className="h-4 w-4 mr-1" /> Importar CSV
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={saveFileMutation.isPending || exportMutation.isPending}>
            <Download className="h-4 w-4 mr-1" /> Exportar CSV
          </Button>
          <Button onClick={() => { setParticipar(false); setPromoInscricao("none"); setEditing({ ...EMPTY, ...lerCidadePadrao() }) }}>
            <Plus className="h-4 w-4 mr-1" /> Novo Ouvinte
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar por nome, telefone, CPF ou cidade..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      <div className="border rounded-xl overflow-hidden">
        {isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Carregando...</p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">Nenhum ouvinte encontrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">Nome</th>
                  <th className="px-4 py-3 text-left">Telefone</th>
                  <th className="px-4 py-3 text-left">CPF</th>
                  <th className="px-4 py-3 text-left">Cidade</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((o) => (
                  <tr key={o.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{o.nome}</td>
                    <td className="px-4 py-3 text-muted-foreground">{o.telefone ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{o.cpf ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {o.cidade ? `${o.cidade}${o.uf ? "/" + o.uf : ""}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => { setParticipar(false); setPromoInscricao("none"); setEditing(o) }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setConfirmDel(o)}>
                          <Trash2 className="h-3.5 w-3.5 text-red-400" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span className="text-xs text-muted-foreground">
            Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              <ChevronLeft className="h-4 w-4" /> Anterior
            </Button>
            <span className="text-xs px-3 text-muted-foreground">Página {page} de {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              Próxima <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Dialog de edição */}
      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar Ouvinte" : "Novo Ouvinte"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Nome *</Label>
                <Input value={editing.nome ?? ""} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} />
              </div>
              <div><Label>Telefone</Label><Input value={editing.telefone ?? ""} onChange={(e) => setEditing({ ...editing, telefone: e.target.value })} /></div>
              <div><Label>CPF</Label><Input value={editing.cpf ?? ""} onChange={(e) => setEditing({ ...editing, cpf: e.target.value })} /></div>
              <div><Label>Nascimento</Label><Input type="date" value={editing.data_nascimento ?? ""} onChange={(e) => setEditing({ ...editing, data_nascimento: e.target.value })} /></div>
              <EnderecoCampos
                value={editing}
                onChange={(patch) => setEditing((prev) => prev && { ...prev, ...patch })}
              />
              <fieldset className="col-span-2 rounded-lg border bg-muted/30 p-3">
                <legend className="px-1 font-semibold">Participação em promoção</legend>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label htmlFor="participar">Participar?</Label>
                    <Select value={participar ? "sim" : "nao"} disabled={!promocoesAtivas?.length} onValueChange={v => { setParticipar(v === "sim"); setPromoInscricao("none") }}>
                      <SelectTrigger id="participar"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="nao">Não</SelectItem><SelectItem value="sim">Sim</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div><Label htmlFor="promocao-cadastro">Promoção ativa</Label>
                    <Select disabled={!participar} value={promoInscricao === "none" ? "" : promoInscricao} onValueChange={setPromoInscricao}>
                      <SelectTrigger id="promocao-cadastro"><SelectValue placeholder="Escolha a promoção" /></SelectTrigger>
                      <SelectContent>{promocoesAtivas?.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.nome}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                {!promocoesAtivas?.length && <p className="mt-2 text-sm text-muted-foreground">Nenhuma promoção ativa para inscrição.</p>}
              </fieldset>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={!!confirmDel} onOpenChange={(v) => !v && setConfirmDel(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir ouvinte?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Esta ação não pode ser desfeita. Excluir <strong>{confirmDel?.nome}</strong>?
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDel(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}