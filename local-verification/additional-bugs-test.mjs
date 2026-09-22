import test from 'node:test';
import assert from 'node:assert/strict';
import { homeFactory, viewFactory, createdFactory, deferred, pendingResponse, response, router, cryptoAdapter, encrypt, decrypt } from './test-support.mjs';

const attachment = 'data:text/plain;base64,aGFybWxlc3M=';

test('test adapter decrypts the known synthetic CryptoJS production vector', () => {
  assert.equal(decrypt('U2FsdGVkX1+mFAoW+Z0tQkF5ZA/IkVAiNvri7gUj0AOXusTUyWkRUp7lwfeJJt/iFAdHj057px5Bc8eNsc9Iog==', 'audit-test-passphrase-2026'),
    'Audit: harmless password-protected test message');
});

test('failed creation preserves message, password, files and burner time; retry encrypts original once', async () => {
  const sent = []; let fail = true, id;
  const { page, alerts } = homeFactory({ api: { create(payload) {
    sent.push(structuredClone(payload));
    return { subscribe(next, error) { fail ? error(new Error('offline')) : next({}); } };
  } }, router: { ...router, navigate: async (_, options) => { id = options.state.id; return true; } } });
  page.addSecretModal.message = 'original'; page.addSecretModal.password = 'correct';
  page.secretFiles = [{ name: 'test.txt', content: attachment }]; page.chosenBurnerTime = 6;
  const original = JSON.stringify([page.addSecretModal, page.secretFiles, page.chosenBurnerTime]);
  await page.createLink();
  assert.equal(JSON.stringify([page.addSecretModal, page.secretFiles, page.chosenBurnerTime]), original);
  assert.equal(page.creating, false); assert.equal(alerts.length, 1);
  fail = false; await page.createLink();
  assert.equal(sent.length, 2);
  for (const payload of sent) {
    assert.equal(payload.has_password, true); assert.equal('password' in payload, false);
    assert.equal(decrypt(payload.message, 'correct'), 'original');
    assert.equal(decrypt(payload.files[0].content, 'correct'), attachment);
    assert.equal(payload.expires_at, '6');
  }
  assert.ok(id); assert.equal(page.addSecretModal.message, ''); assert.equal(page.secretFiles.length, 0);
});

test('creation is locked before haptics and through API response and navigation', async () => {
  const tap = deferred(), navigation = deferred(), request = pendingResponse(); let calls = 0, navigating = false;
  const { page } = homeFactory({ context: { Haptics: { impact: () => tap.promise } },
    api: { create() { calls++; return request.observable; } },
    router: { ...router, navigate: async () => { navigating = true; return navigation.promise; } } });
  page.addSecretModal.message = 'double click';
  const run = page.createLink(); const duplicate = page.createLink(); assert.equal(page.creating, true);
  tap.resolve(); await duplicate; await new Promise(setImmediate); assert.equal(calls, 1);
  await page.createLink(); assert.equal(calls, 1);
  request.deliver({}); await new Promise(setImmediate);
  assert.equal(navigating, true); assert.equal(page.creating, true);
  await page.createLink(); assert.equal(calls, 1);
  navigation.resolve(true); await run; assert.equal(page.creating, false);
});

test('empty form and encryption exceptions release creation lock', async () => {
  const empty = homeFactory(); await empty.page.createLink();
  assert.equal(empty.page.creating, false); assert.equal(empty.alerts.length, 1);
  const broken = homeFactory({ context: { CryptoJS: { AES: { encrypt() { throw Error('encryption failure'); } } } } });
  broken.page.addSecretModal.message = 'preserve me'; await broken.page.createLink();
  assert.equal(broken.page.creating, false); assert.equal(broken.page.addSecretModal.message, 'preserve me');
  assert.equal(broken.alerts.length, 1);
});

