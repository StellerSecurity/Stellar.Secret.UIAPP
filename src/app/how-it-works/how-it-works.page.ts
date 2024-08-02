import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-how-it-works',
  templateUrl: './how-it-works.page.html',
  styleUrls: ['./how-it-works.page.scss'],
})
export class HowItWorksPage  implements OnInit {
  selectedLanguage: string = 'en';
  constructor(private translate: TranslateService) {
    this.translate.setDefaultLang(this.selectedLanguage);
   }

  ngOnInit() {
    this.setDefaultLanguage()
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
