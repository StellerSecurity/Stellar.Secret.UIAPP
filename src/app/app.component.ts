import { Component, NgZone } from '@angular/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Router } from '@angular/router';
import { App, URLOpenListenerEvent } from '@capacitor/app';
import { Platform } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent {
  selectedLanguage: string = 'en';

  constructor(private router: Router, private zone: NgZone, public platform: Platform, private translate: TranslateService) {
    // Set default language
    translate.setDefaultLang('en');
    // Use a language
    //en --english
    //fr--france
    //chi--Mandarin Chinese
    //hi--hindi
    //sp--Spanish
    //ar--Standard Arabic
    translate.use('en');
    this.startup();
    this.setDefaultLanguage()
  }

  public startup() {
    App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
      this.zone.run(() => {
        // Example url: https://beerswift.app/tabs/tab2
        // slug = /tabs/tab2
        const slug = event.url.split(".io").pop();
        if (slug) {
          console.log("started...");
          this.router.navigateByUrl(slug);
        }
        // If no match, do nothing - let regular routing
        // logic take over
      });
    });

    if (this.platform.is('android')) {
      StatusBar.setBackgroundColor({ color: "black" }).then(r => { });
    }

  }

  setDefaultLanguage() {
    // Get browser language
    const browserLang = navigator.language.split('-')[0]; // Extract language code (e.g., 'en', 'fr')
    console.log(browserLang,'browserLang');
    
    // console.log(browserLang, 'browserLang');

    // List of supported languages
    const supportedLangs = [
      'en', 'hi', 'es', 'af', 'en-US','mr', 'ak', 'sq', 'am', 'ar','an', 'hy', 'eu', 'bn', 'bm',
      'az', 'ay', 'ast', 'as', 'zu','yo', 'yi', 'xh', 'wo', 'fy','cy', 'wa', 'vi', 'uz', 'ug',
      'ur', 'uk', 'tk', 'tr', 'tn','ts', 'to', 'ti', 'th', 'te','tt', 'ta', 'tg', 'sw', 'sv',
      'su', 'es-VE', 'es-UY', 'es-US', 'es-ES','es-MX', 'es-419', 'es-HN', 'es-CR','es-CO', 'es-CL', 'es-AR', 'st',
      'so', 'sl', 'sk', 'si','sd', 'sn', 'sh', 'sr', 'gd', 'sa', 'sm', 'ru', 'rm', 'ro-MD',
      'ro', 'qu', 'pa', 'pt-PT', 'pt-BR', 'pt', 'pl', 'fa', 'ps', 'om', 'or',
      'oc', 'ny', 'nn', 'nb', 'no', 'nso', 'ne', 'mn', 'lus', 'mi', 'mni',
      'mt', 'ml', 'ms', 'mg', 'mai', 'mk', 'lb', 'lt', 'ln', 'lv', 'la', 'ky', 'ku',
      'kri', 'ko', 'kok', 'rw', 'km', 'kk', 'kn', 'jv', 'ja', 'it-CH', 'it-IT',
      'it', 'ga', 'ia', 'id', 'ilo', 'ig', 'is', 'hu', 'hmn', 'he', 'haw',
      'ha', 'ht', 'gu', 'gn', 'el', 'de-CH', 'de', 'ka', 'lg', 'gl', 'fr', 'fi',
      'fil', 'fo', 'et', 'ee', 'eo', 'nl', 'en-GB', 'en-ZA', 'en-NZ', 'en-IE',
      'en-IN', 'en-CA', 'en-AU', 'zh-TW', 'zh-CN', 'zh-HK', 'zh', 'chr',
      'ckb', 'ceb', 'ca', 'my', 'bg', 'br', 'bs', 'bho', 'be','da'
    ];

    // Set default language based on browser language or fallback to 'en'
    this.selectedLanguage = supportedLangs.includes(browserLang) ? browserLang : 'en';

    this.translate.setDefaultLang(this.selectedLanguage);
    this.translate.use(this.selectedLanguage);
  }

}
