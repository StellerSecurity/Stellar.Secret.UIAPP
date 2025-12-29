import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { IonicModule } from '@ionic/angular';

import { BlogFAQItem } from '../blog.types';

@Component({
  selector: 'app-blog-faq',
  templateUrl: './blog-faq.component.html',
  styleUrls: ['./blog-faq.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class BlogFaqComponent {
  @Input() title = 'FAQ';
  @Input() items: BlogFAQItem[] = [];
}
