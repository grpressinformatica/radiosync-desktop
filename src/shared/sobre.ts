export const contatos = [
  { nome: 'UaiHost', texto: 'uaihost.com.br', url: 'https://uaihost.com.br' },
  { nome: 'RadioSync', texto: 'radiosync.com.br', url: 'https://radiosync.com.br' },
  { nome: 'WhatsApp', texto: '(35) 99749-3435', url: 'https://wa.me/5535997493435' },
] as const

const site = 'https://radiosync.com.br'
export const pro = `${site}/pro`
export const planosWeb = `${site}/web#planos`
export const ecad = `${site}/ecad`
export const ferramentas = [
  { nome: 'RadioSync Studio', uso: 'Comercial e programação', descricao: 'Organize anunciantes, contratos e inserções em outro computador da rede, sem interromper o PC que está no ar.', url: `${site}/manual/studio` },
  { nome: 'RadioSync Pro Tag', uso: 'Acervo musical', descricao: 'Revise títulos, artistas e tags antes que dados incompletos cheguem ao relatório do ECAD.', url: `${site}/manual/tag` },
  { nome: 'Audio Processor', uso: 'Som da emissora', descricao: 'Equilibre o volume com ganho automático, processamento multibanda e limitador. Os presets servem de ponto de partida.', url: `${site}/manual/audio-processor` },
  { nome: 'RadioSync Player', uso: 'Transmissor', descricao: 'Receba o streaming na placa de áudio do transmissor e acompanhe alertas de silêncio.', url: `${site}/manual/player` },
  { nome: 'RadioSync Log', uso: 'Rede de emissoras', descricao: 'Veja o que foi ao ar em cada rádio, consulte o histórico e gere a comprovação para o anunciante e o relatório do ECAD.', url: `${site}/manual/log` },
] as const
export const modulos = [
  { nome: 'Sorteio & Promoções', descricao: 'Leve o cadastro, o mural de alôs e os sorteios para a equipe no navegador, com histórico de ganhadores e aniversariantes do dia.' },
  { nome: 'Jornalístico & IA', descricao: 'Acompanhe relatos e reclamações dos ouvintes e transforme atendimentos em pautas, de um flash de 15 segundos a uma matéria para o jornal.' },
  { nome: 'Bot WhatsApp com Voz', descricao: 'Receba pedidos musicais e recados pelo WhatsApp, transcreva áudios e responda com a voz da rádio. Complementa um dos módulos base.' },
] as const
export const destinosSobre = new Set<string>([...contatos.map(c => c.url), pro, planosWeb, ecad, ...ferramentas.map(f => f.url)])
