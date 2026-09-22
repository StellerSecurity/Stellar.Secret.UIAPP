import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { stripTypeScriptTypes } from 'node:module';
import { runInNewContext } from 'node:vm';
import assert from 'node:assert/strict';

const file = 'src/app/secret/created/created.page.ts';
const baseline = execFileSync('git', ['show', `HEAD:${file}`], {encoding:'utf8'});
const changed = readFileSync(file, 'utf8');

// Execute the actual page class, replacing only framework imports/decorators.
// This tests lifecycle state handling, not the Angular renderer or Ionic router.
function load(source, native = true, platform = 'browser') {
  const clean = source.replace(/^import .*;\r?\n/gm, '')
    .replace(/@Component\(\{[\s\S]*?\}\)\s*/, '')
    .replace('@Inject(PLATFORM_ID) ', '')
    .replace('export class CreatedPage', 'class CreatedPage');
  const js = stripTypeScriptTypes(clean, {mode:'transform'});
  const history = {state:{}};
  let copied = null;
  const context = {
    Secret: class {}, Capacitor:{isNativePlatform:()=>native},
    isPlatformBrowser:p=>p === 'browser', history,
    window:{history, location:{origin:'https://example.test'}},
    document:{getElementsByTagName:()=>[{href:'https://example.test/'}]},
    navigator:{clipboard:{writeText:async value=>{copied=value;}}},
    Haptics:{impact:async()=>{}}, ImpactStyle:{Light:'light'},
    setTimeout:()=>0,
  };
  const Page = runInNewContext(js+'\nCreatedPage;', context);
  let navigation = null;
  const redirects = [];
  const router = {getCurrentNavigation:()=>navigation, navigate:async path=>{redirects.push(path);return true;}};
  const page = new Page(platform, router, {}, {}, {}, {});
  return {page, history, redirects, getCopied:()=>copied,
    navigate:id=>{navigation={extras:{state:{id}}};},
    finish:()=>{navigation=null;}, enter:()=>page.ionViewWillEnter?.()};
}

const old = load(baseline);
old.enter();
old.navigate('new-secret');
old.enter();
assert.equal(old.page.url, '');
assert.equal(old.redirects.length, 1);
console.log('BEFORE: reproduced cached-empty-page failure (new id never read).');

let checks=0;
for (const native of [true,false]) {
  const state=load(changed,native);
  const base=native?'https://stellarsecret.io/':'https://example.test/';
  for(let i=0;i<1000;i++) {
    state.finish(); state.history.state={}; state.enter();
    assert.equal(state.page.url,'');
    const id=`secret-${i}`;
    state.navigate(id); state.enter();
    assert.equal(state.page.id,id);
    assert.equal(state.page.url,base+id);
    await state.page.handleCopy({});
    assert.equal(state.getCopied(),base+id);
    state.history.state={id}; state.finish(); state.enter();
    assert.equal(state.page.url,base+id);
    checks++;
  }
}
const ssr=load(changed,true,'server'); ssr.enter();
assert.equal(ssr.redirects.length,0);
assert.equal(ssr.page.url,'');
console.log(`AFTER: ${checks} cached-page recovery cycles passed, including URL, copy and history fallback; server guard passed.`);
