import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { BlogQuery } from '../blog.types';

@Component({
  selector: 'app-blog-filter-bar',
  templateUrl: './blog-filter-bar.component.html',
  styleUrls: ['./blog-filter-bar.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
})
export class BlogFilterBarComponent {
  @Input() categories: string[] = [];
  @Input() tags: string[] = [];
  @Input() value: BlogQuery = {};

  @Output() valueChange = new EventEmitter<BlogQuery>();

  setQuery(q: Partial<BlogQuery>) {
    const next: BlogQuery = {
      ...this.value,
      ...q,
      page: 1,
    };
    this.valueChange.emit(next);
  }

  clearTag() {
    this.setQuery({ tag: undefined });
  }

  clearCategory() {
    this.setQuery({ category: undefined });
  }
}
