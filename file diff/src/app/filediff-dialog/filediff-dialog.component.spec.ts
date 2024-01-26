import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FilediffDialogComponent } from './filediff-dialog.component';

describe('FilediffDialogComponent', () => {
  let component: FilediffDialogComponent;
  let fixture: ComponentFixture<FilediffDialogComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [FilediffDialogComponent]
    });
    fixture = TestBed.createComponent(FilediffDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
