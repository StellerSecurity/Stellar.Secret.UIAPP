import {Component, NgZone} from '@angular/core';
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

    if(this.platform.is('android')) {
      StatusBar.setBackgroundColor({color: "black"}).then(r => {});
    }

  }

  setDefaultLanguage() {
    // Get browser language
    const browserLang = navigator.language.split('-')[0]; // Extract language code (e.g., 'en', 'fr')
    
    // List of supported languages
    const supportedLangs = ['en', 'fr', 'hi', 'chi', 'sp', 'ar', 'be', 'po', 'ru', 'ur'];
    
    // Set default language based on browser language or fallback to 'en'
    this.selectedLanguage = supportedLangs.includes(browserLang) ? browserLang : 'en';
    
    this.translate.setDefaultLang(this.selectedLanguage);
    this.translate.use(this.selectedLanguage);
  }

}
