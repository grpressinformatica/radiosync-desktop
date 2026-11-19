// Node 22.18+ (native TypeScript stripping). No Electron window or external network.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { criarEnderecos, registrarEnderecos } = require('../src/main/enderecos.ts')

const city = { uf: 'MG', cidade: 'Bambuí', ibge: 3105103 }
const item = { cep: '38900-000', logradouro: 'Rua São José', bairro: 'Centro', complemento: 'lado par' }
const sample = Array(10).fill(item)
const search = q => `https://viacep.com.br/ws/MG/Bambu%C3%AD/${encodeURIComponent(q)}/json/`
function fixture(replies) {
  const calls = [], handlers = new Map()
  const service = criarEnderecos(async (url, init) => {
    const index = calls.push({ url, init }) - 1
    if (!(index in replies)) throw Error('Unexpected request')
    const reply = replies[index]
    if (reply instanceof Error) throw reply
    return reply instanceof Response ? reply : Response.json(reply)
  })
  registrarEnderecos({ handle: (channel, handler) => handlers.set(channel, handler) }, service)
  return { calls, invoke: (method, value) => handlers.get(`enderecos:${method}`)({}, value) }
}

test('CEP distinguishes valid address, unknown CEP and service failure', async () => {
  const { calls, invoke } = fixture([{ ...item, localidade: 'Bambuí', uf: 'MG' }, { erro: 'true' }, new Error('offline'), {}])
  assert.deepEqual(await invoke('cep', '38900000'), { cep: item.cep, endereco: item.logradouro, bairro: 'Centro', cidade: 'Bambuí', uf: 'MG' })
  assert.equal(await invoke('cep', '38900001'), null)
  await assert.rejects(invoke('cep', '38900002'), /ViaCEP indisponível/)
  await assert.rejects(invoke('cep', '38900003'), /Resposta inválida do ViaCEP/)
  assert.equal(calls[0].url, 'https://viacep.com.br/ws/38900000/json/')
  for (const { init } of calls) { assert.equal(init.redirect, 'error'); assert.ok(init.signal instanceof AbortSignal) }
})

test('IBGE states and municipalities use fixed paths and share successful lookups', async () => {
  const { calls, invoke } = fixture([[{ sigla: 'MG', nome: 'Minas Gerais' }], [{ id: city.ibge, nome: city.cidade }]])
  assert.deepEqual(await invoke('estados'), [{ uf: 'MG', nome: 'Minas Gerais' }]); await invoke('estados')
  const [a, b] = await Promise.all(['MG', 'mg'].map(s => invoke('municipios', s)))
  assert.deepEqual(a, [{ ibge: city.ibge, nome: city.cidade }]); assert.deepEqual(a, b)
  assert.deepEqual(calls.map(c => c.url), ['https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome', 'https://servicodados.ibge.gov.br/api/v1/localidades/estados/MG/municipios?orderBy=nome'])
})

test('multi-CEP uses ViaCEP; empty results are not failures; null IBGE skips classification', async () => {
  const { calls, invoke } = fixture([sample, [item], [], new Response(null, { status: 503 })])
  const ruas = q => invoke('ruas', { ...city, q })
  assert.deepEqual(await ruas('São José'), { cepUnico: false, cepGeral: null, ruas: [item] })
  assert.deepEqual(await invoke('bairros', { ...city, q: '' }), [])
  assert.deepEqual((await ruas('Nada')).ruas, [])
  await assert.rejects(ruas('Outra'), /ViaCEP indisponível/)
  assert.deepEqual(calls.map(c => c.url), ['Rua', 'São José', 'Nada', 'Outra'].map(search))
  const fallback = fixture([[item]])
  assert.deepEqual((await fallback.invoke('ruas', { ...city, ibge: null, q: 'São José' })).ruas, [item])
  assert.deepEqual(fallback.calls.map(c => c.url), [search('São José')])
})

test('single-CEP shares Overpass fallback, filters accents/words and removes duplicate streets and city label', async () => {
  const elements = [
    { type: 'relation', tags: { postal_code: item.cep } },
    ...[item.logradouro, item.logradouro, 'Rua do Sol'].map(name => ({ type: 'way', tags: { highway: 'residential', name } })),
    ...['Bambui', 'São Vicente', 'Centro'].map(name => ({ type: 'node', tags: { place: 'suburb', name } }))
  ]
  const { calls, invoke } = fixture([[], { remark: 'timeout', elements: [] }, new Response(null, { status: 429 }), { elements }])
  const [ruas, bairros] = await Promise.all([invoke('ruas', { ...city, q: 'jose sao' }), invoke('bairros', { ...city, q: 'sao' })])
  assert.deepEqual(ruas, { cepUnico: true, cepGeral: item.cep, ruas: [{ logradouro: item.logradouro, cep: item.cep, bairro: null, complemento: null }] })
  assert.deepEqual(bairros, ['São Vicente'])
  assert.deepEqual(await invoke('bairros', { ...city, q: '' }), ['Centro', 'São Vicente'])
  assert.equal(calls.length, 4)
  assert.equal(calls[1].url, 'https://overpass-api.de/api/interpreter')
  assert.equal(calls[2].url, 'https://maps.mail.ru/osm/tools/overpass/api/interpreter')
  assert.equal(calls[3].url, 'https://overpass.private.coffee/api/interpreter')
  assert.equal(calls[2].init.method, 'POST'); assert.match(calls[2].init.body.get('data'), /IBGE:GEOCODIGO"="3105103/)
  assert.doesNotMatch(calls[2].init.body.get('data'), /jose sao/i)
})

test('classification and OSM failures are retriable, not classified as empty results', async () => {
  const { invoke, calls } = fixture([{}, [], new Error(), {}, new Error(), { elements: [] }])
  const ruas = () => invoke('ruas', { ...city, q: 'Rua' })
  await assert.rejects(ruas(), /ViaCEP/); await assert.rejects(ruas(), /Overpass/)
  assert.deepEqual(await ruas(), { ruas: [], cepUnico: true, cepGeral: null }); assert.equal(calls.length, 6)
})

test('main rejects malformed or oversized IPC input before network access', async () => {
  const { calls, invoke } = fixture([])
  for (const [method, input] of [['cep', '38900-000'], ['municipios', 'XX'], ['ruas', { ...city, q: 'ab' }],
    ['ruas', { ...city, q: 'abc', cidade: '..' }], ['ruas', { ...city, q: 'a'.repeat(81) }],
    ['ruas', { ...city, q: 'abc', cidade: 'x'.repeat(101) }], ['ruas', { ...city, q: 'a/b' }],
    ['bairros', { ...city, q: '', ibge: null }], ['bairros', { ...city, q: '', ibge: '123;out;' }]]) {
    await assert.rejects(invoke(method, input), /Parâmetros/)
  }
  assert.equal(calls.length, 0)
})
