import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ViewPageRoutingModule } from './view-routing.module';

import { ViewPage } from './view.page';
import { TranslateModule } from '@ngx-translate/core';
import { FooterComponent } from 'src/app/app/components/footer/footer.component';


@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ViewPageRoutingModule,
    TranslateModule,
    FooterComponent
  ],
  declarations: [ViewPage]
})
export class ViewPageModule {}
