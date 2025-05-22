import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { HomePage } from './home.page';

import { HomePageRoutingModule } from './home-routing.module';
import { TranslateModule } from '@ngx-translate/core';
import { MetaTagsDirective } from '../directives/meta-tags.directive';
import { FooterComponent } from '../app/components/footer/footer.component';
import { HeaderComponent } from "../app/components/header/header.component";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    HomePageRoutingModule,
    TranslateModule,
    MetaTagsDirective,
    FooterComponent,
    HeaderComponent
],
  declarations: [HomePage]
})
export class HomePageModule {}
