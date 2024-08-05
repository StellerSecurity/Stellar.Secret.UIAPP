import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { CreatedPageRoutingModule } from './created-routing.module';

import { CreatedPage } from './created.page';
import { TranslateModule } from '@ngx-translate/core';
import { ConfirmationModalComponent } from './confirmation-modal.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    CreatedPageRoutingModule,
    TranslateModule
  ],
  declarations: [CreatedPage,ConfirmationModalComponent]
})
export class CreatedPageModule {}
