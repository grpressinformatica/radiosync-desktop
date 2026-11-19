import { Link } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Users, Gift, MessageSquare, Trophy, Plus, Mic, Radio, Sparkles, Clock } from "lucide-react"
import TempoAgora from "@/components/TempoAgora"

const api = (window as unknown as { api: Record<string, (...args: unknown[]) => Promise<unknown>> }).api

type Stats = { ouvintes: number; promocoes: number; pendentes: number; ganhadores: number }
type Aniversariante = { nome: string; telefone: string | null }
type PromocaoAtiva = { nome: string; dias: number }

const STAT_CARDS = [
 { key: "ouvintes" as const, label: "Ouvintes", color: "var(--brand)", href: "/ouvintes", icon: Users },
 { key: "promocoes" as const, label: "Promoções Ativas", color: "var(--success)", href: "/promocoes", icon: Gift },
 { key: "pendentes" as const, label: "Msg. Pendentes", color: "var(--warning)", href: "/mural", icon: MessageSquare },
 { key: "ganhadores" as const, label: "Ganhadores", color: "#ffc107", href: "/historico", icon: Trophy },
]

const QUICK_ACTIONS = [
 { to: "/ouvintes?novo=1", label: "Novo Ouvinte", icon: Plus, tone: "default" },
 { to: "/participacoes", label: "Registrar Participação", icon: Mic, tone: "default" },
 { to: "/mural", label: "Ver Mural", icon: Radio, tone: "yellow" },
 { to: "/sorteio", label: "Realizar Sorteio", icon: Sparkles, tone: "green" },
 { to: "/historico", label: "Histórico", icon: Clock, tone: "default" },
] as const

export default function DashboardPage() {
 const qc = useQueryClient()
 const hoje = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })

 const stats = useQuery({
 queryKey: ["dashboard-stats"],
 queryFn: () => api.dashboardStats() as Promise<Stats>,
 refetchOnWindowFocus: true,
 })

 const aniversariantes = useQuery({
 queryKey: ["dashboard-aniversariantes"],
 queryFn: () => api.dashboardAniversariantes() as Promise<Aniversariante[]>,
 })

 const promocoesAtivas = useQuery({
 queryKey: ["dashboard-promocoes-ativas"],
 queryFn: () => api.dashboardPromocoesAtivas() as Promise<PromocaoAtiva[]>,
 })

 return (
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <h1 className="text-xl font-semibold">Dashboard</h1>
 <span className="text-sm text-muted-foreground">{hoje}</span>
 </div>

 {/* KPI Cards */}
 <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
 {STAT_CARDS.map((c) => (
 <Link key={c.key} to={c.href} className="relative overflow-hidden rounded-xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-[var(--line)]">
 <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: c.color }} />
 <div className="flex items-center gap-3 mb-2">
 <c.icon size={20} style={{ color: c.color }} />
 <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{c.label}</span>
 </div>
 <div className="text-4xl font-bold tracking-tight">{stats.data?.[c.key] ?? "—"}</div>
 </Link>
 ))}
 </div>

 {/* Aniversariantes + Promoções Ativas */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="rounded-xl border bg-card p-4">
 <div className="flex items-center gap-2 mb-3">
 <span>🎂</span>
 <span className="text-sm font-semibold">Aniversariantes de Hoje</span>
 {(aniversariantes.data?.length ?? 0) > 0 && (
 <span className="ml-auto bg-pink-500/15 text-pink-600 dark:text-pink-300 text-xs px-2 py-0.5 rounded-full">
 {aniversariantes.data!.length}
 </span>
 )}
 </div>
 {!aniversariantes.data || aniversariantes.data.length === 0 ? (
 <p className="text-muted-foreground text-sm">Nenhum aniversariante hoje.</p>
 ) : (
 <ul className="space-y-2">
 {aniversariantes.data.map((a, i) => (
 <li key={i} className="flex justify-between text-sm border-b border-border pb-2 last:border-0 last:pb-0">
 <span>{a.nome}</span>
 <span className="text-muted-foreground">{a.telefone ?? "—"}</span>
 </li>
 ))}
 </ul>
 )}
 </div>

 <div className="rounded-xl border bg-card p-4">
 <div className="flex items-center gap-2 mb-3">
 <span>📅</span>
 <span className="text-sm font-semibold">Promoções Ativas</span>
 </div>
 {!promocoesAtivas.data || promocoesAtivas.data.length === 0 ? (
 <p className="text-muted-foreground text-sm">Nenhuma promoção ativa.</p>
 ) : (
 <ul className="space-y-2">
 {promocoesAtivas.data.map((p, i) => (
 <li key={i} className="flex justify-between items-center text-sm border-b border-border pb-2 last:border-0 last:pb-0">
 <span>{p.nome}</span>
 <span className={`text-xs px-2 py-0.5 rounded-full ${p.dias <= 3 ? "bg-red-500/15 text-red-600 dark:text-red-300" : "bg-muted/50 text-muted-foreground"}`}>
 {p.dias} dia{p.dias !== 1 ? "s" : ""}
 </span>
 </li>
 ))}
 </ul>
 )}
 </div>
 </div>

 {/* Tempo Agora */}
 <TempoAgora />

 {/* Ações Rápidas */}
 <div className="rounded-xl border bg-card p-4">
 <div className="text-[10px] font-bold text-muted-foreground tracking-[0.14em] uppercase mb-3">Ações Rápidas</div>
 <div className="flex flex-wrap gap-2">
 {QUICK_ACTIONS.map((a) => {
 const cls =
 a.tone === "yellow"
 ? "border-warning/30 text-warning hover:border-warning/60 hover:bg-warning/5"
 : a.tone === "green"
 ? "border-success/30 text-success hover:border-success/60 hover:bg-success/5"
 : "border-border text-muted-foreground hover:text-foreground hover:border-[var(--line)] hover:bg-muted/30"
 return (
 <Link key={a.to} to={a.to} className={`inline-flex items-center gap-2 text-sm px-4 py-2 border rounded-lg transition-colors ${cls}`}>
 <a.icon size={16} />
 {a.label}
 </Link>
 )
 })}
 </div>
 </div>
 </div>
 )
}