for (const shape of ['text', 'file', 'both']) {
  test(`password unlock supports ${shape} and preserves attachment names`, async () => {
    const { page } = viewFactory();
    page.passwordProtected = true; page.openMessage = true; page.inputPassword = 'correct';
    page.secretModel = { message: shape === 'file' ? '' : encrypt('original', 'correct'),
      files: shape === 'text' ? [] : [{ name: 'test.txt', content: encrypt(attachment, 'correct') }] };
    await page.unlockByPassword(); assert.equal(page.unlocked, true); assert.equal(page.inputPassword, '');
    assert.equal(page.secretModel.message, shape === 'file' ? '' : 'original');
    if (shape !== 'text') {
      assert.equal(page.secretModel.files[0].content, attachment); assert.equal(page.secretModel.files[0].name, 'test.txt');
    }
  });
}

for (const failure of ['empty', 'utf8']) {
  test(`wrong-password ${failure} failure shows feedback and allows correct retry`, async () => {
    let reject = true;
    const crypto = { ...cryptoAdapter, AES: { ...cryptoAdapter.AES, decrypt(text, key) {
      if (reject) return { toString() { if (failure === 'utf8') throw Error('Malformed UTF-8 data'); return ''; } };
      return cryptoAdapter.AES.decrypt(text, key);
    } } };
    const { page, alerts } = viewFactory({ context: { CryptoJS: crypto } });
    page.passwordProtected = true; page.inputPassword = 'wrong';
    page.secretModel = { message: encrypt('original', 'correct'), files: [{ content: encrypt(attachment, 'correct') }] };
    const original = JSON.stringify(page.secretModel);
    await page.unlockByPassword(); assert.equal(page.unlocked, false); assert.equal(page.openingLoading, false);
    assert.equal(alerts.at(-1).message, 'THE_PASSWORD_IS_NOT_CORRECT_TRY_AGAIN');
    assert.equal(JSON.stringify(page.secretModel), original);
    reject = false; page.inputPassword = 'correct'; await page.unlockByPassword(); assert.equal(page.unlocked, true);
  });
}

test('attachment failure does not partially replace ciphertext', async () => {
  const { page, alerts } = viewFactory(); page.passwordProtected = true; page.inputPassword = 'correct';
  page.secretModel = { message: encrypt('original', 'correct'), files: [{ content: encrypt('not a data URL', 'correct') }] };
  const before = JSON.stringify(page.secretModel); await page.unlockByPassword();
  assert.equal(page.unlocked, false); assert.equal(JSON.stringify(page.secretModel), before); assert.equal(alerts.length, 1);
});

test('unprotected file-only secret decrypts through the API response flow', async () => {
  const { page } = viewFactory({ api: { view: () => response({ response_code: 200, has_password: false,
    message: '', files: [{ content: encrypt(attachment, 'test-secret') }] }) } });
  await page.loadSecret(); assert.equal(page.unlocked, true); assert.equal(page.secretModel.files[0].content, attachment);
});

test('leaving clears plaintext, password, files, animations and all timers', async () => {
  const { page, timers } = viewFactory();
  page.secretModel.files = [{ content: attachment }]; page.inputPassword = 'private'; page.revealUnlockedSecret('plaintext');
  assert.ok(timers.size > 0); page.ionViewWillLeave();
  assert.equal(timers.size, 0); assert.equal(page.secretModel.message, ''); assert.equal(page.displayedMessage, '');
  assert.equal(page.inputPassword, ''); assert.equal(page.secretModel.files.length, 0); assert.equal(page.unlocked, false);
});

test('late response cannot repopulate a departed or re-entered page', async () => {
  const request = pendingResponse(); const { page } = viewFactory({ api: { view: () => request.observable } });
  await page.loadSecret(); page.ionViewWillLeave(); assert.equal(request.state.cancelled, true);
  page.ionViewWillEnter();
  await request.deliver({ response_code: 200, message: encrypt('stale secret', 'test-secret'), files: [] });
  assert.equal(page.unlocked, false); assert.equal(page.secretModel.message, '');
});

test('leaving during haptics prevents consuming a one-time secret', async () => {
  const tap = deferred(); let calls = 0;
  const { page } = viewFactory({ context: { Haptics: { impact: () => tap.promise } }, api: { view() { calls++; return response({}); } } });
  const run = page.loadSecret(); page.ionViewWillLeave(); tap.resolve(); await run; assert.equal(calls, 0);
});

