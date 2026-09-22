import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { stripTypeScriptTypes } from 'node:module';
import { runInNewContext } from 'node:vm';
import { createHash, createCipheriv, createDecipheriv, randomUUID } from 'node:crypto';

// Test adapter for CryptoJS's existing OpenSSL passphrase format. No dependency
// is downloaded or executed. This is not a test of CryptoJS itself.
function keyAndIV(password, salt) {
  let derived = Buffer.alloc(0), block = Buffer.alloc(0);
  while (derived.length < 48) {
    block = createHash('md5').update(Buffer.concat([block, Buffer.from(password), salt])).digest();
    derived = Buffer.concat([derived, block]);
  }
  return [derived.subarray(0, 32), derived.subarray(32, 48)];
}
export const cryptoAdapter = {
  enc: { Utf8: 'utf8' },
  AES: {
    encrypt(text, password) {
      // Deterministic only in tests, so invalid-password cases are reproducible.
      const salt = createHash('sha256').update(JSON.stringify([text, password])).digest().subarray(0, 8);
      const [key, iv] = keyAndIV(password, salt);
      const cipher = createCipheriv('aes-256-cbc', key, iv);
      const bytes = Buffer.concat([Buffer.from('Salted__'), salt, cipher.update(text, 'utf8'), cipher.final()]);
      return { toString: () => bytes.toString('base64') };
    },
    decrypt(text, password) {
      return { toString() {
        if (!text) return '';
        const bytes = Buffer.from(text, 'base64');
        const [key, iv] = keyAndIV(password, bytes.subarray(8, 16));
        const decipher = createDecipheriv('aes-256-cbc', key, iv);
        // CryptoJS does not validate PKCS#7 padding: mimic its removal here.
        decipher.setAutoPadding(false);
        const plain = Buffer.concat([decipher.update(bytes.subarray(16)), decipher.final()]);
        const size = plain.length - plain[plain.length - 1];
        if (size <= 0) return '';
        return new TextDecoder('utf-8', { fatal: true }).decode(plain.subarray(0, size));
      } };
    },
  },
};
export function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
export function firstValueFrom(observable) {
  return new Promise((resolve, reject) => observable.subscribe(resolve, reject));
}
export function response(value) {
  return { subscribe(next) { next(value); return { unsubscribe() {} }; } };
}
export function pendingResponse() {
  let next, error;
  const state = { cancelled: false };
  return {
    observable: { subscribe(n, e) { next = n; error = e; return { unsubscribe() { state.cancelled = true; } }; } },
    // Deliberately deliver after unsubscribe too, to test the entry-version guard.
    deliver: value => next(value), fail: err => error(err), state,
  };
}
export const translations = { allTranslations: new Proxy({}, { get: (_, key) => String(key) }) };
export function alerts() {
  const messages = [];
  return { messages, controller: { create: async options => ({ present: async () => { messages.push(options); } }) } };
}
export const router = { getCurrentNavigation: () => null, navigate: async () => true, navigateByUrl: async () => true };

function readSource(file) {
  return process.env.STELLAR_TEST_BASELINE === 'HEAD'
    ? execFileSync('git', ['show', `HEAD:${file}`], { encoding: 'utf8' })
    : readFileSync(file, 'utf8');
}

export function loadPage(name, overrides = {}) {
  const paths = { HomePage: 'home/home.page.ts', ViewPage: 'secret/view/view.page.ts', CreatedPage: 'secret/created/created.page.ts' };
  const models = ['Secret', 'SecretFile'].map((model, index) => {
    const file = index ? 'secretfile' : 'secret';
    return readSource(`src/app/models/${file}.ts`).replace(/^import .*;\r?\n/gm, '').replace(`export class ${model}`, `class ${model}`);
  }).join('\n');
  const source = readSource(`src/app/${paths[name]}`)
    .replace(/^import .*;\r?\n/gm, '')
    .replace(/@Component\(\{[\s\S]*?\}\)\s*/, '')
    .replace(/@HostListener\([^\n]+\)\s*/g, '')
    .replace('@Inject(PLATFORM_ID) ', '')
    .replace(`export class ${name}`, `class ${name}`);
  const timers = new Map(); let serial = 0;
  const history = { state: {} };
  const context = {
    CryptoJS: cryptoAdapter, firstValueFrom,
    Capacitor: { getPlatform: () => 'web', isNativePlatform: () => false },
    Haptics: { impact: async () => {} }, ImpactStyle: { Light: 1, Medium: 2 },
    isPlatformBrowser: value => value === 'browser',
    sha512: value => createHash('sha512').update(value).digest('hex'), uuid: randomUUID,
    window: { history, location: { origin: 'https://example.test' } }, history,
    document: { getElementsByTagName: () => [{ href: 'https://example.test/' }] },
    navigator: { clipboard: { writeText: async () => {} } },
    ConfirmationModalComponent: class {},
    setTimeout: (fn, ms) => { const id = ++serial; timers.set(id, { fn, ms, interval: false }); return id; },
    clearTimeout: id => timers.delete(id),
    setInterval: (fn, ms) => { const id = ++serial; timers.set(id, { fn, ms, interval: true }); return id; },
    clearInterval: id => timers.delete(id),
    ...overrides,
  };
  const Page = runInNewContext(stripTypeScriptTypes(models + '\n' + source, { mode: 'transform' }) + '\n' + name, context);
  return { Page, timers, history };
}
export function homeFactory(options = {}) {
  const loaded = loadPage('HomePage', options.context);
  const a = alerts();
  const page = new loaded.Page({}, a.controller, options.router || router, options.api || { create: () => response({}) },
    { setDefaultLang() {} }, translations, { is: () => false });
  return { ...loaded, page, alerts: a.messages };
}
export function viewFactory(options = {}) {
  const loaded = loadPage('ViewPage', options.context);
  const a = alerts();
  const route = { params: { subscribe(cb) { cb({ id: options.id || 'test-secret' }); return { unsubscribe() {} }; } } };
  const page = new loaded.Page('browser', options.router || router, {}, a.controller, {}, route,
    options.api || { view: () => response({}) }, translations, { detectChanges() {} });
  page.ionViewWillEnter();
  return { ...loaded, page, alerts: a.messages };
}
export function createdFactory(options = {}) {
  const loaded = loadPage('CreatedPage', options.context);
  const page = new loaded.Page('browser', options.router || router, options.modal || {}, options.api || {}, options.loading || {}, translations);
  return { ...loaded, page };
}
export const encrypt = (text, key) => cryptoAdapter.AES.encrypt(text, key).toString();
export const decrypt = (text, key) => cryptoAdapter.AES.decrypt(text, key).toString();
