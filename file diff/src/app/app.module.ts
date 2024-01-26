import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { FileDiffComponent } from './file-diff/file-diff.component';
import { FolderBrowseComponent } from './folder-browse/folder-browse.component';
import { SafeHtmlPipe } from './safe-html.pipe';
import { HighlightcodePipe } from './highlightcode.pipe';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatButtonModule } from '@angular/material/button';
import { FilediffDialogComponent } from './filediff-dialog/filediff-dialog.component';
import { MAT_DIALOG_DEFAULT_OPTIONS, MatDialogModule } from '@angular/material/dialog';
import { HighlightdiffcodePipe } from './highlightdiffcode.pipe';
import { HighlightnewdiffcodePipe } from './highlightnewdiffcode.pipe';
import {
  HighlightAutoResult,
  HighlightLoader,
  HighlightModule,
  HighlightOptions,
  HIGHLIGHT_OPTIONS,
} from 'ngx-highlightjs';
import { MarkerPipe } from './marker.pipe';


@NgModule({
  declarations: [
    AppComponent,
    FileDiffComponent,
    FolderBrowseComponent,
    SafeHtmlPipe,
    HighlightcodePipe,
    FilediffDialogComponent,
    HighlightdiffcodePipe,
    HighlightnewdiffcodePipe,
    MarkerPipe,
  ],
  imports: [
    MatButtonModule,
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forRoot([
      { path: '', pathMatch: 'full', redirectTo: 'filediff' },
      { path: 'filediff', component: FileDiffComponent }
    ]),
    BrowserAnimationsModule,
    MatDialogModule,
    HighlightModule
  ],
  providers: [ {provide: MAT_DIALOG_DEFAULT_OPTIONS, useValue: {hasBackdrop: false}},
    {
      provide: HIGHLIGHT_OPTIONS,
      useValue: <HighlightOptions>{
        fullLibraryLoader: () => import('highlight.js')
        //lineNumbers: true,
        //coreLibraryLoader: () => import('highlight.js/lib/core'),
        //lineNumbersLoader: () => import('ngx-highlightjs/line-numbers'),
        ////themePath: 'node_modules/highlight.js/styles/androidstudio.css',
        //languages: {
        //  typescript: () => import('highlight.js/lib/languages/typescript'),
        //  css: () => import('highlight.js/lib/languages/css'),
        //  xml: () => import('highlight.js/lib/languages/xml'),
        //  cs: () => import('highlight.js/lib/languages/csharp')
        //},
      },
    },
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
