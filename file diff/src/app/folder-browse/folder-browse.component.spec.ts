import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FolderBrowseComponent } from './folder-browse.component';

describe('FolderBrowseComponent', () => {
  let component: FolderBrowseComponent;
  let fixture: ComponentFixture<FolderBrowseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FolderBrowseComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FolderBrowseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
