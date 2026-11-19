// Gera as capturas reais das telas em docs/screenshots.
// Usa a interface compilada em Chromium com a API local simulada, para o
// repositório não depender de um banco real nem de rede.
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright-core');

const OUT = path.resolve('docs/screenshots');

const agora = new Date();
const iso = (d) => d.toISOString().slice(0, 10);
const daqui = (dias) => { const d = new Date(); d.setDate(d.getDate() + dias); return iso(d); };

const ouvintes = [
  { id: 1, nome: 'Fulano de Tal', telefone: '(**) *****-0001', cpf: '***.***.***-**', data_nascimento: `${agora.getFullYear() - 33}-${String(agora.getMonth() + 1).padStart(2, '0')}-10`, cep: '01001-000', endereco: 'Rua Exemplo', numero: '100', bairro: 'Centro', cidade: 'São Paulo', uf: 'SP' },
  { id: 2, nome: 'Ciclana de Tal', telefone: '(**) *****-0002', cpf: '***.***.***-**', data_nascimento: '1988-07-22', cep: '01002-000', endereco: 'Av. Fictícia', numero: '200', bairro: 'Centro', cidade: 'São Paulo', uf: 'SP' },
  { id: 3, nome: 'Beltrano Silva', telefone: '(**) *****-0003', cpf: '', data_nascimento: '1995-11-03', cep: '01003-000', endereco: 'Rua Ilustrativa', numero: '300', bairro: 'Vila Demo', cidade: 'Guarulhos', uf: 'SP' },
  { id: 4, nome: 'Fulana Souza', telefone: '(**) *****-0004', cpf: '***.***.***-**', data_nascimento: '1979-02-18', cep: '01001-000', endereco: 'Rua Exemplo', numero: '400', bairro: 'Centro', cidade: 'São Paulo', uf: 'SP' },
  { id: 5, nome: 'Ciclano Pereira', telefone: '(**) *****-0005', cpf: '', data_nascimento: '2001-05-28', cep: '01003-000', endereco: 'Av. Fictícia', numero: '500', bairro: 'Vila Demo', cidade: 'Guarulhos', uf: 'SP' },
];

const promocoes = [
  { id: 1, nome: 'Prêmio Pão de Açúcar', inicio: daqui(-10), fim: daqui(6), status: 'ativa', permite_multipla_participacao: 0, qtd_ganhadores: 1 },
  { id: 2, nome: 'Show de Música Gospel', inicio: daqui(-5), fim: daqui(21), status: 'ativa', permite_multipla_participacao: 1, qtd_ganhadores: 2 },
  { id: 3, nome: 'Festival Junino 2026', inicio: daqui(-40), fim: daqui(-2), status: 'encerrada', permite_multipla_participacao: 0, qtd_ganhadores: 1 },
];

const participacoes = [
  { id: 1, nome: 'Fulano de Tal', promocao: 'Prêmio Pão de Açúcar', musica: 'Evidências', mensagem: 'Dedico essa música para toda a família!', data: `${agora.toISOString().slice(0, 10)} 08:14:00`, lida: 0, id_promocao: 1 },
  { id: 2, nome: 'Ciclana de Tal', promocao: 'Prêmio Pão de Açúcar', musica: 'Música Exemplo', mensagem: '', data: `${agora.toISOString().slice(0, 10)} 09:02:00`, lida: 0, id_promocao: 1 },
  { id: 3, nome: 'Beltrano Silva', promocao: 'Show de Música Gospel', musica: 'Canção Fictícia', mensagem: 'Um abraço para todos os ouvintes!', data: `${agora.toISOString().slice(0, 10)} 07:45:00`, lida: 1, id_promocao: 2 },
  { id: 4, nome: 'Fulana Souza', promocao: 'Festival Junino 2026', musica: 'Quadrinha', mensagem: 'Arraiá da rádio!', data: `${agora.toISOString().slice(0, 10)} 06:30:00`, lida: 0, id_promocao: 3 },
  { id: 5, nome: 'Ciclano Pereira', promocao: null, musica: 'Mais uma vez', mensagem: 'Bom dia, ótima programação!', data: `${agora.toISOString().slice(0, 10)} 10:20:00`, lida: 0, id_promocao: null },
];

