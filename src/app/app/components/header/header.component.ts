import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { MetaTagsDirective } from 'src/app/directives/meta-tags.directive';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TranslateModule,
    MetaTagsDirective,
    RouterModule
  ],
})
export class HeaderComponent  implements OnInit {
  @Input() title!: string;
  @Input() description?: string;
  @Input() keywords?: string;
  @Input() url?: string;
  isPopoverOpen = false;
  popoverEvent: Event | undefined;

  constructor() { }

  ngOnInit() {}

  openPopover(event: MouseEvent) {
    this.popoverEvent = event;
    this.isPopoverOpen = true;
  }

}
