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

  ngOnInit() {}
  changeLanguage(event: any) {
    this.selectedLanguage = event.detail.value;
    this.translate.use(this.selectedLanguage);
  }
}
