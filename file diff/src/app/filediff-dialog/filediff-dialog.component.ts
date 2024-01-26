import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-filediff-dialog',
  templateUrl: './filediff-dialog.component.html',
  styleUrls: ['./filediff-dialog.component.css']
})
export class FilediffDialogComponent {
  
  constructor(public dialogRef: MatDialogRef<FilediffDialogComponent>, @Inject(MAT_DIALOG_DATA) public data: any){

  }

  closeDialog() {
    this.dialogRef.close('Pizza!');
  }

}
