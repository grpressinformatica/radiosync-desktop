import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Link, useNavigate } from "react-router-dom"
import { Mic } from "lucide-react"
import { useOuvintesSimples, usePromocoesAtivasComMulti, useRegistrarParticipacao } from "@/hooks/use-promocoes"

type Ouvinte = { id: number; nome: string; telefone: string | null; cpf: string | null }

export default function ParticipacoesPage() {
 const [avulso, setAvulso] = useState(false)
 const [buscaOuv, setBuscaOuv] = useState("")
 const [ouvinteId, setOuvinteId] = useState<number | null>(null)
 const [nomeAvulso, setNomeAvulso] = useState("")
 const [telAvulso, setTelAvulso] = useState("")
 const [promoId, setPromoId] = useState<string>("none")
 const [musica, setMusica] = useState("")
 const [mensagem, setMensagem] = useState("")

 const { data: ouvintes } = useOuvintesSimples()
 const { data: promocoes } = usePromocoesAtivasComMulti()
 const navigate = useNavigate()
 const registrar = useRegistrarParticipacao()

 const resultados = useMemo(() => {
 if (!buscaOuv.trim()) return []
 const q = buscaOuv.toLowerCase()
 return (ouvintes ?? []).filter(
 (o) => o.nome.toLowerCase().includes(q) || o.telefone?.includes(q) || o.cpf?.includes(q)
 ).slice(0, 8)
 }, [ouvintes, buscaOuv])

 const ouvinteSelecionado = ouvintes?.find((o) => o.id === ouvinteId)

 async function handleRegistrar() {
 if (avulso) {
 if (!nomeAvulso.trim()) { toast.error("Informe o nome do ouvinte"); return }
 } else if (!ouvinteId) {
 toast.error("Selecione um ouvinte"); return
 }

 try {
 await registrar.mutateAsync({
 id_ouvinte: avulso ? null : ouvinteId,
 nome_avulso: avulso ? nomeAvulso.trim() : null,
 telefone_avulso: avulso ? telAvulso.trim() || null : null,
 id_promocao: promoId === "none" ? null : Number(promoId),
 musica: musica || null,
 mensagem: mensagem || null,
 })
 toast.success("Participação salva no mural", { action: { label: "Abrir mural", onClick: () => navigate("/mural") } })
 setMusica("")
 setMensagem("")
 setOuvinteId(null)
 setBuscaOuv("")
 setNomeAvulso("")
 setTelAvulso("")
 setPromoId("none")
 } catch (e) {
 toast.error((e as Error).message)
 }
 }

 return (
 <div className="space-y-4 max-w-2xl">
 <div>
 <h1 className="text-xl font-semibold">Registrar Participação</h1>
 <p className="text-sm text-muted-foreground">Pedidos musicais, recados e participação em promoções</p>
 </div>

 <Button asChild variant="outline"><Link to="/mural">Abrir mural do locutor</Link></Button>
 <div className="border rounded-xl p-5 space-y-4">
 <div>
 <div className="flex items-center justify-between">
 <Label>Ouvinte *</Label>
 <div className="flex gap-1 text-xs">
 <button
 type="button"
 onClick={() => setAvulso(false)}
 className={`px-2 py-0.5 rounded-full transition-colors ${!avulso ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-accent"}`}
 >
 Cadastrado
 </button>
 <button
 type="button"
 onClick={() => setAvulso(true)}
 className={`px-2 py-0.5 rounded-full transition-colors ${avulso ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-accent"}`}
 >
 Avulso (rápido)
 </button>
 </div>
 </div>

 {avulso ? (
 <div className="mt-1 flex gap-2 flex-wrap">
 <Input className="flex-1 min-w-[160px]" value={nomeAvulso} onChange={(e) => setNomeAvulso(e.target.value)} placeholder="Nome do ouvinte" />
 <Input className="flex-1 min-w-[140px]" value={telAvulso} onChange={(e) => setTelAvulso(e.target.value)} placeholder="Telefone (opcional)" />
 </div>
 ) : ouvinteSelecionado ? (
 <div className="flex items-center justify-between mt-1 p-3 bg-muted/30 rounded-lg">
 <div>
 <div className="font-medium text-sm">{ouvinteSelecionado.nome}</div>
 <div className="text-xs text-muted-foreground">{ouvinteSelecionado.telefone ?? "sem telefone"}</div>
 </div>
 <Button size="sm" variant="ghost" onClick={() => { setOuvinteId(null); setBuscaOuv("") }}>Trocar</Button>
 </div>
 ) : (
 <>
 <Input value={buscaOuv} onChange={(e) => setBuscaOuv(e.target.value)} placeholder="Buscar por nome, telefone ou CPF..." />
 {resultados.length > 0 && (
 <div className="mt-2 space-y-1">
 {resultados.map((o) => (
 <button key={o.id} onClick={() => { setOuvinteId(o.id); setBuscaOuv("") }} className="w-full text-left text-sm px-3 py-2 bg-muted/30 hover:bg-muted/50 rounded-lg transition-colors">
 <span className="font-medium">{o.nome}</span>
 <span className="text-muted-foreground ml-2">{o.telefone ?? ""}</span>
 </button>
 ))}
 </div>
 )}
 </>
 )}
 </div>

 <div>
 <Label>Promoção</Label>
 <Select value={promoId} onValueChange={setPromoId}>
 <SelectTrigger><SelectValue /></SelectTrigger>
 <SelectContent>
 <SelectItem value="none">— Sem promoção —</SelectItem>
 {(promocoes ?? []).map((p) => (
 <SelectItem key={p.id} value={String(p.id)}>{p.nome}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 <div>
 <Label>Pedido Musical</Label>
 <Input value={musica} onChange={(e) => setMusica(e.target.value)} placeholder="Música / Artista" />
 </div>

 <div>
 <Label>Mensagem / Alô</Label>
 <Textarea rows={3} value={mensagem} onChange={(e) => setMensagem(e.target.value)} placeholder="Mensagem do ouvinte..." />
 </div>

 <Button
 onClick={handleRegistrar}
 disabled={registrar.isPending || (avulso ? !nomeAvulso.trim() : !ouvinteId)}
 className="w-full"
 >
 <Mic className="h-4 w-4 mr-1" /> {registrar.isPending ? "Registrando..." : "Registrar Participação"}
 </Button>
 </div>
 </div>
 )
}