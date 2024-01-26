import { ChangeDetectorRef, Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

@Pipe({
  name: 'safeHtml'
})
export class SafeHtmlPipe implements PipeTransform {

  constructor(private sanitizer: DomSanitizer, private cdr: ChangeDetectorRef) { }

  transform(value: any, ...args: unknown[]): unknown {
    let result = this.sanitizer.bypassSecurityTrustHtml(value);
    this.cdr.detectChanges();
    return result != null ? result: "";
  }

}
