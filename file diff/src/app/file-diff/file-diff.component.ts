import {AfterViewInit, Component, ViewEncapsulation} from '@angular/core';
import {TokenService} from '../token.service';
import { BaseToken, FileEnum, MarkerType, NewFile, NextStringMatch, OldFile, PreviousStringMatch } from '../Models/BaseToken';
import hljs from 'highlight.js'
import { HighlightJS } from 'ngx-highlightjs';

@Component({
  selector: 'app-file-diff',
  templateUrl: './file-diff.component.html',
  styleUrls: ['./file-diff.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class FileDiffComponent implements AfterViewInit {

  file1!: File;
  file2!: File;

  file1Event!: any;
  file2Event!: any;

  file1Content: string | ArrayBuffer | null = null;
  file2Content: string | ArrayBuffer | null = null;

  oldFileTokens: OldFile[] = [];
  newFileTokens: NewFile[] = [];

  enableFileEditor: boolean = false;
  enableFolderBrowse: boolean = false;
  public enableHighlight: boolean = false;

  preHtml: string = "<pre style=\'height:410px;margin-top:25px;\'><code>";
  DiffpreOldHtml: string = "<pre style=\'height:410px;margin-top:25px;\'> <code>";
  DiffpreNewHtml: string = "<pre style=\'height:410px;margin-top:25px;\'> <code>";
  postHtml: string = "</code></pre>";
  result1: string | ArrayBuffer | null = "";
  result2: string | ArrayBuffer | null = "";

  moveToRightBtnDisabled: boolean = true;
  moveToLeftBtnDisabled: boolean = true;

  oldFileMarkerIndex: number = -1;
  newFileMarkerIndex: number = -1;
  prevoldFileMarkerIndex: number = -1;
  prevnewFileMarkerIndex: number = -1;

  public DiffOldHtml: string = '';
  public DiffNewHtml: string = '';
  isDiffCalculated: boolean = false;

  oldFileClearTimeOut: any;
  newFileClearTimeout: any;

  markerType: MarkerType = MarkerType.None;

  file1LoadedCallback: Function = () => { };
  file2LoadedCallback: Function = () => { };

  isSingleFile: boolean = false;
  isLeftTreeHaveChange: boolean = false;
  isRightTreeHaveChange: boolean = false;
  allowPasteMarginLeft: string = "-10px";

  constructor(private service: TokenService, private hljs: HighlightJS) {

  }

  enableEditor() {
    this.enableFileEditor = !this.enableFileEditor;
    this.resetScreen();
  }

  enableFolderBrowseFn() {
    this.enableFolderBrowse = !this.enableFolderBrowse;
    this.enableFileEditor = false;
    this.resetScreen();
    if (this.enableFolderBrowse) {
      this.allowPasteMarginLeft = "15px";
    }
    else {
      this.allowPasteMarginLeft = "-10px";
    }
  }

  enableHighlightFn() {
    this.enableHighlight = !this.enableHighlight;
    if (this.isDiffCalculated) {
      this.generateDiffHtml();
    }
  }

  resetScreen() {
    this.DiffNewHtml = '';
    this.DiffOldHtml = '';
    this.file1Content = null;
    this.file2Content = null;
    this.isDiffCalculated = false;
    this.newFileTokens = [];
    this.oldFileTokens = [];
    this.result1 = null;
    this.result2 = null;
    this.isLeftTreeHaveChange = false;
    this.isRightTreeHaveChange = false;
    this.newFileMarkerIndex = -1;
    this.oldFileMarkerIndex = -1;

    if (this.file2Event != undefined)
      this.file2Event.target.value = '';

    if (this.file1Event != undefined)
      this.file1Event.target.value = '';
  }

  reduceMemoryConsumption() {
    this.DiffNewHtml = '';
    this.DiffOldHtml = '';
    this.isDiffCalculated = false;
    this.newFileTokens = [];
    this.oldFileTokens = [];
    this.result1 = null;
    this.result2 = null;

    if (this.file2Event != undefined)
      this.file2Event.target.value = '';

    if (this.file1Event != undefined)
      this.file1Event.target.value = '';
  }

  ngAfterViewInit(): void {


  }

  findDiff(diffSingleFile: boolean = false) {
    this.markerType = MarkerType.None;
    this.isSingleFile = diffSingleFile;
    this.isLeftTreeHaveChange = false;
    this.isRightTreeHaveChange = false;
    this.newFileMarkerIndex = -1;
    this.oldFileMarkerIndex = -1;
    this.prevnewFileMarkerIndex = -1;
    this.prevoldFileMarkerIndex = -1;

    if (this.file1Content != null && this.file2Content != null) {
      this.oldFileTokens = this.service.ConvertOldFileToToken(this.file1Content as string, this.enableFileEditor);
      this.newFileTokens = this.service.ConvertNewFileToToken(this.file2Content as string, this.enableFileEditor);
      this.processTokens();
      this.isDiffCalculated = true;
    } else if (this.file1Content != null && this.file2Content == null && this.result1 != null && diffSingleFile) {
      this.generateDiffHtmlForSingleFile();
      this.isDiffCalculated = true;
    }
    else if (this.file2Content != null && this.file1Content == null && this.result2 != null && diffSingleFile) {
      this.generateDiffHtmlForSingleFile();
      this.isDiffCalculated = true;
    }

    console.log(this.oldFileTokens);
    console.log(this.newFileTokens);
  }


  processTokens() {
    // this.findDeletedTokensInOldFile();
    // this.findNewTokensInNewFile();

    if (!this.oldFileTokens.some(x => x.IsDeleted) && !this.newFileTokens.some(x => x.IsNew)) {
      if (this.enableFileEditor) {
        this.DiffOldHtml = this.enableHighlight ? this.preHtml + hljs.highlightAuto(this.file1Content as string).value + this.postHtml : this.preHtml + "<xmp>" + this.file1Content + "</xmp>" + this.postHtml;
        this.DiffNewHtml = this.enableHighlight ? this.preHtml + hljs.highlightAuto(this.file2Content as string).value + this.postHtml : this.preHtml + "<xmp>" + this.file2Content + "</xmp>" + this.postHtml;
      } else {
        // result1 and result2 are applying highlight pipe so no need of conversion to color syntax in code.
        this.DiffOldHtml = this.enableHighlight ? this.preHtml + hljs.highlightAuto(this.file1Content as string).value + this.postHtml : this.preHtml + "<xmp>" + this.file1Content + "</xmp>" + this.postHtml;
        this.DiffNewHtml = this.enableHighlight ? this.preHtml + hljs.highlightAuto(this.file2Content as string).value + this.postHtml : this.preHtml + "<xmp>" + this.file2Content + "</xmp>" + this.postHtml;
      }
    }else {
      this.generateDiffHtml();
    }

    this.isDiffCalculated = true;

    this.isLeftTreeHaveChange = this.oldFileTokens.some(x => x.IsDeleted);
    this.isRightTreeHaveChange = this.newFileTokens.some(x => x.IsNew);

    console.clear();
    console.log(this.oldFileTokens);
    console.log(this.newFileTokens);

  }

  tokenMoveToRight() {
    let oldTokens = this.oldFileTokens.filter(x => x.IsDeleted && x.Token != ' ' && x.Token != this.getNewLineBasedOnEditor() && x.Token != '');

    if (this.oldFileMarkerIndex > -1 && this.oldFileMarkerIndex < oldTokens.length) {
      let currentSelectedToken = oldTokens[this.oldFileMarkerIndex];
      let preValidToken = this.oldFileTokens.filter(x=> x.Index == currentSelectedToken.NearestIndex)[0];

      let itemsToMove: OldFile[] = [];
      let itemToPush: OldFile = currentSelectedToken;
      let insertedItem = undefined;
      let _nextIndex = -1;

      _nextIndex = itemToPush.Index;
      _nextIndex = this.oldFileTokens.findIndex(x => x.Index == _nextIndex);

      do {

        if (itemToPush.Index ! > -1) {
          itemsToMove.push(itemToPush);
          _nextIndex--;
        } else {
          if (itemToPush.Index == -1)
            _nextIndex--;
          else
            break;
        }

        let nextItem = this.oldFileTokens[(_nextIndex - 1)];

        if (nextItem.Index >= currentSelectedToken.NearestIndex && !nextItem.IsDeleted && !nextItem.Moved && !nextItem.Inserted) {
          if (nextItem.Token != '' && nextItem.Token != ' ' && nextItem.Token != '\n') {
            break;
          }
          itemToPush = nextItem;
        } else {

          if (nextItem.IsDeleted) {
            insertedItem = undefined;
            itemToPush = new OldFile("", -1, false, false);;
            continue;
          }

          if (nextItem.Moved || nextItem.Inserted) {
            insertedItem = nextItem;
            insertedItem.OriginalIndex = nextItem.Moved ? _nextIndex : nextItem.OriginalIndex;
            itemToPush = new OldFile("", -2, false, false);;
            continue;

          }
        }

      } while(!itemToPush.IsDeleted)

      console.clear();
      console.log(this.oldFileTokens);
      console.log(this.newFileTokens);
      console.log("Items to move");
      console.log(itemsToMove);
      console.log("insertedItem");
      console.log(insertedItem);
      console.log("Current selected Item");
      console.log(currentSelectedToken);

      let convertList: NewFile[] = [];

      for (var i = 0; i < itemsToMove.length; i++) {
        let element = itemsToMove[i];
        let newFile: NewFile = new NewFile(element.Token, -1, false, true);
        newFile.OriginalIndex = element.Index;
        newFile.SubIndex = element.SubIndex;
        newFile.NearestIndex = preValidToken.TargetIndex;
        convertList.push(newFile);
      }

      let rightsideTargetIndex = -1;

      if (insertedItem == undefined) {
        rightsideTargetIndex = this.newFileTokens.findIndex(x => x.Index == preValidToken.TargetIndex);
      }
      else {
        rightsideTargetIndex = insertedItem.OriginalIndex;
      }

      console.log("rightside targetIndex before subindex");
      console.log(rightsideTargetIndex);

      let z = 1;
      let insertToken = this.newFileTokens.filter(x => x.Index == (rightsideTargetIndex + z))[0]; //[(rightsideTargetIndex + z)];
      let targetSubindex = itemsToMove[0].SubIndex;

      while (insertToken.Inserted && insertToken.SubIndex != -1 && insertToken.SubIndex < targetSubindex) {
        z++;
        insertToken = this.newFileTokens[(rightsideTargetIndex + z)];
      }
      rightsideTargetIndex = rightsideTargetIndex + z;


      console.log("rightside targetIndex after subindex");
      console.log(rightsideTargetIndex);

      for (i = 0; i< convertList.length; i++) {
        this.newFileTokens.splice(rightsideTargetIndex, 0, convertList[i]);
      }

      currentSelectedToken.IsMarkerInCurrentToken = false;
      currentSelectedToken.IsDeleted = false;

      oldTokens = this.oldFileTokens.filter(x => x.IsDeleted && x.Token != ' ' && x.Token != this.getNewLineBasedOnEditor() && x.Token != '');

      if (this.oldFileMarkerIndex == oldTokens.length - 1) {
        if (this.oldFileMarkerIndex > -1 && this.oldFileMarkerIndex !=0) {
          this.oldFileMarkerIndex--;
        }
      }

      this.generateOldFileHtml();
      this.generateNewFileHtml();

      for (var h = 0; h < itemsToMove.length; h++) {
        let _movedItem = this.oldFileTokens.filter(x => x.Index == itemsToMove[h].Index)[0];
        _movedItem.IsDeleted = false;
        _movedItem.Moved = true;
        _movedItem.OriginalIndex = itemsToMove[h].Index;
      }
    }

    if (this.oldFileMarkerIndex == 0 && oldTokens.length == 0) {
      this.oldFileMarkerIndex = -1;
    }
  }

  tokenMoveToLeft() {
    let newTokens = this.newFileTokens.filter(x => x.IsNew && x.Token != ' ' && x.Token != this.getNewLineBasedOnEditor() && x.Token != '');

    if (this.newFileMarkerIndex > -1 && this.newFileMarkerIndex < newTokens.length) {
      let currentSelectedToken = newTokens[this.newFileMarkerIndex];
      let preValidToken = this.newFileTokens.filter(x => x.Index == currentSelectedToken.NearestIndex)[0];

      let itemsToMove: NewFile[] = [];
      let itemToPush: NewFile = currentSelectedToken;
      let insertedItem = undefined;
      let _nextIndex = -1;

      _nextIndex = itemToPush.Index;
      _nextIndex = this.newFileTokens.findIndex(x => x.Index == _nextIndex);

      do {

        if (itemToPush.Index! > -1) {
          itemsToMove.push(itemToPush);
          _nextIndex--;
        } else {
          if (itemToPush.Index == -1)
            _nextIndex--;
          else
            break;
        }

        let nextItem = this.newFileTokens[(_nextIndex - 1)];

        if (nextItem.Index >= currentSelectedToken.NearestIndex && !nextItem.IsNew && !nextItem.Moved && !nextItem.Inserted) {
          if (nextItem.Token != '' && nextItem.Token != ' ' && nextItem.Token != '\n') {
            break;
          }
          itemToPush = nextItem;
        } else {

          if (nextItem.IsNew) {
            insertedItem = undefined;
            itemToPush = new NewFile("", -1, false, false);;
            continue;
          }

          if (nextItem.Moved || nextItem.Inserted) {
            insertedItem = nextItem;
            insertedItem.OriginalIndex = nextItem.Moved ? _nextIndex : nextItem.OriginalIndex;
            itemToPush = new NewFile("", -2, false, false);;
            continue;

          }
        }

      } while (!itemToPush.IsNew)

      console.clear();
      console.log(this.oldFileTokens);
      console.log(this.newFileTokens);
      console.log(itemsToMove);
      console.log("insertedItem");
      console.log(insertedItem);
      console.log("Current selected Item");
      console.log(currentSelectedToken);

      let convertList: OldFile[] = [];

      for (var i = 0; i < itemsToMove.length; i++) {
        let element = itemsToMove[i];
        let oldFile: OldFile = new OldFile(element.Token, -1, false, true);
        oldFile.OriginalIndex = element.Index;
        oldFile.SubIndex = element.SubIndex;
        oldFile.NearestIndex = preValidToken.TargetIndex;
        convertList.push(oldFile);
      }

      let leftsideTargetIndex = -1;

      if (insertedItem == undefined) {
        leftsideTargetIndex = this.oldFileTokens.findIndex(x => x.Index == preValidToken.TargetIndex);
      }
      else {
        leftsideTargetIndex = insertedItem.Index;
      }

      console.log("LeftSide Target Index before subIndex");
      console.log(leftsideTargetIndex);

      let z = 1;
      let insertToken = this.oldFileTokens.filter(x => x.Index == (leftsideTargetIndex + z))[0]; //[(leftsideTargetIndex + z)];
      let targetSubindex = itemsToMove[0].SubIndex;

      while (insertToken.Inserted && insertToken.SubIndex != -1 && insertToken.SubIndex < targetSubindex) {
        z++;
        insertToken = this.oldFileTokens[(leftsideTargetIndex + z)];
      }
      leftsideTargetIndex = leftsideTargetIndex + z;

      console.log("LeftSide Target Index after subIndex");
      console.log(leftsideTargetIndex);

      for (i = 0; i < convertList.length; i++) {
        this.oldFileTokens.splice(leftsideTargetIndex, 0, convertList[i]);
      }

      currentSelectedToken.IsMarkerInCurrentToken = false;
      currentSelectedToken.IsNew = false;

      newTokens = this.newFileTokens.filter(x => x.IsNew && x.Token != ' ' && x.Token != this.getNewLineBasedOnEditor() && x.Token != '');

      if (this.newFileMarkerIndex == newTokens.length - 1) {
        if (this.newFileMarkerIndex > -1 && this.newFileMarkerIndex != 0) {
          this.newFileMarkerIndex--;
        }
      }

      this.generateOldFileHtml();
      this.generateNewFileHtml();

      for (var h = 0; h < itemsToMove.length; h++) {
        let _movedElement = this.newFileTokens.filter(x => x.Index == itemsToMove[h].Index)[0];
        _movedElement.IsNew = false;
        _movedElement.Moved = true;
        _movedElement.OriginalIndex = itemsToMove[h].Index;
      }

    }

    if (this.newFileMarkerIndex == 0 && newTokens.length == 0) {
      this.newFileMarkerIndex = -1;
    }
  }

  generateDiffHtmlForSingleFile() {
    if (this.isSingleFile) {

      if (this.file1Content != null && this.file2Content == null && this.result1 != null) {
        this.DiffOldHtml = this.enableHighlight ? this.preHtml + hljs.highlightAuto(this.file1Content as string).value + this.postHtml
                                : this.preHtml + "<xmp>" + this.file1Content + "</xmp>" + this.postHtml;;
        this.isDiffCalculated = true;
      }

      if (this.file2Content != null && this.file1Content == null && this.result2 != null) {
        this.DiffNewHtml = this.enableHighlight ? this.preHtml + hljs.highlightAuto(this.file2Content as string).value + this.postHtml
                                : this.preHtml + "<xmp>" + this.file2Content + "</xmp>" + this.postHtml;
        this.isDiffCalculated = true;
      }

    }
  }

  generateDiffHtml() {
    if (this.isSingleFile) {
      this.generateDiffHtmlForSingleFile();
    } else {
      this.generateOldFileHtml();
      this.generateNewFileHtml();
    }
  }

  scrollLeftFile(obj: FileDiffComponent) {
    let container = document.getElementById('preOld');
    let markerTokens = obj.oldFileTokens.filter(x => x.IsMarkerInCurrentToken);

    if (container != undefined && container != null && obj.IsObjectDefined(markerTokens)) {
      const dynamicSpan = document.getElementById('leftspanContentMarker_' + markerTokens[0].Index);

      if (dynamicSpan != undefined && dynamicSpan != null) {
        const spanPosition = dynamicSpan.getBoundingClientRect().top + container.scrollTop;
        dynamicSpan.scrollIntoView(false);

       // container.scrollTop = dynamicSpan.offsetTop - 10;
      }
    }

    obj.timeoutClearForOldFile();
  }

  scrollRightFile(obj: FileDiffComponent) {
    let container = document.getElementById('preNew');
    let markerTokens = obj.newFileTokens.filter(x => x.IsMarkerInCurrentToken);

    if (container != undefined && container != null && obj.IsObjectDefined(markerTokens)) {
      const dynamicSpan = document.getElementById('rightspanContentMarker_' + markerTokens[0].Index);

      if (dynamicSpan != undefined && dynamicSpan != null) {
        const spanPosition = dynamicSpan.getBoundingClientRect().top + container.scrollTop;
        dynamicSpan.scrollIntoView(false);

        //container.scrollTop = dynamicSpan.offsetTop - 10;
      }
    }

    obj.timeoutClearForNewFile();
  }

  getNewLineBasedOnEditor() {
    //if (this.enableFileEditor) {
      return '\n';
    //}

    //return '\r\n';
  }

  leftMarkerDown() {
    if (this.isDiffCalculated) {
      this.markerType = MarkerType.Down;
      let deletedTokens = this.oldFileTokens.filter(x => x.IsDeleted && x.Token != ' ' && x.Token != this.getNewLineBasedOnEditor() && x.Token != '');

      this.oldFileMarkerIndex++;

      if (this.oldFileMarkerIndex > -1 && this.oldFileMarkerIndex < deletedTokens.length) {

        this.oldFileTokens[deletedTokens[this.oldFileMarkerIndex].Index].IsMarkerInCurrentToken = true;

        if (this.prevoldFileMarkerIndex > -1) {
          this.oldFileTokens[this.prevoldFileMarkerIndex].IsMarkerInCurrentToken = false;
        }
        this.prevoldFileMarkerIndex = deletedTokens[this.oldFileMarkerIndex].Index;

      } else {

        if (this.oldFileMarkerIndex == -1) {
          this.oldFileMarkerIndex = 0;
        } else {
          this.oldFileMarkerIndex = deletedTokens.length - 1;
        }

      }

     //////// this.generateDiffHtml();

      this.oldFileClearTimeOut = setTimeout(this.scrollLeftFile, 100, this);
    }
  }

  leftMarkerUp() {
    if (this.isDiffCalculated) {
      this.markerType = MarkerType.Up;
      let deletedTokens = this.oldFileTokens.filter(x => x.IsDeleted && x.Token != ' ' && x.Token != this.getNewLineBasedOnEditor() && x.Token != '');

      this.oldFileMarkerIndex--;

      if (this.oldFileMarkerIndex > -1 && this.oldFileMarkerIndex < deletedTokens.length) {

        this.oldFileTokens[deletedTokens[this.oldFileMarkerIndex].Index].IsMarkerInCurrentToken = true;

        if (this.prevoldFileMarkerIndex > -1) {
          this.oldFileTokens[this.prevoldFileMarkerIndex].IsMarkerInCurrentToken = false;
        }
        this.prevoldFileMarkerIndex = deletedTokens[this.oldFileMarkerIndex].Index;

      } else {

        if (this.oldFileMarkerIndex == -1) {
          this.oldFileMarkerIndex = 0;
        } else {
          this.oldFileMarkerIndex = deletedTokens.length - 1;
        }

      }

      /////this.generateDiffHtml();
      this.oldFileClearTimeOut = setTimeout(this.scrollLeftFile, 100, this);
    }
  }

  rightMarkerUp() {
    if (this.isDiffCalculated) {
      this.markerType = MarkerType.Up;
      let newTokens = this.newFileTokens.filter(x => x.IsNew && x.Token != ' ' && x.Token != this.getNewLineBasedOnEditor() && x.Token != '');

      this.newFileMarkerIndex--;

      if (this.newFileMarkerIndex > -1 && this.newFileMarkerIndex < newTokens.length) {

        this.newFileTokens[newTokens[this.newFileMarkerIndex].Index].IsMarkerInCurrentToken = true;

        if (this.prevnewFileMarkerIndex > -1) {
          this.newFileTokens[this.prevnewFileMarkerIndex].IsMarkerInCurrentToken = false;
        }
        this.prevnewFileMarkerIndex = newTokens[this.newFileMarkerIndex].Index;

      } else {

        if (this.newFileMarkerIndex == -1) {
          this.newFileMarkerIndex = 0;
        } else {
          this.newFileMarkerIndex = newTokens.length - 1;
        }

      }

      /////this.generateDiffHtml();
       this.newFileClearTimeout = setTimeout(this.scrollRightFile, 100, this);
    }
  }

  rightMarkerDown() {
    if (this.isDiffCalculated) {
      this.markerType = MarkerType.Down;
      let newTokens = this.newFileTokens.filter(x => x.IsNew && x.Token != ' ' && x.Token != this.getNewLineBasedOnEditor() && x.Token != '');

      this.newFileMarkerIndex++;

      if (this.newFileMarkerIndex > -1 && this.newFileMarkerIndex < newTokens.length) {

        this.newFileTokens[newTokens[this.newFileMarkerIndex].Index].IsMarkerInCurrentToken = true;

        if (this.prevnewFileMarkerIndex > -1) {
          this.newFileTokens[this.prevnewFileMarkerIndex].IsMarkerInCurrentToken = false;
        }
        this.prevnewFileMarkerIndex = newTokens[this.newFileMarkerIndex].Index;

      } else {

        if (this.newFileMarkerIndex == -1) {
          this.newFileMarkerIndex = 0;
        } else {
          this.newFileMarkerIndex = newTokens.length - 1;
        }

      }

      //////this.generateDiffHtml();
       this.newFileClearTimeout = setTimeout(this.scrollRightFile, 100, this);
    }
  }

  timeoutClearForOldFile() {
    clearTimeout(this.oldFileClearTimeOut);
  }

  timeoutClearForNewFile() {
    clearTimeout(this.newFileClearTimeout);
  }

  spanClickOld(event: any) {
    let id = event.srcElement.id;

    let isDeleteClicked = false;

    if(id==undefined || id=='') {
      isDeleteClicked = true;
      id = (event.srcElement as HTMLElement).parentElement?.parentElement?.id.split('_')[1];
    } else{
      id = id.split('_')[1];
    }

    if(isDeleteClicked){
      let index = this.oldFileTokens.findIndex(x=>x.Index==id);

      let delTokens = this.oldFileTokens.filter(x=>x.IsDeleted);

      if(this.oldFileMarkerIndex == delTokens.length-1){
        this.oldFileMarkerIndex--;
      }

      this.oldFileTokens.splice(index,1);
      this.generateOldFileHtml();
      return;
    }

  }

  spanClickNew(event: any) {
    let id = event.srcElement.id;

    let isDeleteClicked = false;

    if(id==undefined || id=='') {
      isDeleteClicked = true;
      id = (event.srcElement as HTMLElement).parentElement?.parentElement?.id.split('_')[1];
    } else{
      id = id.split('_')[1];
    }

    if(isDeleteClicked){
      let index = this.newFileTokens.findIndex(x=>x.Index==id);

      let newTokens = this.newFileTokens.filter(x=>x.IsNew);

      if (this.newFileMarkerIndex == newTokens.length-1){
        this.newFileMarkerIndex--;
      }

      this.newFileTokens.splice(index,1);
      this.generateNewFileHtml();
      return;
    }

  }

  generateNewFileHtml() {
    let resConcat = "";

    for (let i = 0; i < this.newFileTokens.length; i++) {
      let tokenData = this.newFileTokens[i];
      if (tokenData.IsNew) {
        resConcat = resConcat + "<span id=\'" + tokenData.Index + "\' class=\'spanContentNew\'>" + this.replaceAngleBracets(tokenData.Token) + "</span><span> </span>";
      } else {

        if (this.enableHighlight) {
          resConcat = resConcat + "<span id=\'" + tokenData.Index + "\' class=\'spanContentNotNew\'>" + hljs.highlightAuto(tokenData.Token).value + "</span><span> </span>";
        } else {
          resConcat = resConcat + "<span id=\'" + tokenData.Index + "\' class=\'spanContentNotNew\'>" + this.replaceAngleBracets(tokenData.Token) + "</span><span> </span>";
        }

      }
    }

    this.DiffNewHtml = this.DiffpreNewHtml + resConcat + this.postHtml;
  }

  replaceAngleBracets(token: string) {
    return token
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  generateOldFileHtml() {
    let resConcat = "";

    for (let i = 0; i < this.oldFileTokens.length; i++) {
      let tokenData = this.oldFileTokens[i];
      if (tokenData.IsDeleted) {
        resConcat = resConcat + "<span id=\'" + tokenData.Index + "\' class=\'spanContentDeleted\'>" + this.replaceAngleBracets(tokenData.Token) + "</span><span> </span>";
      } else {
        if (this.enableHighlight) {
          resConcat = resConcat + "<span id=\'" + tokenData.Index + "\' class=\'spanContentNotDeleted\'>" + hljs.highlightAuto(tokenData.Token).value + "</span><span> </span>";
        } else {
          resConcat = resConcat + "<span id=\'" + tokenData.Index + "\' class=\'spanContentNotDeleted\'>" + this.replaceAngleBracets(tokenData.Token) + "</span><span> </span>";
        }
      }
    }

    this.DiffOldHtml = this.DiffpreOldHtml +  resConcat  + this.postHtml;

  }

  IsObjectDefined(obj: any): boolean {
    if (obj == null || obj == undefined)
      return false;

    return true;
  }

  onFile1Selected(event: any) {
    this.file1 = event.target.files[0];
    this.isLeftTreeHaveChange = false;
    this.isRightTreeHaveChange = false;
    this.ReadFile1Content(this.file1);
    this.DiffNewHtml = '';
    this.DiffOldHtml = '';
    this.isDiffCalculated = false;
    this.file1Event = event;
  }

  onFile2Selected(event: any) {
    this.file2 = event.target.files[0];
    this.isLeftTreeHaveChange = false;
    this.isRightTreeHaveChange = false;
    this.ReadFile2Content(this.file2);
    this.DiffNewHtml = '';
    this.DiffOldHtml = '';
    this.isDiffCalculated = false;
    this.file2Event = event;
  }

  ReadFile1Content(file: File) {
    let fileReader: FileReader = new FileReader();
    var content: string | null | ArrayBuffer = null;
    let self = this;
    fileReader.onloadend = function (x) {
      self.file1Content = fileReader.result;
      self.result1 = self.preHtml + self.file1Content + self.postHtml;

      self.file1LoadedCallback();
    }
    fileReader.readAsText(file);
  }


  ReadFile2Content(file: File) {
    let fileReader: FileReader = new FileReader();
    var content: string | null | ArrayBuffer = null;
    let self = this;
    fileReader.onloadend = function (x) {
      self.file2Content = fileReader.result;
      self.result2 = self.preHtml + self.file2Content + self.postHtml;
      self.file2LoadedCallback();
    }
    fileReader.readAsText(file);
  }

  file1EditorChange($event: any) {
    this.file1Content = $event.target.innerText;
  }

  async file2EditorChange($event: any) {
    this.file2Content = $event.target.innerText;
  }

  syntaxHighlighFn(ishighlight: boolean) {
    this.enableHighlight = ishighlight;
    if (this.isDiffCalculated) {
      this.generateDiffHtml();
    }
  }

}
