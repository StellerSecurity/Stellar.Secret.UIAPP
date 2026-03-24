import { Component, Inject, NgZone, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { App, URLOpenListenerEvent } from '@capacitor/app';
import { StatusBar } from '@capacitor/status-bar';
import { Platform } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent {
  selectedLanguage: string = 'en';
  private readonly supportedLangs: string[] = ['en', 'es', 'fr', 'de', 'da', 'sv', 'fr'];
  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    private router: Router,
    private zone: NgZone,
    public platform: Platform,
    private translate: TranslateService
  ) {
    this.translate.addLangs(this.supportedLangs);
    this.translate.setDefaultLang('en');
    this.startup();
    this.setDefaultLanguage();
  }
  public startup() {
    App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
      this.zone.run(() => {
        const slug = event.url.split('.io').pop();
        if (slug) {
          this.router.navigateByUrl(slug);
        }
      });
    });
    if (this.platform.is('android')) {
      StatusBar.setBackgroundColor({ color: 'black' }).then(() => {});
    }
  }
  setDefaultLanguage() {
    let lang = 'en';
    if (isPlatformBrowser(this.platformId)) {
      const browserLang = navigator.language?.split('-')[0]?.toLowerCase() || 'en';
      lang = this.supportedLangs.includes(browserLang) ? browserLang : 'en';
    }
    this.selectedLanguage = lang;
    this.translate.use(lang);
  }
  changeLanguage(lang: string) {
    const selectedLang = this.supportedLangs.includes(lang) ? lang : 'en';
    this.selectedLanguage = selectedLang;
    this.translate.use(selectedLang);
  }
}
