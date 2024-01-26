import { Injectable } from '@angular/core';
import { FileEnum, NewFile, OldFile } from './Models/BaseToken';

@Injectable({
  providedIn: 'root'
})
export class TokenService {

  constructor() { }

  ConvertOldFileToToken(content: string, isFromEditor: boolean = false): OldFile[]{
    let multipleLines: string[] = [];

    content = content.replace(/\r/g, "");
    multipleLines = content.split('\n');

    //if (isFromEditor) {
    //  multipleLines = content.split('\n');
    //} else {
    //  multipleLines = content.split('\r\n');
    //}

    let index = -1;
    let result: OldFile[] = [];

    for(let i=0; i< multipleLines.length; i++){
      let tokens = multipleLines[i].split(' ');      
      let list = tokens.map((x)=> { index++; return new OldFile(x, index); });
      index++;

      list.push(new OldFile("\n", index));

      //if (isFromEditor) {
      //  list.push(new OldFile("\n", index));
      //} else {
      //  list.push(new OldFile("\r\n", index));
      //}

      result = result.concat(list);
    }

    return result;
  }

  
  ConvertNewFileToToken(content: string, isFromEditor: boolean = false): NewFile[]{
    let multipleLines: string[] = [];

        content = content.replace(/\r/g, "");
        multipleLines = content.split('\n');

      // if (isFromEditor) {
        // multipleLines = content.split('\n');
      //} else {
        //  multipleLines = content.split('\r\n');
      //}

    let index = -1;
    let result: NewFile[] = [];

    for(let i=0; i<multipleLines.length; i++){
      let tokens = multipleLines[i].split(' ');
      let list = tokens.map((x)=> { index++; return new NewFile(x, index); });
      index++;

      list.push(new NewFile('\n', index));

      //if (isFromEditor) {
      //  list.push(new NewFile('\n', index));
      //} else {
      //  list.push(new NewFile("\r\n", index));
      //}

      result = result.concat(list);
    }

    return result;
  }

}
