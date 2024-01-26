import { Pipe, PipeTransform } from '@angular/core';
import hljs from 'highlight.js'

@Pipe({
  name: 'highlightdiffcode'
})
export class HighlightdiffcodePipe implements PipeTransform {

  transform(value: unknown, ...args: unknown[]): unknown {
    let id = args[0];
    let preCodeRegex;

    if(id=="preOld") {
       preCodeRegex = /<pre id=\'preOld\' style=\'height:485px;margin-top:15px;\'><code(?: class="language-(.*)")?>([\s\S]*?)<\/code><\/pre>/g;
    }
    else{
      preCodeRegex = /<pre id=\'preNew\' style=\'height:485px;margin-top:15px;\'><code(?: class="language-(.*)")?>([\s\S]*?)<\/code><\/pre>/g;
    }

    if (value != null) {
      let val = value as string;

      return val.replace(preCodeRegex, function (_match, languageName, codeBlock) {
        let codeBlockHighlighted: string;

        if (!languageName) {
          codeBlockHighlighted = hljs.highlightAuto(codeBlock).value;
        } else {
          codeBlockHighlighted = hljs.highlight(languageName, codeBlock, true).value;
        }

        let result: string = "";

        if(id == 'preOld') {
          result = '<pre id=\'preOld\' style=\'height:485px;margin-top:15px;\'><code style=\'height:450px;\' class="hljs" [lineNumbers]="true">' + codeBlockHighlighted + '</pre></code>';
        }
        else{
          result = '<pre id=\'preNew\' style=\'height:485px;margin-top:15px;\'><code style=\'height:450px;\' class="hljs" [lineNumbers]="true">' + codeBlockHighlighted + '</pre></code>';
        }
         return result;
      });
    }

    return "";
  }

}
