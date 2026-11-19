// Usage on Linux: node scripts/test-linux.cjs /absolute/path/to/executable
const { _electron } = require('playwright-core');
const { mkdtempSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
async function test() {
  const profile = mkdtempSync(path.join(tmpdir(), 'radiosync-linux-'));
  const csv = path.join(profile, 'ouvintes.csv');
  writeFileSync(csv, 'Nome,Telefone,CPF,Nascimento,Cidade,UF\n"Ouvinte Linux","00123456789","","","Arcos","MG"\n');
  for (let pass = 0; pass < 2; pass++) {
    const app = await _electron.launch({ executablePath: path.resolve(process.argv[2]), args:[`--user-data-dir=${profile}`], timeout:25000 });
    try {
      const page = await app.firstWindow(); await page.locator('a[href="#/ouvintes"]').click();
      await page.getByRole('button',{name:'Novo Ouvinte'}).waitFor();
      if (!pass) {
        const names = await page.evaluate(async file => {
          await window.api.csvImportOuvintes(file);
          const [o] = await window.api.ouvintesList();
          const p = await window.api.promocoesSave({ nome:'Teste Linux',inicio:'2026-01-01',fim:'2030-12-31',status:'ativa' });
          await window.api.participacoesRegister({id_ouvinte:o.id,id_promocao:p.id});
          return (await window.api.sorteioRealizar(p.id,1)).map(x=>x.nome);
        },csv); assert.deepEqual(names,['Ouvinte Linux']);
      } else {
        assert.deepEqual(await page.evaluate(async()=>[(await window.api.ouvintesList())[0].telefone,(await window.api.ganhadoresList())[0].nome]),['00123456789','Ouvinte Linux']);
      }
    } finally { await app.close(); }
  }
  console.log('OK: interface, CSV, inscrição, sorteio e histórico após reabrir:',process.argv[2]);
} test().catch(e=>{console.error(e);process.exitCode=1});
