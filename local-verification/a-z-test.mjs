import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { homeFactory, viewFactory, createdFactory, response, router } from './test-support.mjs';

// Controller-level A-Z integration. Actual application classes, in-memory API,
// OpenSSL-compatible Node crypto adapter, simulated router/lifecycle and DOM IO.
// This does NOT replace an Angular/Ionic browser test.
const digest = value => createHash('sha512').update(value).digest('hex');
const message = 'A-Z test: æøå 🔐\nsecond line';
const file = 'data:text/plain;base64,QS1aIGZpbGU=';

function backend() {
  const records = new Map(); let creates = 0, reads = 0, burns = 0;
  return { records, counts: () => ({ creates, reads, burns }), api: {
    create(payload) { creates++; records.set(payload.id, structuredClone(payload)); return response({ response_code: 200 }); },
    view(id) {
      reads++; const key = digest(id), payload = records.get(key); records.delete(key);
      return response(payload ? { ...structuredClone(payload), response_code: 200 } : { response_code: 404 });
    },
    delete(id) { burns++; records.delete(digest(id)); return response({ response_code: 200 }); },
  } };
}

for (const password of ['', 'correct synthetic passphrase']) {
  for (const shape of ['text', 'file', 'both']) {
    test(`A-Z ${password ? 'password' : 'link-key'} / ${shape}: create, share, open once, copy/download, leave`, async () => {
      const server = backend(); let navigation, linkCopied, messageCopied, downloaded;
      const r = { ...router, getCurrentNavigation: () => navigation,
        navigate: async (path, options) => { navigation = { extras: options || {} }; return true; } };
      const created = createdFactory({ router: r, api: server.api, context: { navigator: { clipboard: { writeText: async text => { linkCopied = text; } } } } });
      // Reproduce the original cached empty page before creating the new secret.
      created.page.ionViewWillEnter(); assert.equal(created.page.url, '');
      const home = homeFactory({ router: r, api: server.api });
      home.page.addSecretModal.message = shape === 'file' ? '' : message;
      home.page.addSecretModal.password = password; home.page.chosenBurnerTime = 1;
      home.page.secretFiles = shape === 'text' ? [] : [{ name: 'audit.txt', content: file }];
      await home.page.createLink(); assert.equal(server.counts().creates, 1);
      created.page.ionViewWillEnter();
      const id = created.page.id;
      assert.match(id, /^[a-f0-9-]{36}$/); assert.equal(created.page.url, 'https://example.test/' + id);
      const stored = server.records.get(digest(id));
      assert.equal(stored.has_password, !!password); assert.equal('password' in stored, false);
      assert.equal(stored.expires_at, '1');
      if (shape !== 'file') assert.notEqual(stored.message, message);
      if (shape !== 'text') assert.notEqual(stored.files[0].content, file);
      await created.page.handleCopy({}); assert.equal(linkCopied, created.page.url);
      // Simulate completed navigation and reload with the same history state.
      created.history.state = { id }; navigation = null; created.page.ionViewWillEnter();
      assert.equal(created.page.url, linkCopied);
      created.page.ionViewWillLeave();

      const viewed = viewFactory({ id, api: server.api, context: { navigator: { clipboard: { writeText: async text => { messageCopied = text; } } } } });
      viewed.page.toastController = { create: async () => ({ present: async () => {} }) };
      await viewed.page.loadSecret(); assert.equal(server.records.size, 0);
      if (password) {
        assert.equal(viewed.page.unlocked, false);
        viewed.page.inputPassword = 'wrong'; await viewed.page.unlockByPassword();
        assert.equal(viewed.page.unlocked, false); assert.equal(viewed.alerts.length, 1);
        viewed.page.inputPassword = password; await viewed.page.unlockByPassword();
      }
      assert.equal(viewed.page.unlocked, true);
      assert.equal(viewed.page.secretModel.message, shape === 'file' ? '' : message);
      await viewed.page.copy(); assert.equal(messageCopied, shape === 'file' ? '' : message);
      if (shape !== 'text') {
        viewed.page.alertController = { create: async () => ({ present: async () => {}, onDidDismiss: async () => ({ role: 'confirm' }) }) };
        viewed.page.loadingCtrl = { create: async () => ({ present: async () => {}, dismiss: async () => {} }) };
        viewed.page.base64ToFile = (content, mime, filename) => { downloaded = { content, mime, filename }; };
        await viewed.page.downloadAttachedFile();
        assert.equal(downloaded.content, file); assert.equal(downloaded.mime, 'text/plain');
      }
      viewed.page.ionViewWillLeave();
      assert.equal(viewed.page.secretModel.message, ''); assert.equal(viewed.page.secretModel.files.length, 0);
      assert.equal(viewed.timers.size, 0);
      const reopened = viewFactory({ id, api: server.api }); await reopened.page.loadSecret();
      await new Promise(setImmediate);
      assert.equal(reopened.page.unlocked, false);
      assert.equal(reopened.alerts[0].message, 'THE_SECRET_LINK_DOES_NOT_EXIST_OR_HAS_ALREADY_BEEN_VIEWED');
    });
  }
}

test('A-Z burn: cancel preserves secret; confirmation deletes it and dismisses loading', async () => {
  const server = backend(); let navigation, confirm = false, dismissals = 0;
  const r = { ...router, getCurrentNavigation: () => navigation,
    navigate: async (_, options) => { navigation = { extras: options || {} }; return true; } };
  const home = homeFactory({ api: server.api, router: r }); home.page.addSecretModal.message = 'burn test'; await home.page.createLink();
  const created = createdFactory({ api: server.api, router: r,
    modal: { create: async () => ({ present: async () => {}, onDidDismiss: async () => ({ data: confirm }) }) },
    loading: { create: async () => ({ present: async () => {}, dismiss: async () => { dismissals++; } }) } });
  created.page.ionViewWillEnter(); const id = created.page.id;
  await created.page.delete(); await new Promise(setImmediate);
  assert.equal(server.records.size, 1); assert.equal(server.counts().burns, 0);
  confirm = true; await created.page.delete(); await new Promise(setImmediate);
  assert.equal(server.records.size, 0); assert.equal(server.counts().burns, 1); assert.equal(dismissals, 1);
  const view = viewFactory({ api: server.api, id }); await view.page.loadSecret(); await new Promise(setImmediate);
  assert.equal(view.page.unlocked, false); assert.equal(view.alerts.length, 1);
});

test('A-Z countdown expiry clears content and redirects; reply also clears content', async () => {
  const server = backend(); let id, navigations = 0;
  const home = homeFactory({ api: server.api, router: { ...router, navigate: async (_, options) => { id = options.state.id; return true; } } });
  home.page.addSecretModal.message = 'timer test'; await home.page.createLink();
  const view = viewFactory({ api: server.api, id, router: { ...router, navigateByUrl: async () => { navigations++; return true; } } });
  await view.page.loadSecret(); assert.equal(view.page.unlocked, true);
  const expiry = [...view.timers.values()].find(timer => timer.ms === 300000);
  assert.ok(expiry); await expiry.fn(); assert.equal(navigations, 1); assert.equal(view.page.secretModel.message, '');
  assert.equal(view.page.unlocked, false); assert.equal(view.timers.size, 0);
  view.page.ionViewWillEnter(); view.page.revealUnlockedSecret('reply test'); await view.page.reply();
  assert.equal(view.page.secretModel.message, ''); assert.equal(view.timers.size, 0);
});
