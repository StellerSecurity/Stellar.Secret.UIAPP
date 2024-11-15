import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { HowItWorksPageRoutingModule } from './how-it-works-routing.module';
import { HowItWorksPage } from './how-it-works.page';
import { TranslateModule } from '@ngx-translate/core';
import { MetaTagsDirective } from '../directives/meta-tags.directive';


@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    HowItWorksPageRoutingModule,
    TranslateModule,
    MetaTagsDirective
  ],
  declarations: [HowItWorksPage]
})
export class HowItWorksPageModule {}
