import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { HowItWorksPageRoutingModule } from './how-it-works-routing.module';
import { HowItWorksPage } from './how-it-works.page';
import { TranslateModule } from '@ngx-translate/core';
import { MetaTagsDirective } from '../directives/meta-tags.directive';
import { FooterComponent } from '../app/components/footer/footer.component';
import { HeaderComponent } from "../app/components/header/header.component";


@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    HowItWorksPageRoutingModule,
    TranslateModule,
    MetaTagsDirective,
    FooterComponent,
    HeaderComponent
],
  declarations: [HowItWorksPage]
})
export class HowItWorksPageModule {}