test('overlapping open calls consume the secret only once', async () => {
  const tap = deferred(); let calls = 0; const request = pendingResponse();
  const { page } = viewFactory({ context: { Haptics: { impact: () => tap.promise } }, api: { view() { calls++; return request.observable; } } });
  const run = page.loadSecret(); const duplicate = page.loadSecret(); tap.resolve(); await Promise.all([run, duplicate]); assert.equal(calls, 1);
});

test('clipboard rejection shows failure instead of success', async () => {
  const { page, timers } = createdFactory({ context: { navigator: { clipboard: { writeText: async () => { throw Error('denied'); } } } } });
  page.url = 'https://example.test/id'; await page.handleCopy({});
  assert.equal(page.copied, false); assert.equal(page.copyFailed, true); assert.equal(timers.size, 0);
});

test('successful clipboard write shows success, clears previous failure, cleans feedback on leave', async () => {
  let copied;
  const { page, timers } = createdFactory({ context: { navigator: { clipboard: { writeText: async value => { copied = value; } } } } });
  page.url = 'https://example.test/id'; page.copyFailed = true; await page.handleCopy({});
  assert.equal(copied, page.url); assert.equal(page.copied, true); assert.equal(page.copyFailed, false);
  page.ionViewWillLeave(); assert.equal(page.copied, false); assert.equal(timers.size, 0);
});

for (const result of [true, false, 'throw']) {
  test(`legacy clipboard ${result} reports accurately and always removes temporary element`, async () => {
    let removed = 0;
    const { page } = createdFactory({ context: { navigator: {}, document: {
      createElement: () => ({ style: {}, focus() {}, select() {} }),
      body: { appendChild() {}, removeChild() { removed++; } },
      execCommand() { if (result === 'throw') throw Error('denied'); return result; },
    } } });
    page.url = 'https://example.test/id'; await page.handleCopy({});
    assert.equal(page.copied, result === true); assert.equal(page.copyFailed, result !== true); assert.equal(removed, 1);
  });
}

test('late clipboard resolution after navigation cannot resurrect feedback', async () => {
  const write = deferred(); const { page } = createdFactory({ context: { navigator: { clipboard: { writeText: () => write.promise } } } });
  page.url = 'https://example.test/id'; const run = page.handleCopy({}); page.ionViewWillLeave(); write.resolve(); await run;
  assert.equal(page.copied, false); assert.equal(page.copyFailed, false);
});

test('zero-byte password-protected attachment unlocks without requiring text', async () => {
  const { page } = viewFactory(); page.passwordProtected = true; page.inputPassword = 'correct';
  page.secretModel = { message: '', files: [{ content: encrypt('data:application/octet-stream;base64,', 'correct') }] };
  await page.unlockByPassword(); assert.equal(page.unlocked, true);
  assert.equal(page.secretModel.files[0].content, 'data:application/octet-stream;base64,');
});

test('second unlock click after success cannot decrypt plaintext again', async () => {
  const { page, alerts } = viewFactory(); page.passwordProtected = true; page.inputPassword = 'correct';
  page.secretModel = { message: encrypt('original', 'correct'), files: [] };
  await page.unlockByPassword(); await page.unlockByPassword();
  assert.equal(page.secretModel.message, 'original'); assert.equal(alerts.length, 0);
});

test('late error after leaving does not show a dialog', async () => {
  const request = pendingResponse(); const { page, alerts } = viewFactory({ api: { view: () => request.observable } });
  await page.loadSecret(); page.ionViewWillLeave(); await request.fail(new Error('late offline'));
  assert.equal(alerts.length, 0); assert.equal(page.openingLoading, false);
});

test('empty created URL never produces a successful clipboard write', async () => {
  let writes = 0;
  const { page } = createdFactory({ context: { navigator: { clipboard: { writeText: async () => { writes++; } } } } });
  await page.handleCopy({}); assert.equal(writes, 0); assert.equal(page.copied, false); assert.equal(page.copyFailed, true);
});
