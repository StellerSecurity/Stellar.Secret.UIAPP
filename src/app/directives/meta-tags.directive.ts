import { Directive, Input, OnInit, OnDestroy } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { Title } from '@angular/platform-browser';


@Directive({
  selector: '[appMetaTags]',
  standalone: true
})
export class MetaTagsDirective implements OnInit, OnDestroy {

  @Input() description: string | undefined;
  @Input() title: string | undefined;
  @Input() keywords: string | undefined;

  constructor(private meta: Meta,private titleService: Title) { }

  ngOnInit() {
    this.addMetaTags();
  }

  ngOnDestroy() {
    this.removeMetaTags();
  }

  private addMetaTags() {
    if (this.description) {
      this.meta.addTag({ name: 'description', content: this.description });
    }

    if (this.title) {
      this.titleService.setTitle(this.title);
      this.meta.addTag({ property: 'og:title', content: this.title });
    }
    if (this.keywords) {
      this.meta.addTag({ property: 'keywords', content: this.keywords });
    }

    // Add more meta tags as needed
  }

  private removeMetaTags() {
    this.meta.removeTag('name="description"');
    this.meta.removeTag('property="og:title"');
    this.meta.removeTag('property="keywords"');
    // Remove other meta tags as needed
  }
}
