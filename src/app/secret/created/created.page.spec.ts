import { Router } from '@angular/router';
import { LoadingController, ModalController } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { SecretapiService } from '../../services/secretapi.service';
import { TranslationService } from '../../services/translation.service';
import { CreatedPage } from './created.page';

describe('CreatedPage navigation state', () => {
  let router: jasmine.SpyObj<Router>;
  let page: CreatedPage;
  let originalState: unknown;

  function createPage(platform = 'browser'): CreatedPage {
    return new CreatedPage(
      platform, router, {} as ModalController, {} as SecretapiService,
      {} as LoadingController, {} as TranslationService
    );
  }

  function navigateWith(id: unknown): void {
    router.getCurrentNavigation.and.returnValue({ extras: { state: { id } } } as any);
  }

  beforeEach(() => {
    originalState = window.history.state;
    window.history.replaceState({}, '');
    router = jasmine.createSpyObj<Router>('Router', ['getCurrentNavigation', 'navigate']);
    router.getCurrentNavigation.and.returnValue(null);
    router.navigate.and.returnValue(Promise.resolve(true));
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    page = createPage();
  });

  afterEach(() => window.history.replaceState(originalState, ''));

  it('waits for page entry before reading navigation state', () => {
    expect(router.navigate).not.toHaveBeenCalled();
    navigateWith('first-secret');
    page.ionViewWillEnter();
    expect(page.url).toBe('https://stellarsecret.io/first-secret');
  });

  it('refreshes a reused page with the new secret', () => {
    navigateWith('first-secret');
    page.ionViewWillEnter();
    page.copied = true;
    navigateWith('second-secret');
    page.ionViewWillEnter();
    expect(page.id).toBe('second-secret');
    expect(page.url).toBe('https://stellarsecret.io/second-secret');
    expect(page.copied).toBeFalse();
  });

  it('recovers a cached empty page after a direct visit redirects home', () => {
    // Opening /secret/created without state leaves an empty page in Ionic's stack.
    page.ionViewWillEnter();
    expect(router.navigate).toHaveBeenCalledWith(['/']);
    expect(page.url).toBe('');

    // Creating a secret then re-enters that same instance (no new constructor).
    navigateWith('created-after-redirect');
    page.ionViewWillEnter();
    expect(page.id).toBe('created-after-redirect');
    expect(page.url).toBe('https://stellarsecret.io/created-after-redirect');
  });

  it('reads history state when navigation has already finished', () => {
    window.history.replaceState({ id: 'restored-secret' }, '');
    page.ionViewWillEnter();
    expect(page.url).toBe('https://stellarsecret.io/restored-secret');
  });

  it('prefers the active navigation over stale history', () => {
    window.history.replaceState({ id: 'old-secret' }, '');
    navigateWith('new-secret');
    page.ionViewWillEnter();
    expect(page.id).toBe('new-secret');
  });

  it('clears the previous URL instead of reusing stale history when state is missing', () => {
    navigateWith('old-secret');
    page.ionViewWillEnter();
    window.history.replaceState({ id: 'old-secret' }, '');
    navigateWith(undefined);
    page.ionViewWillEnter();
    expect(page.id).toBe('');
    expect(page.url).toBe('');
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('rejects malformed state', () => {
    navigateWith({ invalid: true });
    page.ionViewWillEnter();
    expect(page.url).toBe('');
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('does not read browser navigation during server rendering', () => {
    page = createPage('server');
    page.ionViewWillEnter();
    expect(router.getCurrentNavigation).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
