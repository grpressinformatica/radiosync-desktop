import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Endereco = Partial<Record<"cep" | "endereco" | "numero" | "bairro" | "cidade" | "uf", string | null>>
type Cidade = { cidade: string; uf: string }
type Rua = { logradouro: string; bairro: string; cep: string; complemento: string }
type Consulta = Cidade & { ibge: number | null; q: string }
type Api = {
  estados(): Promise<{ uf: string; nome: string }[]>
  municipios(uf: string): Promise<{ ibge: number; nome: string }[]>
  cep(digitos: string): Promise<Omit<Endereco, "numero"> | null>
  ruas(params: Consulta): Promise<{ ruas: Rua[]; cepUnico: boolean; cepGeral: string | null }>
  bairros(params: Consulta & { ibge: number }): Promise<string[]>
}
const api = () => (window as unknown as { api: { enderecos: Api } }).api.enderecos
const UFS = "AC AL AM AP BA CE DF ES GO MA MG MS MT PA PB PE PI PR RJ RN RO RR RS SC SE SP TO".split(" ")
const chavePadrao = "radiosync.ouvintes.cidadePadrao"
const normalizar = (s: string) => s.trim().normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
const consulta = { retry: false, networkMode: "always", staleTime: Infinity } as const
const ajuda = "mt-1 text-xs text-muted-foreground"

export function lerCidadePadrao(): Cidade | null {
  try {
    const salvo = JSON.parse(localStorage.getItem(chavePadrao) ?? "null")
    return typeof salvo?.cidade === "string" && salvo.cidade.trim() && UFS.includes(salvo.uf)
      ? { cidade: salvo.cidade.trim(), uf: salvo.uf } : null
  } catch { return null }
}

function useDebounce(value: string) {
  const [q, setQ] = useState<string | null>(null)
  useEffect(() => {
    const timer = setTimeout(() => setQ(value), 350)
    return () => clearTimeout(timer)
  }, [value])
  return q
}

type Opcao = { nome: string; detalhe?: string; escolher: () => void }
function CampoSugestoes({ id, label, value, change, open, toggle, opcoes, aviso, placeholder }: {
  id: string; label: string; value: string; change: (s: string) => void
  open: boolean; toggle: (aberto: boolean) => void; opcoes: Opcao[]; aviso?: string; placeholder?: string
}) {
  const [indice, setIndice] = useState(-1)
  const ativo = open && indice >= 0 && indice < opcoes.length ? indice : -1
  const lista = `${id}-lista`
  const expandido = open && opcoes.length > 0
  useEffect(() => {
    if (ativo >= 0) document.getElementById(`${lista}-${ativo}`)?.scrollIntoView({ block: "nearest" })
  }, [ativo, lista])
  function fechar() { toggle(false); setIndice(-1) }
  function escolher(i: number) { opcoes[i].escolher(); fechar() }
  return <div className="relative min-w-0">
    <Label htmlFor={id}>{label}</Label>
    <Input id={id} value={value} placeholder={placeholder} autoComplete="off" role="combobox"
      aria-autocomplete="list" aria-expanded={expandido} aria-controls={expandido ? lista : undefined}
      aria-activedescendant={ativo >= 0 ? `${lista}-${ativo}` : undefined}
      onFocus={() => toggle(true)} onBlur={fechar}
      onChange={e => { change(e.target.value); setIndice(-1); toggle(true) }}
      onKeyDown={e => {
        if (e.key === "Escape" && open) { e.preventDefault(); e.stopPropagation(); fechar() }
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          toggle(true)
          if (opcoes.length) {
            e.preventDefault()
            setIndice(e.key === "ArrowDown" ? Math.min(ativo + 1, opcoes.length - 1) : ativo < 0 ? opcoes.length - 1 : Math.max(ativo - 1, 0))
          }
        }
        if (e.key === "Enter" && ativo >= 0) { e.preventDefault(); escolher(ativo) }
      }} />
    {expandido && <ul id={lista} role="listbox" aria-label={`Sugestões de ${label}`} className="absolute z-50 mt-1 max-h-44 w-full overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
      {opcoes.map((o, i) => <li key={`${o.nome}|${o.detalhe ?? ""}|${i}`} id={`${lista}-${i}`} role="option" aria-selected={ativo === i}
        className="cursor-pointer rounded px-2 py-1 text-sm hover:bg-accent aria-selected:bg-accent" onMouseDown={e => e.preventDefault()} onClick={() => escolher(i)}>
        {o.nome}{o.detalhe && <span className="block text-xs text-muted-foreground">{o.detalhe}</span>}
      </li>)}
    </ul>}
    {open && aviso && <p role="status" className={ajuda}>{aviso}</p>}
  </div>
}