const ganhadores = [
  { id: 1, nome: 'Fulana Souza', promocao: 'Festival Junino 2026', data_sorteio: `${agora.toISOString().slice(0, 10)} 11:00:00`, id_promocao: 3, telefone: '(**) *****-0004' },
  { id: 2, nome: 'Beltrano Silva', promocao: 'Show de Música Gospel', data_sorteio: `${agora.toISOString().slice(0, 10)} 12:30:00`, id_promocao: 2, telefone: '(**) *****-0003' },
];

function mockApi(dados) {
  const { ouvintes, promocoes, participacoes, ganhadores } = dados;
  const api = {
    dashboardStats: async () => ({ ouvintes: 1287, promocoes: 2, pendentes: 3, ganhadores: 2 }),
    dashboardAniversariantes: async () => [
      { nome: 'Fulano de Tal', telefone: '(**) *****-0001' },
      { nome: 'Ciclana de Tal', telefone: '(**) *****-0002' },
    ],
    dashboardPromocoesAtivas: async () => [
      { nome: 'Prêmio Pão de Açúcar', dias: 6 },
      { nome: 'Show de Música Gospel', dias: 21 },
    ],
    ouvintesList: async () => ouvintes,
    ouvintesSave: async () => ({ id: 1 }),
    ouvintesDelete: async () => true,
    promocoesList: async () => promocoes,
    promocoesSave: async () => ({ id: 1 }),
    promocoesDelete: async () => true,
    participacoesList: async () => participacoes,
    participacaoMarcarLida: async () => true,
    participacoesRegister: async () => ({ id: 1 }),
    participacoesCountByPromocao: async () => [
      { id_promocao: 1, total: 2 },
      { id_promocao: 2, total: 1 },
      { id_promocao: 3, total: 1 },
    ],
    ganhadoresList: async () => ganhadores,
    sorteioRealizar: async () => [],
    csvImportOuvintes: async () => ({ imported: 0, updated: 0, errors: [] }),
    csvExportOuvintes: async () => ({ count: ouvintes.length }),
    dialogOpenFile: async () => null,
    dialogSaveFile: async () => null,
    abrirContato: async () => {},
    enderecos: {
      estados: async () => [{ uf: 'MG', nome: 'Minas Gerais' }],
      municipios: async () => [{ ibge: 3100300, nome: 'Arcos' }],
      cep: async () => null,
      ruas: async () => ({ ruas: [], cepUnico: false, cepGeral: null }),
      bairros: async () => [],
    },
  };
  window.api = api;
  window.__mock = api;
}

module.exports = { mockApi, ouvintes, promocoes, participacoes, ganhadores };

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const executablePath = [
    process.env.CHROMIUM_PATH,
    process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, 'Google/Chrome/Application/chrome.exe'),
    process.env['ProgramFiles(x86)'] && path.join(process.env['ProgramFiles(x86)'], 'Microsoft/Edge/Application/msedge.exe'),
  ].find(x => x && fs.existsSync(x));
  const browser = await chromium.launch({ executablePath, headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
  await page.addInitScript(mockApi, { ouvintes, promocoes, participacoes, ganhadores });
  const base = process.env.RENDERER_URL || 'http://127.0.0.1:4173';
  const shots = [
    ['dashboard', '#/dashboard'],
    ['ouvintes', '#/ouvintes'],
    ['promocoes', '#/promocoes'],
    ['participacoes', '#/participacoes'],
    ['sorteio', '#/sorteio'],
    ['mural', '#/mural'],
    ['historico', '#/historico'],
    ['sobre', '#/sobre'],
  ];
  for (const [nome, rota] of shots) {
    await page.goto(base + rota);
    await page.waitForTimeout(1800);
    const arquivo = path.join(OUT, `${nome}.png`);
    await page.screenshot({ path: arquivo });
    console.log('OK', nome, '->', path.relative(process.cwd(), arquivo));
  }
  await browser.close();
}

if (require.main === module) main().catch(e => { console.error(e); process.exitCode = 1; });
