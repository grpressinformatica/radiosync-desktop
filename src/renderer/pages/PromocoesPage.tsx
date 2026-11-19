import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Plus, Pencil, Trash2, Trophy, Users } from "lucide-react"
import { usePromocoes, useSavePromocao, useDeletePromocao, useContagensParticipacoes } from "@/hooks/use-promocoes"

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

const EMPTY: Partial<Promocao> = {
  nome: "", status: "ativa", descricao: "", parceiro: "",
  inicio: "", fim: "", hora_encerramento: "", qtd_ganhadores: 1,
  mensagem_divulgacao: "", permite_multipla_participacao: false,
}

export default function PromocoesPage() {
  const [editing, setEditing] = useState<Partial<Promocao> | null>(null)
  const [confirmDel, setConfirmDel] = useState<Promocao | null>(null)

  const { data: promocoes, isLoading } = usePromocoes()
  const { data: contagensRaw } = useContagensParticipacoes()
  const saveMutation = useSavePromocao()
  const deleteMutation = useDeletePromocao()

  const contagens: Record<number, number> = {}
  for (const c of contagensRaw ?? []) contagens[c.id_promocao] = c.total

  async function handleSave() {
    if (!editing) return
    if (!editing.nome?.trim()) { toast.error("Nome obrigatório"); return }
    if (!editing.inicio || !editing.fim) { toast.error("Datas obrigatórias"); return }
    try {
      await saveMutation.mutateAsync(editing)
      toast.success("Promoção salva")
      setEditing(null)
    } catch (e) { toast.error((e as Error).message) }
  }

  async function handleDelete() {
    if (!confirmDel) return
    try {
      await deleteMutation.mutateAsync(confirmDel.id)
      toast.success("Promoção excluída")
      setConfirmDel(null)
    } catch (e) { toast.error((e as Error).message) }
  }

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      ativa: "bg-emerald-500/15 text-emerald-600",
      encerrada: "bg-muted-foreground/15 text-muted-foreground",
      pausada: "bg-yellow-500/15 text-yellow-600",
    }
    return map[s] ?? "bg-muted-foreground/15 text-muted-foreground"
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Promoções</h1>
          <p className="text-sm text-muted-foreground">{promocoes?.length ?? 0} cadastradas</p>
        </div>
        <Button onClick={() => setEditing({ ...EMPTY })}><Plus className="h-4 w-4 mr-1" /> Nova Promoção</Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : !promocoes || promocoes.length === 0 ? (
        <div className="border rounded-xl p-12 text-center">
          <Trophy className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Nenhuma promoção cadastrada.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {promocoes.map((p) => (
            <div key={p.id} className="border rounded-xl p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold">{p.nome}</h3>
                <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${statusBadge(p.status)}`}>{p.status}</span>
              </div>
              {p.parceiro && <p className="text-xs text-muted-foreground mb-1">🤝 {p.parceiro}</p>}
              {p.descricao && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{p.descricao}</p>}
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {new Date(p.inicio + "T12:00:00").toLocaleDateString("pt-BR")} → {new Date(p.fim + "T12:00:00").toLocaleDateString("pt-BR")}
                </span>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <span className="inline-flex items-center gap-1" title="Ouvintes cadastrados na promoção">
                    <Users className="h-3.5 w-3.5" /> {contagens[p.id] ?? 0}
                  </span>
                  <span>🏆 {p.qtd_ganhadores}</span>
                </div>
              </div>
              <div className="flex justify-end gap-1 mt-3 pt-3 border-t">
                <Button size="sm" variant="ghost" onClick={() => setEditing(p)}><Pencil className="h-3.5 w-3.5 mr-1" /> Editar</Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmDel(p)}><Trash2 className="h-3.5 w-3.5 text-red-400" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar Promoção" : "Nova Promoção"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Nome *</Label><Input value={editing.nome ?? ""} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} /></div>
              <div className="col-span-2"><Label>Parceiro</Label><Input value={editing.parceiro ?? ""} onChange={(e) => setEditing({ ...editing, parceiro: e.target.value })} /></div>
              <div className="col-span-2"><Label>Descrição</Label><Textarea rows={3} value={editing.descricao ?? ""} onChange={(e) => setEditing({ ...editing, descricao: e.target.value })} /></div>
              <div className="col-span-2">
                <Label>Texto de Divulgação</Label>
                <Textarea
                  rows={3}
                  value={editing.mensagem_divulgacao ?? ""}
                  onChange={(e) => setEditing({ ...editing, mensagem_divulgacao: e.target.value })}
                  placeholder="🎉 {promocao}! Válida de {vigencia}. Participe e concorra!"
                />
              </div>
              <div><Label>Início *</Label><Input type="date" value={editing.inicio ?? ""} onChange={(e) => setEditing({ ...editing, inicio: e.target.value })} /></div>
              <div><Label>Fim *</Label><Input type="date" value={editing.fim ?? ""} onChange={(e) => setEditing({ ...editing, fim: e.target.value })} /></div>
              <div><Label>Hora Encerramento</Label><Input type="time" value={editing.hora_encerramento ?? ""} onChange={(e) => setEditing({ ...editing, hora_encerramento: e.target.value })} /></div>
              <div><Label>Qtd. Ganhadores</Label><Input type="number" min={1} value={editing.qtd_ganhadores ?? 1} onChange={(e) => setEditing({ ...editing, qtd_ganhadores: Number(e.target.value) })} /></div>
              <div>
                <Label>Status</Label>
                <Select value={editing.status ?? "ativa"} onValueChange={(v) => setEditing({ ...editing, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativa">Ativa</SelectItem>
                    <SelectItem value="pausada">Pausada</SelectItem>
                    <SelectItem value="encerrada">Encerrada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Múltipla participação?</Label>
                <Select
                  value={editing.permite_multipla_participacao ? "sim" : "nao"}
                  onValueChange={(v) => setEditing({ ...editing, permite_multipla_participacao: v === "sim" })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nao">Não — 1 por ouvinte</SelectItem>
                    <SelectItem value="sim">Sim — sem limite</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>{saveMutation.isPending ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDel} onOpenChange={(v) => !v && setConfirmDel(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Excluir promoção?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Excluir <strong>{confirmDel?.nome}</strong>? Esta ação não pode ser desfeita.</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDel(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}