import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { usePromocoes } from '@/hooks/use-promocoes'
import { dataHora, useGanhadores, useParticipacoes } from '@/hooks/use-historico'
import { Registro } from './MuralPage'

const tabs = ['Participações', 'Promoções', 'Sorteios'] as const
type Tab = typeof tabs[number]
const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR').trim()
function corresponde(busca: string, ...campos: (string | null)[]) {
  return campos.some(c => normalizar(c ?? '').includes(busca))
}
function porPromocao<T extends { id_promocao: number | null }>(rows: T[]) {
  const grupos = new Map<number, T[]>()
  for (const row of rows) {
    if (row.id_promocao === null) continue
    const grupo = grupos.get(row.id_promocao)
    if (grupo) grupo.push(row)
    else grupos.set(row.id_promocao, [row])
  }
  return grupos
}
function Falha({ retry }: { retry: () => void }) {
  return <div role="alert">Não foi possível carregar os registros. <Button variant="link" onClick={retry}>Tentar novamente</Button></div>
}
const carregando = <p role="status">Carregando registros…</p>
const lista = 'divide-y rounded-lg border bg-card text-card-foreground'
function Vazio({ filtrado, item }: { filtrado: boolean; item: string }) {
  return <p className="rounded-lg border p-5 text-sm">{filtrado ? 'Nenhum resultado. Tente outra busca ou altere o filtro.' : item}</p>
}
function Participacoes({ busca }: { busca: string }) {
  const query = useParticipacoes()
  const [filtro, setFiltro] = useState('todas')
  const rows = (query.data ?? []).filter(p => (filtro === 'todas' || Boolean(p.lida) === (filtro === 'lidas')) && corresponde(busca, p.nome, p.mensagem, p.musica, p.promocao))
  if (query.isError) return <Falha retry={() => query.refetch()}/>
  if (query.isPending) return carregando
  return <><label className="flex items-center gap-2 text-sm">Leitura no mural
    <select className="rounded-md border border-input bg-background px-2 py-1 text-foreground" value={filtro} onChange={e => setFiltro(e.target.value)}>
      <option value="todas">Todas</option><option value="pendentes">Pendentes</option><option value="lidas">Lidas</option>
    </select></label>
    {!rows.length ? <Vazio filtrado={!!busca || filtro !== 'todas'} item="Nenhuma participação registrada."/> : <ul className={lista}>{rows.map(p => <Registro key={p.id} p={p}><small className="text-muted-foreground">{p.lida ? 'Lida' : 'Pendente de leitura'}</small></Registro>)}</ul>}
  </>
}
function Promocoes({ busca }: { busca: string }) {
  const promos = usePromocoes(), participacoes = useParticipacoes(), ganhadores = useGanhadores()
  const inscritos = useMemo(() => porPromocao(participacoes.data ?? []), [participacoes.data])
  const premiados = useMemo(() => porPromocao(ganhadores.data ?? []), [ganhadores.data])
  if (promos.isError || participacoes.isError || ganhadores.isError) return <Falha retry={() => { void promos.refetch(); void participacoes.refetch(); void ganhadores.refetch() }}/>
  if (promos.isPending || participacoes.isPending || ganhadores.isPending) return carregando
  // promocoesList already orders by creation date, newest first.
  const rows = promos.data.filter(p => corresponde(busca, p.nome, p.parceiro, p.status))
  if (!rows.length) return <Vazio filtrado={!!busca} item="Nenhuma promoção cadastrada."/>
  return <div className={lista}>{rows.map(p => {
    const participantes = inscritos.get(p.id) ?? [], vencedores = premiados.get(p.id) ?? []
    return <details key={p.id} className="p-4">
      <summary className="cursor-pointer break-words"><strong>{p.nome}</strong> <span className="text-sm text-muted-foreground">({p.status})</span>
        <span className="mt-1 block text-sm text-muted-foreground">Participações: {participantes.length} · Ganhadores: {vencedores.length}/{p.qtd_ganhadores}</span>
      </summary>
      <div className="mt-4 space-y-3 border-t pt-3 text-sm"><div><h3 className="font-semibold">Participantes</h3>
        {participantes.length ? <ul>{participantes.map(r => <li key={r.id} className="flex flex-wrap justify-between gap-x-4 py-1"><span className="break-all">{r.nome}</span><time className="text-muted-foreground">{dataHora(r.data)}</time></li>)}</ul> : <p className="text-muted-foreground">Nenhuma participação registrada.</p>}
      </div><div><h3 className="font-semibold">Ganhadores</h3>{vencedores.length ? <ul>{vencedores.map(g => <li key={g.id} className="break-words">{g.nome}</li>)}</ul> : <p className="text-muted-foreground">Nenhum ganhador sorteado.</p>}</div></div>
    </details>
  })}</div>
}
function Sorteios({ busca }: { busca: string }) {
  const query = useGanhadores()
  if (query.isError) return <Falha retry={() => query.refetch()}/>
  if (query.isPending) return carregando
  const rows = query.data.filter(g => corresponde(busca, g.nome, g.promocao, g.telefone))
  if (!rows.length) return <Vazio filtrado={!!busca} item="Nenhum ganhador sorteado até agora."/>
  return <ul className={lista}>{rows.map(g => <li key={g.id} className="flex flex-wrap items-baseline justify-between gap-3 p-4">
    <div className="min-w-0 break-words"><strong>{g.nome}</strong><p className="text-sm">{g.promocao}</p>{g.telefone && <p className="text-sm text-muted-foreground">{g.telefone}</p>}</div>
    <time className="text-xs text-muted-foreground tabular-nums">{dataHora(g.data_sorteio)}</time>
  </li>)}</ul>
}
export default function HistoricoPage() {
  const [tab, setTab] = useState<Tab>('Participações'), [busca, setBusca] = useState('')
  const q = normalizar(busca)
  const placeholder = tab === 'Participações' ? 'Nome, promoção, música ou recado' : tab === 'Promoções' ? 'Promoção, parceiro ou situação' : 'Ganhador, promoção ou telefone'
  return <section className="max-w-4xl space-y-4 text-foreground">
    <header><h1 className="text-xl font-semibold">Histórico</h1><p className="text-sm text-muted-foreground">Consulte as participações da rádio, as promoções e seus ganhadores.</p></header>
    <fieldset className="flex flex-wrap gap-1 border-b"><legend className="sr-only">Seção do histórico</legend>{tabs.map(t => <label key={t} className="cursor-pointer">
      <input type="radio" name="secao-historico" className="peer sr-only" checked={tab === t} onChange={() => { setTab(t); setBusca('') }}/>
      <span className="block border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground peer-checked:border-primary peer-checked:font-semibold peer-checked:text-foreground peer-focus-visible:outline">{t}</span>
    </label>)}</fieldset>
    <Input type="search" aria-label={`Buscar em ${tab.toLowerCase()}`} placeholder={placeholder} value={busca} onChange={e => setBusca(e.target.value)}/>
    {tab === 'Participações' ? <Participacoes busca={q}/> : tab === 'Promoções' ? <Promocoes busca={q}/> : <Sorteios busca={q}/>}
  </section>
}
