import { Component, OnInit } from '@angular/core';
import { BlogService, BlogPost } from './blog.service';

@Component({
  selector: 'app-blog',
  templateUrl: './blog.page.html',
  styleUrls: ['./blog.page.scss'],
})
export class BlogPage implements OnInit {
  metaTitle = 'Stellar Secret Blog';
  metaDescription = 'Guides & updates on secure one-time sharing, passwords, API keys, and privacy basics.';
  metaKeywords = 'one-time secret, secure sharing, password sharing, api keys, privacy, encryption';
  url = '/blog';

  isLoading = true;

  search = '';
  selectedCategory = 'All';
  selectedTag = 'All';

  posts: BlogPost[] = [];
  visiblePosts: BlogPost[] = [];

  categories: string[] = ['All'];
  tags: string[] = ['All'];

  pageSize = 8;
  page = 1;
  hasMore = false;

  constructor(private blog: BlogService) {}

  ngOnInit() {
    this.isLoading = true;
    this.blog.getPosts().subscribe({
      next: (data) => {
        this.posts = data;
        this.buildFilters();
        this.applyFilters(true);
        this.isLoading = false;
      },
      error: () => {
        this.posts = [];
        this.buildFilters();
        this.applyFilters(true);
        this.isLoading = false;
      }
    });
  }

  private buildFilters() {
    const cats = new Set<string>();
    const tagSet = new Set<string>();

    for (const p of this.posts) {
      cats.add(p.category);
      (p.tags || []).forEach(t => tagSet.add(t));
    }

    this.categories = ['All', ...Array.from(cats).sort((a, b) => a.localeCompare(b))];
    this.tags = ['All', ...Array.from(tagSet).sort((a, b) => a.localeCompare(b))];
  }

  onSearchInput(ev: any) {
    const value = ev?.detail?.value ?? ev?.target?.value ?? '';
    this.search = String(value);
    this.applyFilters(true);
  }

  onCategorySegmentChange(ev: any) {
    const value = ev?.detail?.value ?? 'All';
    this.selectedCategory = String(value || 'All');
    this.applyFilters(true);
  }

  onTagChange(value: string) {
    this.selectedTag = value || 'All';
    this.applyFilters(true);
  }

  doRefresh(ev: any) {
    // Since JSON is local, "refresh" just re-applies filters
    setTimeout(() => {
      this.applyFilters(true);
      ev?.target?.complete?.();
    }, 250);
  }

  loadMore(ev: any) {
    setTimeout(() => {
      this.page += 1;
      this.applyFilters(false);
      ev?.target?.complete?.();
    }, 250);
  }

  private applyFilters(resetPaging: boolean) {
    if (resetPaging) this.page = 1;

    const q = this.search.trim().toLowerCase();
    const cat = this.selectedCategory;
    const tag = this.selectedTag;

    const filtered = this.posts
        .slice()
        .sort((a, b) => ((a.featured === b.featured) ? 0 : (a.featured ? -1 : 1)))
        .filter(p => (cat === 'All' ? true : p.category === cat))
        .filter(p => (tag === 'All' ? true : (p.tags || []).includes(tag)))
        .filter(p => {
          if (!q) return true;
          const hay = `${p.title} ${p.excerpt} ${p.category} ${(p.tags || []).join(' ')}`.toLowerCase();
          return hay.includes(q);
        });

    const limit = this.page * this.pageSize;
    this.visiblePosts = filtered.slice(0, limit);
    this.hasMore = filtered.length > this.visiblePosts.length;
  }

  trackBySlug(_: number, item: BlogPost) {
    return item.slug;
  }

  formatDate(iso: string) {
    return iso;
  }
}
