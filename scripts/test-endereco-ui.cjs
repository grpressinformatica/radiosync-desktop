// Executa a interface compilada em Chromium com provedores simulados, sem enviar endereços à rede.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright-core');

async function main() {
  const executablePath = [process.env.CHROMIUM_PATH, process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, 'Google/Chrome/Application/chrome.exe'), process.env['ProgramFiles(x86)'] && path.join(process.env['ProgramFiles(x86)'], 'Microsoft/Edge/Application/msedge.exe')].find(x=>x && fs.existsSync(x));
  const browser = await chromium.launch({ executablePath, headless:true, args:['--allow-file-access-from-files'] });
  try {
    const page = await browser.newPage(); page.setDefaultTimeout(5000);
    await page.addInitScript(()=>{
      window.saved = [];
      window.api = {ouvintesList: async()=>window.saved, promocoesList: async()=>[], ouvintesSave: async data=>{window.saved.push({...data,id:1}); return {id:1}}, enderecos:{
        estados:async()=>[{uf:'SP',nome:'São Paulo'}], municipios:async()=>[{ibge:3550308,nome:'São Paulo'}],
        cep:async codigo=>{await new Promise(r=>setTimeout(r,220)); if(codigo==='99999999')throw Error('Sem conexão'); return {cep:'01001-000',endereco:'Praça da Sé',bairro:'Sé',cidade:'São Paulo',uf:'SP'}},
        ruas:async()=>({ruas:[{logradouro:'Rua de Teste',bairro:null,cep:'01001-000',complemento:null}],cepUnico:true,cepGeral:'01001-000'}),bairros:async()=>['Centro']
      }};
    });
    await page.goto(pathToFileURL(path.resolve('out/renderer/index.html')).href);
    await page.getByRole('button',{name:'Novo Ouvinte'}).click(); const dialog=page.getByRole('dialog');
    await dialog.locator('input').first().fill('Teste local');
    const cep=page.locator('#endereco-cep'), rua=page.locator('#endereco-rua'), numero=page.locator('#endereco-numero');
    await cep.fill('01001-000'); await numero.focus();
    await page.waitForFunction(()=>document.querySelector('#endereco-rua').value==='Praça da Sé');
    assert.equal(await page.locator('#endereco-cidade').inputValue(),'São Paulo');
    await page.locator('#endereco-cidade').fill('sao pau'); await page.getByRole('option',{name:'São Paulo',exact:true}).click();
    await rua.fill('Tes'); await page.locator('#endereco-rua-lista [role=option]').first().click();
    assert.equal(await rua.inputValue(),'Rua de Teste');
    await page.locator('#endereco-bairro').fill('Cen'); await page.locator('#endereco-bairro-lista [role=option]').first().click();
    assert.equal(await page.locator('#endereco-bairro').inputValue(),'Centro');
    await page.locator('#endereco-salvar-padrao').click();
    await page.context().setOffline(true); await page.waitForFunction(()=>!navigator.onLine);
    await cep.fill('99999-999'); await numero.focus(); await page.getByText(/Não foi possível consultar o CEP/).waitFor(); await rua.fill('Rua escrita sem internet');
    await numero.fill('25'); await dialog.getByRole('button',{name:'Salvar',exact:true}).click();
    await dialog.waitFor({state:'hidden'});
    assert.equal(await page.evaluate(()=>window.saved[0].endereco),'Rua escrita sem internet');
    await page.getByRole('button',{name:'Novo Ouvinte'}).click(); assert.equal(await page.locator('#endereco-cidade').inputValue(),'São Paulo');
    console.log('OK: CEP preenche o formulário; o cadastro aceita endereço manual mesmo com falha no provedor.');
  } finally { await browser.close(); }
}
main().catch(e=>{console.error(e);process.exitCode=1});
