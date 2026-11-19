import { ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { contatos, ecad, ferramentas, modulos, planosWeb, pro } from '../../shared/sobre'

const telaPro = new URL('../assets/pro-principal.png', import.meta.url).href

declare global { interface Window { api: { abrirContato: (url: string) => Promise<void> } } }

function Destino({url, label}: {url: string; label: string}) {
  return <button type="button" role="link" className="inline-flex items-center gap-1.5 text-left text-primary underline underline-offset-4" onClick={() => window.api.abrirContato(url).catch(() => toast.error('Não foi possível abrir o link no navegador.'))}>{label}<ExternalLink size={14} aria-hidden="true" /></button>
}

export default function SobrePage() {
  return <section className="max-w-5xl space-y-7 pb-6">
    <header><h1>Sobre o RadioSync Desktop</h1><p className="text-muted-foreground">Aqui você organiza ouvintes e promoções no computador. Conheça também as soluções da UaiHost para colocar a rádio no ar e atender a audiência.</p></header>
    <section className="grid gap-5 rounded-xl border bg-card p-5 lg:grid-cols-2 lg:items-center">
      <div className="space-y-3"><h2 className="text-2xl font-semibold">RadioSync Pro</h2>
        <p>Automatize a programação do estúdio: músicas com crossfade, blocos comerciais no horário, Voz do Brasil e streaming Icecast direto do PC da rádio.</p>
        <p className="text-sm text-muted-foreground">O sistema monitora silêncio no ar e registra as veiculações para você comprovar o que tocou.</p>
        <Destino url={pro} label="Conhecer a automação e a assinatura Pro" /></div>
      <img className="w-full rounded-md border" src={telaPro} alt="Tela de operação do RadioSync Pro no estúdio" />
    </section>
    <section><h2 className="mb-2 text-xl font-semibold">Ferramentas incluídas no Pro</h2><div className="divide-y">{ferramentas.map(f => <article className="grid gap-2 py-3 md:grid-cols-[13rem_1fr]" key={f.nome}><div><h3 className="font-semibold">{f.nome}</h3><span className="text-sm text-muted-foreground">{f.uso}</span></div><div><p className="mb-1">{f.descricao}</p><Destino url={f.url} label={`Ver manual: ${f.nome}`} /></div></article>)}</div></section>
    <section className="space-y-3"><h2 className="text-xl font-semibold">RadioSync Web</h2><p className="text-muted-foreground">Para trabalhar pelo navegador ou celular. A contratação dos módulos Web é separada da assinatura Pro.</p><dl className="grid gap-4 md:grid-cols-3">{modulos.map(m => <div key={m.nome} className="border-l-2 border-primary pl-3"><dt className="font-semibold">{m.nome}</dt><dd className="mt-1 text-sm">{m.descricao}</dd></div>)}</dl><Destino url={planosWeb} label="Comparar os planos Web" /></section>
    <section className="rounded-xl border bg-card p-5"><h2 className="text-lg font-semibold">Seu arquivo do ECAD está certo?</h2><p className="my-2">Confira o arquivo .exp da rádio no navegador. O diagnóstico é gratuito e ajuda a identificar problemas nas tags do acervo.</p><Destino url={ecad} label="Testar meu arquivo .exp" /></section>
    <footer className="space-y-2 border-t pt-4"><h2 className="text-xl font-semibold">Fale com a UaiHost</h2><p className="text-sm text-muted-foreground">Conte como sua emissora trabalha para saber qual solução atende à equipe.</p><dl className="flex flex-wrap gap-x-8 gap-y-2">{contatos.map(c => <div key={c.url}><dt className="font-semibold">{c.nome}</dt><dd><Destino url={c.url} label={c.texto} /></dd></div>)}</dl></footer>
  </section>
}
