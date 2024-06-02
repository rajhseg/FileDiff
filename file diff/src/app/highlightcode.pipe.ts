import { Pipe, PipeTransform } from '@angular/core';
import hljs from 'highlight.js'

@Pipe({
  name: 'highlightcode'
})
export class HighlightcodePipe implements PipeTransform {

  transform(value: any, ...args: unknown[]): any {
    const preCodeRegex = /<pre style=\'height:410px;margin-top:25px;\'><code(?: class="language-(.*)")?>([\s\S]*?)<\/code><\/pre>/g;

    let enableHighlight: Boolean = false;

    if (args[0]!= undefined && args[0] == true) {
      enableHighlight = true;
    }

    if (value != null) {
      let val = value as string;

      return val.replace(preCodeRegex, function (_match, languageName, codeBlock) {
        let codeBlockHighlighted: string;

        if (enableHighlight) {
          if (!languageName) {
            codeBlockHighlighted = hljs.highlightAuto(codeBlock).value;
          } else {
            codeBlockHighlighted = hljs.highlight(languageName, codeBlock, true).value;
          }
        }
        else {
          codeBlockHighlighted = "<xmp>"+codeBlock+"</xmp>";
        }

        return '<pre style=\'height:410px;margin-top:25px;\'><code style=\'height:410px;\' class="hljs" [lineNumbers]="true">' + codeBlockHighlighted + '</code></pre>';
      });
    }

    return "";

  }

}
