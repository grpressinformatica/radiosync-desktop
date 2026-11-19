import type { IpcMain } from 'electron'
import { z } from 'zod'

const UFS = new Set('AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' '))
const uf = z.string().length(2).transform(s => s.toUpperCase()).refine(s => UFS.has(s))
const ibge = z.number().int().min(1000000).max(9999999)
const postal = z.string().regex(/^\d{5}-?\d{3}$/)
const nome = z.string().trim().min(1).max(300)
const segmento = (min: number, max: number) => z.string().max(max).trim().min(min)
  .refine(s => !/[\x00-\x1f\x7f/\\]/.test(s) && s !== '.' && s !== '..')
const cidade = z.object({ uf, cidade: segmento(2, 100), ibge, q: segmento(0, 80) })
const rua = cidade.extend({ ibge: ibge.nullable(), q: segmento(3, 80) })
type Cidade = z.output<typeof cidade>
const viaItem = z.object({ cep: postal, logradouro: z.string().max(300), bairro: z.string().max(300), complemento: z.string().max(300) })
const normalizar = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim()
const ESTADOS = 'https://servicodados.ibge.gov.br/api/v1/localidades/estados'
const VIACEP = 'https://viacep.com.br/ws'
const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter', 'https://overpass.private.coffee/api/interpreter']

// Share in-flight lookups (particularly the city-wide OSM download); never cache failures.
function cache<T>(limit: number, ttl: number) {
  const entries = new Map<string, { expires: number; value: Promise<T> }>()
  return (key: string, load: () => Promise<T>): Promise<T> => {
    const hit = entries.get(key)
    if (hit && hit.expires > Date.now()) return hit.value
    entries.delete(key)
    if (entries.size >= limit) entries.delete(entries.keys().next().value!)
    const value = load().catch(error => {
      if (entries.get(key)?.value === value) entries.delete(key)
      throw error
    })
    entries.set(key, { expires: Date.now() + ttl, value })
    return value
  }
}

// Bound decoded bytes too: Content-Length may be absent or refer to compressed data.
async function request(fetcher: typeof fetch, provider: string, url: string, init?: RequestInit): Promise<unknown> {
  const osm = provider === 'Overpass'
  try {
    const response = await fetcher(url, { ...init, headers: { 'User-Agent': 'RadioSync Desktop (cadastro de ouvintes)' },
      redirect: 'error', signal: AbortSignal.timeout(osm ? 10000 : 7000) })
    if (!response.ok || !response.body) { await response.body?.cancel(); throw Error() }
    const reader = response.body.getReader(), chunks: Uint8Array[] = []
    let size = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > (osm ? 4_000_000 : 1_000_000)) { await reader.cancel(); throw Error() }
      chunks.push(value)
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch { throw new Error(`${provider} indisponível. Tente novamente em instantes.`) }
}
function parse<S extends z.ZodTypeAny>(schema: S, value: unknown, provider?: string): z.output<S> {
  const parsed = schema.safeParse(value)
  if (!parsed.success) throw new Error(provider ? `Resposta inválida do ${provider}.` : 'Parâmetros de endereço inválidos.')
  return parsed.data
}

type Estado = { uf: string; nome: string }
type Municipio = { ibge: number; nome: string }
type Osm = { ruas: string[]; bairros: string[]; cepGeral: string | null }
const osmSchema = z.object({ remark: z.undefined(), elements: z.array(z.object({ type: z.string(), tags: z.record(z.string()).optional() })) })
const dia = 86400000
export function criarEnderecos(fetcher: typeof fetch = fetch) {
  const estadosCache = cache<Estado[]>(1, dia), municipiosCache = cache<Municipio[]>(27, dia)
  const viaCache = cache<z.output<typeof viaItem>[]>(100, 300000), unicoCache = cache<boolean>(128, dia)
  const osmCache = cache<Osm>(8, dia)
  const get = (provider: string, url: string, init?: RequestInit) => request(fetcher, provider, url, init)
  function via(sigla: string, cidadeNome: string, q: string) {
    const url = `${VIACEP}/${sigla}/${encodeURIComponent(cidadeNome)}/${encodeURIComponent(q)}/json/`
    return viaCache(url, async () => parse(z.array(viaItem).max(100), await get('ViaCEP', url), 'ViaCEP'))
  }
  function unico(c: { uf: string; cidade: string }) {
    return unicoCache(`${c.uf}|${normalizar(c.cidade)}`, async () => (await via(c.uf, c.cidade, 'Rua')).length < 10)
  }
  function osm(c: Cidade) {
    return osmCache(`${c.ibge}|${normalizar(c.cidade)}`, async () => {
      // Only the validated integer enters the query. User search text is filtered locally.
      const data = `[out:json][timeout:9];rel["boundary"="administrative"]["IBGE:GEOCODIGO"="${c.ibge}"]->.r;
.r out tags; .r map_to_area->.a; way(area.a)["highway"]["name"]["bridge"!="yes"]; out tags;
(node(area.a)["place"~"^(suburb|neighbourhood|quarter)$"];way(area.a)["place"~"^(suburb|neighbourhood|quarter)$"];); out tags;`
      for (const url of OVERPASS) {
        try {
          const { elements } = parse(osmSchema, await get('Overpass', url, { method: 'POST', body: new URLSearchParams({ data }) }), 'Overpass')
          const ruas = new Set<string>(), bairros = new Set<string>()
          let cepGeral: string | null = null
          for (const { type, tags } of elements) {
            if (!tags) continue
            if (type === 'relation') { if (postal.safeParse(tags.postal_code).success) cepGeral = tags.postal_code; continue }
            const n = tags.name?.trim()
            if (!n || n.length > 300) continue
            if (tags.highway) ruas.add(n)
            else if (tags.place && normalizar(n) !== normalizar(c.cidade)) bairros.add(n)
          }
          const sorted = (v: Set<string>) => [...v].sort((a, b) => a.localeCompare(b, 'pt-BR'))
          return { ruas: sorted(ruas), bairros: sorted(bairros), cepGeral }
        } catch { /* Public mirrors sometimes return 429, 504 or an Overpass remark with HTTP 200. */ }
      }
      throw new Error('Overpass indisponível. Tente novamente em instantes.')
    })
  }
  const matching = (names: string[], q: string, limit: number) => {
    const words = normalizar(q).split(/\s+/)
    return names.filter(name => { const n = normalizar(name); return words.every(word => n.includes(word)) }).slice(0, limit)
  }
  return {
    async cep(input: string) {
      const digits = parse(z.string().regex(/^\d{8}$/), input)
      const data = await get('ViaCEP', `${VIACEP}/${digits}/json/`)
      if (z.object({ erro: z.union([z.literal(true), z.literal('true')]) }).safeParse(data).success) return null
      const item = parse(viaItem.extend({ localidade: nome, uf }), data, 'ViaCEP')
      return { cep: item.cep, endereco: item.logradouro, bairro: item.bairro, cidade: item.localidade, uf: item.uf }
    },
    estados() {
      return estadosCache('', async () => parse(z.array(z.object({ sigla: uf, nome })).max(27), await get('IBGE', `${ESTADOS}?orderBy=nome`), 'IBGE')
        .map(m => ({ uf: m.sigla, nome: m.nome })))
    },
    async municipios(input: string) {
      const sigla = parse(uf, input)
      return municipiosCache(sigla, async () => parse(z.array(z.object({ id: ibge, nome })), await get('IBGE', `${ESTADOS}/${sigla}/municipios?orderBy=nome`), 'IBGE')
        .map(m => ({ ibge: m.id, nome: m.nome })))
    },
    async ruas(input: z.input<typeof rua>) {
      const c = parse(rua, input)
      if (c.ibge !== null && await unico(c)) {
        const { ruas, cepGeral } = await osm({ ...c, ibge: c.ibge })
        return { cepUnico: true, cepGeral, ruas: matching(ruas, c.q, 30).map(logradouro => ({ logradouro, bairro: null, cep: cepGeral, complemento: null })) }
      }
      const itens = await via(c.uf, c.cidade, c.q)
      return { cepUnico: false, cepGeral: null, ruas: itens.filter(i => i.logradouro).map(i => ({ logradouro: i.logradouro, bairro: i.bairro || null, cep: i.cep, complemento: i.complemento || null })) }
    },
    async bairros(input: z.input<typeof cidade>) {
      const c = parse(cidade, input)
      return await unico(c) ? matching((await osm(c)).bairros, c.q, 20) : []
    }
  }
}

export type EnderecosApi = ReturnType<typeof criarEnderecos>
export function registrarEnderecos(ipc: Pick<IpcMain, 'handle'>, service = criarEnderecos()) {
  ipc.handle('enderecos:cep', (_e, digits) => service.cep(digits))
  ipc.handle('enderecos:estados', () => service.estados())
  ipc.handle('enderecos:municipios', (_e, sigla) => service.municipios(sigla))
  ipc.handle('enderecos:ruas', (_e, input) => service.ruas(input))
  ipc.handle('enderecos:bairros', (_e, input) => service.bairros(input))
}
