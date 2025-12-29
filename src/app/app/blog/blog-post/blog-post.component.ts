import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { IonicModule, ToastController } from '@ionic/angular';

import { BlogPost } from '../blog.types';
import { BlogContentRendererComponent } from '../blog-content-renderer/blog-content-renderer.component';
import { BlogPostCardComponent } from '../blog-post-card/blog-post-card.component';
import { BlogTocComponent } from '../blog-toc/blog-toc.component';

@Component({
  selector: 'app-blog-post',
  templateUrl: './blog-post.component.html',
  styleUrls: ['./blog-post.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, BlogTocComponent, BlogContentRendererComponent, BlogPostCardComponent],
})
export class BlogPostComponent {
  @Input({ required: true }) post!: BlogPost;
  @Input() related: BlogPost[] = [];

  constructor(private toastController: ToastController) {}

  get dateLabel(): string {
    try {
      return new Date(this.post.dateISO).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: '2-digit',
      });
    } catch {
      return this.post.dateISO;
    }
  }

  async copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      const toast = await this.toastController.create({
        message: 'Link copied',
        duration: 1200,
        position: 'bottom',
      });
      await toast.present();
    } catch {
      const toast = await this.toastController.create({
        message: 'Could not copy link',
        duration: 1500,
        position: 'bottom',
      });
      await toast.present();
    }
  }
}
