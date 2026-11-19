import { Check, Gift, MessageSquare, Music2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { dataHora, useMarcarLida, useParticipacoes, type Participacao } from '@/hooks/use-historico'

export function Registro({ p, children }: { p: Participacao; children?: React.ReactNode }) {
  return <li className="space-y-2 px-4 py-4">
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <strong className="min-w-0 break-words">{p.nome || 'Ouvinte sem nome'}</strong>
      <time className="text-xs text-muted-foreground tabular-nums">{dataHora(p.data)}</time>
    </div>
    {p.mensagem && <p className="flex items-start gap-2"><MessageSquare aria-label="Mensagem" className="mt-1 size-4 shrink-0 text-muted-foreground"/><span className="min-w-0 whitespace-pre-wrap break-words">{p.mensagem}</span></p>}
    {p.musica && <p className="flex items-start gap-2"><Music2 aria-label="Pedido musical" className="mt-1 size-4 shrink-0 text-muted-foreground"/><span className="min-w-0 break-words">{p.musica}</span></p>}
    {p.promocao && <p className="flex items-start gap-2 text-sm text-muted-foreground"><Gift aria-label="Promoção" className="size-4 mt-0.5 shrink-0"/><span className="min-w-0 break-words">{p.promocao}</span></p>}
    {children}
  </li>
}

export default function MuralPage() {
  const query = useParticipacoes()
  const marcar = useMarcarLida()
  const pendentes = (query.data ?? []).filter(p => !p.lida)
  return <section className="max-w-4xl space-y-4 text-foreground">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-xl font-semibold">Mural do locutor</h1><p className="text-sm text-muted-foreground">Pedidos e recados que ainda não foram lidos no ar.</p></div>
      <Button asChild variant="outline"><Link to="/participacoes">Registrar participação</Link></Button>
    </header>
    {query.isError ? <div role="alert">Não foi possível carregar o mural. <Button variant="link" onClick={() => query.refetch()}>Tentar novamente</Button></div>
    : query.isPending ? <p role="status">Carregando mural…</p>
    : !pendentes.length ? <p className="rounded-lg border p-5">Nenhuma participação pendente. Os próximos registros aparecerão aqui.</p>
    : <><h2 className="font-semibold" aria-live="polite">Aguardando leitura ({pendentes.length})</h2>
      <ul className="divide-y rounded-lg border bg-card text-card-foreground">{pendentes.map(p => <Registro key={p.id} p={p}>
        <Button size="sm" variant="outline" disabled={marcar.isPending} onClick={() => marcar.mutate(p.id, { onError: () => toast.error('Não foi possível marcar como lida. Tente novamente.') })}><Check/>Marcar como lida</Button>
      </Registro>)}</ul></>}
  </section>
}
