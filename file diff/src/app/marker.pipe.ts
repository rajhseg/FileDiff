import {Pipe, PipeTransform} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';
import {BaseToken, MarkerType, NewFile, OldFile} from "./Models/BaseToken";
import hljs from 'highlight.js'

@Pipe({
  name: 'marker'
})
export class MarkerPipe implements PipeTransform {

  // deleteSpan: string = '<span style=\"top: 1px;right: 1px;color: red;border-radius: 21px;font-size: 18px;position: relative;font-weight: bold;padding: 4px;\">x</span>';
  deleteSpan: string = '<button type="button" class="btn btn-danger btn-circle"><span class="delbtn">x</span></button>';

  constructor(private sanitizer: DomSanitizer) {
  }

  getNewLineBasedOnEditor(enableFileEditor:boolean) {
      return '\n';
  }

  replaceAngleBracets(token: string) {
    return token
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  transform(value: any, ...args: any): unknown {

    if (!args) {
      return value;
    }


    let markerIndex: number = args[0];
    let baseTokens: BaseToken[] = args[1];
    let enableFileEditor: boolean = args[2];
    let markerType: MarkerType = args[3];

    let prevIndex: number = -1;
    let replacedValue= value;

    if(markerIndex>-1) {

      if (baseTokens[0] instanceof OldFile) {
        let deletedTokens = (baseTokens as OldFile[]).filter(x => x.IsDeleted && x.Token != ' ' && x.Token != this.getNewLineBasedOnEditor(enableFileEditor) && x.Token != '');

        if (markerType == MarkerType.Down) {
          prevIndex = markerIndex - 1;
        } else if (markerType == MarkerType.Up) {
          prevIndex = markerIndex + 1;
        }

        if (prevIndex > -1 && prevIndex < deletedTokens.length) {
          let deletedPreToken = deletedTokens[prevIndex];

          let matchPreString: string = "<span id='leftspanContentMarker_" + deletedPreToken.Index + "' class='spanContentMarker glass frame centered'>" + this.replaceAngleBracets(deletedPreToken.Token) + this.deleteSpan + "</span>";
          let replacematchPreString: string = "<span id='" + deletedPreToken.Index + "' class='spanContentDeleted'>" + this.replaceAngleBracets(deletedPreToken.Token) + "</span>";

          if (replacedValue.indexOf(matchPreString) != -1) {
            replacedValue = replacedValue.replace(matchPreString, replacematchPreString);
          }
          else {
            let matchPreString1: string = "<span id='leftspanContentMarker_" + deletedPreToken.Index + "' class='spanContentMarker'>" + this.replaceAngleBracets(deletedPreToken.Token) + "</span>";
            replacedValue = replacedValue.replace(matchPreString1, replacematchPreString);
          }
        }

        let markDeletedToken: OldFile = deletedTokens[markerIndex];
        let matchNewString: string = "<span id='" + markDeletedToken.Index + "' class='spanContentDeleted'>" + this.replaceAngleBracets(markDeletedToken.Token) + "</span>";
        let replacematchNewString: string = "<span id='leftspanContentMarker_" + markDeletedToken.Index + "' class='spanContentMarker glass frame centered'>" + this.replaceAngleBracets(markDeletedToken.Token) + this.deleteSpan+ "</span>";

        if (replacedValue.indexOf(matchNewString) != -1) {
          replacedValue = replacedValue.replace(matchNewString, replacematchNewString);
        } else {
          let matchNewString1: string = "<span id='leftspanContentMarker_" + markDeletedToken.Index + "' class='spanContentMarker'>" + this.replaceAngleBracets(markDeletedToken.Token) + "</span>";
          replacedValue = replacedValue.replace(matchNewString1, replacematchNewString);
        }

        return replacedValue;
      }

      if (baseTokens[0] instanceof NewFile) {
        let newTokens = (baseTokens as NewFile[]).filter(x => x.IsNew && x.Token != ' ' && x.Token != this.getNewLineBasedOnEditor(enableFileEditor) && x.Token != '');

        if (markerType == MarkerType.Down) {
          prevIndex = markerIndex - 1;
        } else if (markerType == MarkerType.Up) {
          prevIndex = markerIndex + 1;
        }

        if (prevIndex > -1 && prevIndex < newTokens.length) {
          let newPreToken = newTokens[prevIndex];

          let matchPreString: string = "<span id='rightspanContentMarker_" + newPreToken.Index + "' class='spanContentMarker glass frame centered'>" + this.replaceAngleBracets(newPreToken.Token) + this.deleteSpan + "</span>";
          let replacematchPreString: string = "<span id='" + newPreToken.Index + "' class='spanContentNew'>" + this.replaceAngleBracets(newPreToken.Token) + "</span>";

          if (replacedValue.indexOf(matchPreString) != -1) {
            replacedValue = replacedValue.replace(matchPreString, replacematchPreString);
          } else {
            let matchPreString1: string = "<span id='rightspanContentMarker_" + newPreToken.Index + "' class='spanContentMarker'>" + this.replaceAngleBracets(newPreToken.Token) + "</span>";
            replacedValue = replacedValue.replace(matchPreString1, replacematchPreString);
          }
        }

        let marknewToken: NewFile = newTokens[markerIndex];
        let matchNewString: string = "<span id='" + marknewToken.Index + "' class='spanContentNew'>" + this.replaceAngleBracets(marknewToken.Token) + "</span>";
        let replacematchNewString: string = "<span id='rightspanContentMarker_" + marknewToken.Index + "' class='spanContentMarker glass frame centered'>" + this.replaceAngleBracets(marknewToken.Token) + this.deleteSpan + "</span>";

        if (replacedValue.indexOf(matchNewString) != -1) {
          replacedValue = replacedValue.replace(matchNewString, replacematchNewString);
        } else {
          let matchnewString1: string = "<span id='rightspanContentMarker_" + marknewToken.Index + "' class='spanContentMarker'>" + this.replaceAngleBracets(marknewToken.Token) + "</span>";
          replacedValue = replacedValue.replace(matchnewString1, replacematchNewString);
        }

        return replacedValue;
      }
    }

    return value;
  }
}
