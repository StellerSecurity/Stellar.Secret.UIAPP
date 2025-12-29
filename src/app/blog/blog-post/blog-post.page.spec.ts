import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BlogPostPage } from './blog-post.page';

describe('BlogPostPage', () => {
  let component: BlogPostPage;
  let fixture: ComponentFixture<BlogPostPage>;

  beforeEach(async(() => {
    fixture = TestBed.createComponent(BlogPostPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
