// Smoke test on the actual portable launcher, isolated from the operator's local database.

const { chromium } = require('playwright-core');

const { spawn } = require('node:child_process');

const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), net = require('node:net');

const assert = require('node:assert/strict');

const delay = ms => new Promise(r => setTimeout(r, ms));

async function main() {

  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'radiosync-smoke-'));

  const exe = path.resolve(`dist/radiosync-desktop-${require('../package.json').version}-portable.exe`);

  assert.ok(fs.existsSync(exe));

  const server = net.createServer(); await new Promise(r => server.listen(0, '127.0.0.1', r));

  const port = server.address().port; await new Promise(r => server.close(r));

  const env = {...process.env, APPDATA:profile}; delete env.ELECTRON_RUN_AS_NODE;

  const child = spawn(exe,[`--remote-debugging-port=${port}`, `--user-data-dir=${profile}`],{env,stdio:'ignore'}); child.unref();

  let browser, page;

  try {

    for(let i=0;i<90&&!browser;i++) { await delay(400); try { const url = `http://127.0.0.1:${port}`; await fetch(`${url}/json/version`); browser = await chromium.connectOverCDP(url,{timeout:3000}); } catch {} }

    assert.ok(browser, 'Janela Electron indisponível'); const ctx = browser.contexts()[0];

    page = ctx.pages()[0] || await ctx.waitForEvent('page'); page.setDefaultTimeout(10000);

    for (const height of [1024, 600, 850]) {
      await page.setViewportSize({width:1280,height});
      await page.waitForFunction(() => {
        const rail = document.querySelector('.studio-rail'), footer = rail?.querySelector('footer');
        return footer && Math.abs(rail.getBoundingClientRect().bottom - innerHeight) < 1 && Math.abs(footer.getBoundingClientRect().bottom - innerHeight) < 1;
      },null,{timeout:5000});
      console.log('Sidebar e rodapé alinhados:',height);
    }
    const go = route => page.locator(`a[href="#/${route}"]`).first().click();

    await page.waitForFunction(()=>Boolean(window.api?.promocoesSave));

    await go('sobre'); await page.getByRole('heading',{name:'Sobre o RadioSync Desktop'}).waitFor();
    for (const text of ['uaihost.com.br','radiosync.com.br','(35) 99749-3435']) await page.getByText(text,{exact:true}).waitFor();
    for (const title of ['RadioSync Pro','RadioSync Studio','RadioSync Pro Tag','Audio Processor','RadioSync Player','RadioSync Log','RadioSync Web']) await page.getByRole('heading',{name:title,exact:true}).waitFor();
    await page.getByRole('link',{name:'Testar meu arquivo .exp'}).waitFor();
    const campaign = await page.evaluate(()=>window.api.promocoesSave({nome:'Promoção de teste',inicio:'2026-01-01',fim:'2030-01-01',status:'ativa'}));

    await page.reload(); await go('ouvintes'); await page.getByRole('button',{name:'Novo Ouvinte'}).click();

    const dialog = page.getByRole('dialog'); await dialog.locator('input').first().fill('Ouvinte de teste');

    if (process.argv.includes('--endereco-online')) {
      await page.locator('#endereco-cep').fill('01001-000');
      await page.locator('#endereco-numero').focus();
      await page.waitForFunction(()=>document.querySelector('#endereco-cidade')?.value === 'São Paulo' && document.querySelector('#endereco-rua')?.value === 'Praça da Sé',null,{timeout:25000});
      assert.equal(await page.locator('#endereco-uf').inputValue(),'SP');
      const ibge = await page.evaluate(async () => ({
        estados: (await window.api.enderecos.estados()).length,
        saoPaulo: (await window.api.enderecos.municipios('SP')).some(m=>m.ibge === 3550308)
      }));
      assert.equal(ibge.estados,27); assert.equal(ibge.saoPaulo,true);
      console.log('OK: formulário do portátil, CEP público ViaCEP e listas reais do IBGE.');
    }
    await page.locator('#participar').click(); await page.getByRole('option',{name:'Sim',exact:true}).click();

    await page.locator('#promocao-cadastro').click(); await page.getByRole('option',{name:'Promoção de teste'}).click();

    await dialog.getByRole('button',{name:'Salvar',exact:true}).click(); await dialog.waitFor({state:'hidden'});

    assert.equal((await page.evaluate(()=>window.api.participacoesList()))[0].id_promocao,campaign.id);

    await go('mural'); await page.getByText('Ouvinte de teste',{exact:true}).first().waitFor();

    await page.getByRole('button',{name:/marcar.*lid/i}).first().click();

    await page.waitForFunction(async()=>Number((await window.api.participacoesList())[0].lida)===1);

    await page.evaluate(id=>window.api.sorteioRealizar(id,1),campaign.id);

    await go('historico'); await page.getByText('Ouvinte de teste',{exact:true}).first().waitFor();

    assert.equal((await page.evaluate(()=>window.api.ganhadoresList()))[0].nome,'Ouvinte de teste');

    await page.locator('label').filter({hasText: /^Promoções$/}).click(); await page.locator('summary').filter({hasText:'Promoção de teste'}).click();

    await page.getByRole('heading',{name:'Ganhadores',exact:true}).waitFor();

    await page.locator('label').filter({hasText: /^Sorteios$/}).click(); await page.getByText('Ouvinte de teste',{exact:true}).waitFor();

    assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');

    await page.getByRole('button',{name:'Tema claro'}).click(); await page.reload();

    assert.equal(await page.locator('html').getAttribute('data-theme'),'light');

    assert.equal(await page.locator('img[alt="RadioSync"]').evaluate(img=>img.complete && img.naturalWidth>0),true);

    await go('participacoes'); await page.getByRole('button',{name:/Avulso/}).click();
    await page.getByPlaceholder('Nome do ouvinte').fill('Ouvinte avulso'); await page.locator('textarea').fill('Alô para o estúdio');
    await page.getByRole('button',{name:'Registrar Participação',exact:true}).click();
    await page.getByRole('link',{name:'Abrir mural do locutor'}).click(); await page.getByText('Alô para o estúdio',{exact:true}).waitFor();
    await page.getByRole('button',{name:/marcar.*lid/i}).first().click(); await go('historico');
    await page.getByText('Alô para o estúdio',{exact:true}).waitFor();
    console.log('OK: portátil, cadastro + inscrição, mural + marcação de leitura, histórico e ganhador.');

  } finally { if(page) await page.evaluate(()=>setTimeout(()=>window.close(),100)).catch(()=>{}); if(browser) await browser.close().catch(()=>{}); }

}

main().catch(e=>{console.error(e);process.exitCode=1});

