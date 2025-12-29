import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { BlogPageRoutingModule } from './blog-routing.module';

import { BlogPage } from './blog.page';
import {FooterComponent} from "../app/components/footer/footer.component";
import {HeaderComponent} from "../app/components/header/header.component";

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        IonicModule,
        BlogPageRoutingModule,
        FooterComponent,
        HeaderComponent
    ],
  declarations: [BlogPage]
})
export class BlogPageModule {}
