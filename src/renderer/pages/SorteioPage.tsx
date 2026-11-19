import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Trophy, Sparkles } from "lucide-react"
import { usePromocoesParaSorteio, useRealizarSorteio } from "@/hooks/use-sorteio"

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

function formatEndereco(g: Ganhador): string | null {
  const rua = [g.endereco, g.numero].filter(Boolean).join(", ")
  const local = [g.bairro, g.cidade && g.uf ? `${g.cidade}/${g.uf}` : g.cidade].filter(Boolean).join(" — ")
  return [rua, local].filter(Boolean).join(" • ") || null
}

function formatDataNascimento(data: string | null): string | null {
  if (!data) return null
  const [ano, mes, dia] = data.split("-")
  return `${dia}/${mes}/${ano}`
}

export default function SorteioPage() {
  const [promoId, setPromoId] = useState<string>("")
  const [qtd, setQtd] = useState<number>(1)
  const [ganhadores, setGanhadores] = useState<Ganhador[]>([])

  const { data: promocoes } = usePromocoesParaSorteio()
  const sortear = useRealizarSorteio()

  const promoSelecionada = promocoes?.find((p) => p.id === Number(promoId))

  async function handleSortear() {
    if (!promoId) { toast.error("Selecione uma promoção"); return }
    try {
      const data = await sortear.mutateAsync({ promocaoId: Number(promoId), quantidade: qtd })
      setGanhadores(data)
      if (data.length === 0) toast.warning("Nenhum ouvinte elegível encontrado")
      else toast.success(`${data.length} ganhador(es) sorteado(s)!`)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold">Realizar Sorteio</h1>
        <p className="text-sm text-muted-foreground">Sorteie aleatoriamente entre os participantes elegíveis (sem ganhadores nos últimos 90 dias)</p>
      </div>

      <div className="border rounded-xl p-5 space-y-4">
        <div>
          <Label>Promoção *</Label>
          <Select value={promoId} onValueChange={(v) => { setPromoId(v); const p = promocoes?.find((x) => x.id === Number(v)); if (p) setQtd(p.qtd_ganhadores) }}>
            <SelectTrigger><SelectValue placeholder="Selecione uma promoção..." /></SelectTrigger>
            <SelectContent>
              {(promocoes ?? []).map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.nome} ({p.qtd_ganhadores} ganhador{p.qtd_ganhadores > 1 ? "es" : ""}){p.status === "encerrada" ? " — Encerrada, aguardando sorteio" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {promoSelecionada?.status === "encerrada" && (
          <p className="text-xs text-yellow-600 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
            Esta promoção está encerrada — o sorteio considera os participantes já registrados.
          </p>
        )}

        <div>
          <Label>Quantidade a sortear</Label>
          <Input type="number" min={1} value={qtd} onChange={(e) => setQtd(Number(e.target.value))} />
        </div>

        <Button size="lg" className="w-full" onClick={handleSortear} disabled={sortear.isPending || !promoId}>
          <Sparkles className="h-4 w-4 mr-2" />
          {sortear.isPending ? "Sorteando..." : "Sortear"}
        </Button>
      </div>

      {ganhadores.length > 0 && (
        <div className="border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <h2 className="font-semibold">Ganhadores — {promoSelecionada?.nome}</h2>
          </div>
          <div className="space-y-2">
            {ganhadores.map((g, i) => (
              <div key={g.id} className="flex items-center gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">#{i + 1}</div>
                <div className="flex-1 space-y-0.5">
                  <div className="font-semibold">{g.nome}</div>
                  <div className="text-xs text-muted-foreground">
                    {g.telefone ?? "sem telefone"} {g.cpf ? `• CPF ${g.cpf}` : ""} {formatDataNascimento(g.data_nascimento) ? `• Nasc. ${formatDataNascimento(g.data_nascimento)}` : ""}
                  </div>
                  {formatEndereco(g) && (
                    <div className="text-xs text-emerald-600">📍 {formatEndereco(g)}{g.cep ? ` • CEP ${g.cep}` : ""}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}