export function EnderecoCampos({ value, onChange }: { value: Endereco; onChange: (patch: Endereco) => void }) {
  const uf = (value.uf ?? "").toUpperCase(), cidade = (value.cidade ?? "").trim()
  const rua = value.endereco ?? "", bairro = value.bairro ?? "", cep = value.cep ?? ""
  const [aberto, setAberto] = useState("")
  const abrir = (campo: string) => (sim: boolean) => setAberto(prev => sim ? campo : prev === campo ? "" : prev)
  const [padrao, setPadrao] = useState(lerCidadePadrao)
  const [avisoPadrao, setAvisoPadrao] = useState("")
  const ehPadrao = padrao?.uf === uf && normalizar(padrao.cidade) === normalizar(cidade)
  const [avisoCep, setAvisoCep] = useState("")
  const versaoCep = useRef(0), cepEditado = useRef(false)
  // Invalidate on external address changes and synchronously on unmount, too.
  useLayoutEffect(() => {
    setAvisoCep(atual => atual === "Consultando CEP…" ? "" : atual)
    return () => { versaoCep.current++ }
  }, [uf, cidade, cep, rua, bairro, value.numero])
  function mudar(patch: Endereco) {
    versaoCep.current++
    setAvisoCep(""); setAvisoPadrao("")
    onChange(patch)
  }
  async function buscarCep() {
    cepEditado.current = false
    const digitos = cep.replace(/\D/g, "")
    if (digitos.length !== 8) { setAvisoCep(cep ? "Informe os 8 dígitos do CEP." : ""); return }
    const versao = ++versaoCep.current
    setAvisoCep("Consultando CEP…")
    try {
      const resultado = await api().cep(digitos)
      if (versao !== versaoCep.current) return
      if (resultado) {
        const patch: Endereco = {}
        for (const campo of ["cep", "endereco", "bairro", "cidade", "uf"] as const) {
          if (resultado[campo]) patch[campo] = resultado[campo]
        }
        onChange(patch)
      }
      setAvisoCep(resultado ? "CEP encontrado. Confira o endereço." : "CEP não encontrado. Preencha o endereço à mão.")
    } catch {
      if (versao === versaoCep.current) setAvisoCep("Não foi possível consultar o CEP. Preencha à mão ou tente novamente.")
    }
  }
  const estados = useQuery({ ...consulta, queryKey: ["endereco", "estados"], queryFn: () => api().estados() })
  const listaUfs = estados.data?.length ? estados.data : UFS.map(uf => ({ uf, nome: "" }))
  const municipios = useQuery({ ...consulta, queryKey: ["endereco", "municipios", uf], enabled: !!uf, queryFn: () => api().municipios(uf) })
  const nome = normalizar(cidade)
  const ibge = municipios.data?.find(m => normalizar(m.nome) === nome)?.ibge ?? null
  const cidades = (municipios.data ?? []).filter(m => normalizar(m.nome).includes(nome)).slice(0, 40)
  const local = JSON.stringify([uf, nome])
  const [cepUnico, setCepUnico] = useState<{ local: string; geral: string | null } | null>(null)
  const unico = cepUnico?.local === local
  const qRua = useDebounce(rua.trim()), qBairro = useDebounce(bairro.trim())
  const buscarRua = aberto === "rua" && !!uf && !!cidade && rua.trim().length >= 3 && qRua === rua.trim()
  const ruas = useQuery({ ...consulta, queryKey: ["endereco", "ruas", uf, cidade, ibge, qRua], enabled: buscarRua,
    queryFn: () => api().ruas({ uf, cidade, ibge, q: qRua! }) })
  useEffect(() => {
    if (buscarRua && ruas.data) setCepUnico(ruas.data.cepUnico ? { local, geral: ruas.data.cepGeral } : null)
  }, [buscarRua, local, ruas.data])
  const buscarBairro = aberto === "bairro" && unico && ibge !== null && qBairro === bairro.trim()
  const bairros = useQuery({ ...consulta, queryKey: ["endereco", "bairros", uf, cidade, ibge, qBairro], enabled: buscarBairro,
    queryFn: () => api().bairros({ uf, cidade, ibge: ibge!, q: qBairro! }) })
  function salvarPadrao() {
    const novo = { cidade, uf }
    try { localStorage.setItem(chavePadrao, JSON.stringify(novo)); setPadrao(novo); setAvisoPadrao("Cidade salva para novos cadastros neste computador.") }
    catch { setAvisoPadrao("Não foi possível salvar a cidade padrão neste computador.") }
  }
  return <>
    <div><Label htmlFor="endereco-cep">CEP</Label>
      <div className="flex gap-1"><Input id="endereco-cep" inputMode="numeric" maxLength={9} placeholder="00000-000" value={cep}
        onChange={e => { cepEditado.current = true; mudar({ cep: e.target.value.replace(/[^0-9-]/g, "") }) }}
        onBlur={e => { if (cepEditado.current && e.relatedTarget?.id !== "endereco-buscar-cep") void buscarCep() }} />
        <Button id="endereco-buscar-cep" type="button" size="sm" variant="outline" onClick={buscarCep}>Buscar CEP</Button></div>
      {avisoCep && <p className={ajuda} role="status">{avisoCep}</p>}
    </div>
    <div><Label htmlFor="endereco-uf">UF</Label>
      <select id="endereco-uf" className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        value={uf} onChange={e => mudar({ uf: e.target.value, cidade: "" })}>
        <option value="">Selecione</option>
        {listaUfs.map(({ uf, nome }) => <option key={uf} value={uf}>{nome ? `${uf} — ${nome}` : uf}</option>)}
      </select>{estados.isError && <p role="status" className={ajuda}>Usando a lista local de UFs.</p>}
    </div>
    <div><CampoSugestoes id="endereco-cidade" label="Cidade" value={value.cidade ?? ""} change={s => mudar({ cidade: s })}
      open={aberto === "cidade"} toggle={abrir("cidade")} placeholder="Nome do município"
      opcoes={cidades.map(m => ({ nome: m.nome, escolher: () => mudar({ cidade: m.nome }) }))}
      aviso={!uf ? "Selecione a UF para ver sugestões." : municipios.isFetching ? "Buscando municípios…" : municipios.isError ? "Municípios indisponíveis. Digite a cidade à mão." : !cidades.length ? "Nenhuma sugestão. O nome digitado será mantido." : ""} />
      {cidade && uf && (ehPadrao ? <span className={ajuda}>Cidade padrão neste computador</span> : <button type="button" id="endereco-salvar-padrao" className="mt-1 text-xs text-primary underline" onClick={salvarPadrao}>Usar como cidade padrão</button>)}
      {avisoPadrao && <p role="status" className={ajuda}>{avisoPadrao}</p>}
    </div>
    <div className="col-span-2"><CampoSugestoes id="endereco-rua" label="Rua / Endereço" value={rua} change={s => mudar({ endereco: s })}
      open={aberto === "rua"} toggle={abrir("rua")} placeholder={uf && cidade ? "Digite ao menos 3 letras para buscar" : "Nome da rua"}
      opcoes={(buscarRua ? ruas.data?.ruas ?? [] : []).map(r => ({ nome: r.logradouro, detalhe: [r.bairro, r.complemento, r.cep].filter(Boolean).join(" · "),
        escolher: () => mudar({ endereco: r.logradouro, ...(r.bairro && { bairro: r.bairro }), ...(r.cep && { cep: r.cep }) }) }))}
      aviso={buscarRua ? ruas.isFetching ? "Buscando ruas…" : ruas.isError ? "Busca indisponível. Digite a rua à mão." : !ruas.data?.ruas.length ? "Nenhuma rua encontrada. O nome digitado será mantido." : "" : ""} />
      {unico && <p className={ajuda}>Cidade de CEP único{cepUnico.geral && ` (${cepUnico.geral})`}. Algumas ruas podem não aparecer na busca.</p>}
    </div>
    <div><Label htmlFor="endereco-numero">Número</Label><Input id="endereco-numero" value={value.numero ?? ""} onChange={e => mudar({ numero: e.target.value })} /></div>
    <CampoSugestoes id="endereco-bairro" label="Bairro" value={bairro} change={s => mudar({ bairro: s })}
      open={aberto === "bairro"} toggle={abrir("bairro")} opcoes={(buscarBairro ? bairros.data ?? [] : []).map(b => ({ nome: b, escolher: () => mudar({ bairro: b }) }))}
      aviso={buscarBairro ? bairros.isFetching ? "Buscando bairros…" : bairros.isError ? "Busca indisponível. Digite o bairro à mão." : !bairros.data?.length ? "Nenhum bairro encontrado. Preencha à mão." : "" : ""} />
  </>
}
