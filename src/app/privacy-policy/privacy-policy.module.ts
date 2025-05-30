import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PrivacyPolicyRoutingModule } from './privacy-policy-routing.module';
import { PrivacyPolicyComponent } from './privacy-policy.component';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { MetaTagsDirective } from '../directives/meta-tags.directive';
import { FooterComponent } from '../app/components/footer/footer.component';
import { HeaderComponent } from '../app/components/header/header.component';


@NgModule({
  declarations: [PrivacyPolicyComponent],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PrivacyPolicyRoutingModule,
    TranslateModule,
    MetaTagsDirective,
    FooterComponent,
    HeaderComponent
  ]
})
export class PrivacyPolicyModule { }
