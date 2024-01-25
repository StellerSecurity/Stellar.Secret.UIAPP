import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CreatedPage } from './created.page';

describe('CreatedPage', () => {
  let component: CreatedPage;
  let fixture: ComponentFixture<CreatedPage>;

  beforeEach(async(() => {
    fixture = TestBed.createComponent(CreatedPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
