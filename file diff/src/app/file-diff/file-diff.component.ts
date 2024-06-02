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

  changeToNotMatchtoken(index: number, oppoNextMatchToken: BaseToken | undefined){
      this.oldFileTokens[index].IsDeleted = true;
      if( this.oldFileTokens[index].TargetIndex < this.newFileTokens.length){
        let tokenData =  this.oldFileTokens[index];
        this.newFileTokens[tokenData.TargetIndex].IsNew = true;
        this.newFileTokens[tokenData.TargetIndex].TargetIndex = -1;
      }
      this.oldFileTokens[index].TargetIndex = -1;
  }

  MatchPreviousAndCurrentTokensToAdjustTargetIndex(){

    for (let i = 1; i < this.oldFileTokens.length; i++) {
      let tokenData = this.oldFileTokens[i];

      // valid matched token
      if(!tokenData.IsDeleted)
      {
        let prevTokenOfSameList = this.findPreviousMatchStringToken(tokenData.Index, FileEnum.OldFile);
        let targetIndex = prevTokenOfSameList.GetPreviousMatchTokenData()?.TargetIndex;
        if(targetIndex){
          let oppositePrevToken = this.newFileTokens[targetIndex];
          let oppositeNextMatch = this.findNextValidStringInOppositeToken(oppositePrevToken.Index, tokenData.Token, FileEnum.NewFile);
          if(oppositeNextMatch.GetNextMatchTokenData()!=undefined){
            let oppoNextMatchTokenData = oppositeNextMatch.GetNextMatchTokenData();
            if(oppoNextMatchTokenData!=undefined){
              if(oppoNextMatchTokenData.Token==tokenData.Token){
                // both token same so no need of change in TargetIndex and not change in deleted or new
              } else{
                this.changeToNotMatchtoken(tokenData.Index, oppoNextMatchTokenData);
              }
            } else{
              this.changeToNotMatchtoken(tokenData.Index, undefined);
            }
          } else{
            this.changeToNotMatchtoken(tokenData.Index, undefined);
          }
        }
      }
    }
  }

  IsValidTokenInLeftTree(tokenData : BaseToken, level: number): {isValid: boolean, validRightToken: BaseToken | undefined} {

    if(tokenData==undefined || level > 2)
    {
      return {isValid: true, validRightToken: undefined};
    }

    let previousToken = this.findPreviousMatchStringToken(tokenData.Index, FileEnum.OldFile).GetPreviousMatchTokenData();
    if (previousToken) {
      let targetToken = this.newFileTokens[previousToken.TargetIndex];
      let nextValidTokenFromRightTree = this.findNextValidStringInOppositeToken(targetToken.Index, tokenData.Token, FileEnum.NewFile).GetNextMatchTokenData();
      let matchTokenFromRightTree = this.findNextMatchStringInOppositeToken(targetToken.Index, tokenData.Token, FileEnum.NewFile).GetNextMatchTokenData();


      if (nextValidTokenFromRightTree) {
        if (nextValidTokenFromRightTree.Token == tokenData.Token) {
          if (true && this.IsValidTokenInLeftTree(previousToken, (level + 1)).isValid) {
            return { isValid: true, validRightToken: nextValidTokenFromRightTree };
          }
        } else {
          if (matchTokenFromRightTree && nextValidTokenFromRightTree.TargetIndex < matchTokenFromRightTree?.TargetIndex) {
            //  this line needs to add in Right Tree
            if (!(nextValidTokenFromRightTree as NewFile).IsNew) {
              return { isValid: false, validRightToken: matchTokenFromRightTree };
            }
            return { isValid: true, validRightToken: matchTokenFromRightTree };
          }
          else {
            // needs to check whether nextValidTokenFromRightTree is a validToken or not
            let isValiddata = this.IsVaidTokenInRightTree(nextValidTokenFromRightTree, 0);
            if (!isValiddata.isValid) {
              let secondValidPrevToken = this.findPreviousMatchStringToken(nextValidTokenFromRightTree.Index, FileEnum.NewFile).GetPreviousMatchTokenData();
              let secondnextValidToken = this.findNextValidStringInOppositeToken(nextValidTokenFromRightTree.Index, nextValidTokenFromRightTree.Token, FileEnum.NewFile).GetNextMatchTokenData();
              if (secondValidPrevToken && matchTokenFromRightTree
                && secondValidPrevToken.TargetIndex < matchTokenFromRightTree.TargetIndex
                && (secondnextValidToken == undefined || (secondnextValidToken && matchTokenFromRightTree.TargetIndex < secondnextValidToken?.TargetIndex))) {
                return { isValid: true, validRightToken: matchTokenFromRightTree };
              } else {
                return { isValid: false, validRightToken: matchTokenFromRightTree };
              }
            }
          }
        }
      }
    } else {
      if (tokenData.Token == this.newFileTokens[tokenData.TargetIndex].Token) {
        return { isValid: true, validRightToken: this.newFileTokens[tokenData.TargetIndex] };
      }

    }


    return {isValid: false, validRightToken: undefined};
  }

  IsVaidTokenInRightTree(tokenData: BaseToken, level: number): {isValid: boolean, validLeftToken: BaseToken | undefined} {

    if(tokenData==undefined || level > 2)
    {
      return {isValid: true, validLeftToken: undefined};
    }

    let previousToken = this.findPreviousMatchStringToken(tokenData.Index, FileEnum.NewFile).GetPreviousMatchTokenData();
    if(previousToken){
      let targetToken = this.oldFileTokens[previousToken.TargetIndex];
      let validTokenFromLeftTree = this.findNextValidStringInOppositeToken(targetToken.Index, tokenData.Token, FileEnum.OldFile).GetNextMatchTokenData();
      let matchTokenFromLeftTree = this.findNextMatchStringInOppositeToken(targetToken.Index, tokenData.Token, FileEnum.OldFile).GetNextMatchTokenData();

      if(validTokenFromLeftTree){
        if(validTokenFromLeftTree.Token==tokenData.Token){
          if (true && this.IsVaidTokenInRightTree(previousToken, (level +1)).isValid){
            return {isValid: true, validLeftToken: validTokenFromLeftTree}
          }
        } else{
          if(matchTokenFromLeftTree && validTokenFromLeftTree.TargetIndex < matchTokenFromLeftTree?.TargetIndex){
            return { isValid: true, validLeftToken: matchTokenFromLeftTree};
          }
        }
      }
    }else{
      if(tokenData.Token == this.oldFileTokens[tokenData.TargetIndex].Token){
        return {isValid: true, validLeftToken: this.oldFileTokens[tokenData.TargetIndex]};
      }
    }

    return {isValid: false, validLeftToken: undefined};
  }

  normalizeTokens() {
    let i = 0;
    let minLength = Math.min(this.oldFileTokens.length, this.newFileTokens.length);

    while (i < minLength) {
      if (this.newFileTokens[i].Token == this.oldFileTokens[i].Token) {
        this.newFileTokens[i].IsNew = false;
        this.oldFileTokens[i].IsDeleted = false;
        this.oldFileTokens[i].TargetIndex = i;
        this.newFileTokens[i].TargetIndex = i;
      }

      i++;
    }

    let mismatchLeftTargetIndex: number[] = [];
    let mismatchRightTargetIndex: number[] = [];

    let NotdeletedTokens = this.oldFileTokens.filter(x => !x.IsDeleted && x.Token != '' && x.Token != ' ' && x.Token != '\n');
    for (var j = 1; j < NotdeletedTokens.length; j++) {
      let element = NotdeletedTokens[j];
      let prevElement = this.findPreviousMatchStringToken(element.Index, FileEnum.OldFile).GetPreviousMatchTokenData();

      let nextindex = j + 1;
      let nextElement = undefined;

      if (nextindex < NotdeletedTokens.length) {
        nextElement = NotdeletedTokens[nextindex];
      }

      if (prevElement && !(prevElement.TargetIndex < element.TargetIndex && (!nextElement || nextElement.TargetIndex > element.TargetIndex))) {
        this.oldFileTokens[element.Index].IsDeleted = true;

        mismatchLeftTargetIndex.push(element.Index);

        if (element.TargetIndex > -1 && element.TargetIndex < this.newFileTokens.length) {
         // this.newFileTokens[element.TargetIndex].TargetIndex = -1;
        }

        //element.TargetIndex = -1;
      }

    }


    let NotNewTokens = this.newFileTokens.filter(x => !x.IsNew && x.Token != '' && x.Token != ' ' && x.Token != '\n');
    for (var j = 1; j < NotNewTokens.length; j++) {
      let element = NotNewTokens[j];
      let prevElement = this.findPreviousMatchStringToken(element.Index, FileEnum.NewFile).GetPreviousMatchTokenData();

      let nextindex = j + 1;
      let nextElement = undefined;

      if (nextindex < NotNewTokens.length) {
        nextElement = NotNewTokens[nextindex];
      }

      if (prevElement && !(prevElement.TargetIndex < element.TargetIndex && (!nextElement || nextElement.TargetIndex > element.TargetIndex))) {
        this.newFileTokens[element.Index].IsNew = true;

        mismatchRightTargetIndex.push(element.Index);

        if (element.TargetIndex > -1 && element.TargetIndex < this.oldFileTokens.length) {
          //this.oldFileTokens[element.TargetIndex].TargetIndex = -1;
        }

        //element.TargetIndex = -1;
      }

    }


    let deletedTokens = this.oldFileTokens.filter(x => x.IsDeleted && x.Token != '' && x.Token != ' ' && x.Token != '\n');
    for (var j = 0; j < deletedTokens.length; j++) {
      let element = deletedTokens[j];
      if (element.IsDeleted && element.TargetIndex > -1 && element.TargetIndex < this.newFileTokens.length && element.Token == this.newFileTokens[element.TargetIndex].Token) {

        let prevElement = this.findPreviousMatchStringToken(element.Index, FileEnum.OldFile).GetPreviousMatchTokenData();
        let tarprevElement = this.findPreviousMatchStringToken(element.TargetIndex, FileEnum.NewFile).GetPreviousMatchTokenData();

        if (prevElement && prevElement.TargetIndex < element.TargetIndex) {
          if (!mismatchLeftTargetIndex.some(x => x == element.Index)) {

            this.oldFileTokens[element.Index].IsDeleted = false;

            if (tarprevElement && tarprevElement.TargetIndex < this.newFileTokens[element.TargetIndex].TargetIndex) {
              if (!mismatchRightTargetIndex.some(x => x == element.TargetIndex)) {
                this.newFileTokens[element.TargetIndex].IsNew = false;
              }
            }
          }
        }

      }
    }

    let newTokens = this.newFileTokens.filter(x => x.IsNew && x.Token != '' && x.Token != ' ' && x.Token != '\n');
    for (var j = 0; j < newTokens.length; j++) {
      let element = newTokens[j];
      if (element.IsNew && element.TargetIndex > -1 && element.TargetIndex < this.oldFileTokens.length && element.Token == this.oldFileTokens[element.TargetIndex].Token) {

        if (!mismatchRightTargetIndex.some(x => x == element.Index)) {
          this.newFileTokens[element.Index].IsNew = false;

          //if (!mismatchLeftTargetIndex.some(x => x == element.TargetIndex)) {
          //  this.oldFileTokens[element.TargetIndex].IsDeleted = false;
          //}
        }

        if (!mismatchLeftTargetIndex.some(x => x == element.TargetIndex)) {
          this.oldFileTokens[element.TargetIndex].IsDeleted = false;
        }

      }
    }

    let k = 0;
    let minLengthtoProcess = Math.min(this.oldFileTokens.length, this.newFileTokens.length);

    if (this.oldFileTokens.length == minLengthtoProcess) {
      // left side is minlength
      while (k < minLengthtoProcess) {
        let element = this.oldFileTokens[k];

        let prevElement = this.findPreviousMatchStringToken(element.Index, FileEnum.OldFile).GetPreviousMatchTokenData();
        let tarprevElement = this.findPreviousMatchStringToken(element.TargetIndex, FileEnum.NewFile).GetPreviousMatchTokenData();

        /// Need to fix one token which is in valid token with wrong TargetIndex => Invalid Token
        if ((prevElement &&
               (prevElement.TargetIndex < element.TargetIndex))
         && ((tarprevElement &&
               (tarprevElement.TargetIndex > -1
                 && element.TargetIndex > -1
                 && element.TargetIndex < this.newFileTokens.length
                 && tarprevElement.TargetIndex < this.newFileTokens.length
                 && tarprevElement.TargetIndex > this.newFileTokens[element.TargetIndex].TargetIndex)))
          && this.newFileTokens[element.TargetIndex].Token == this.oldFileTokens[element.Index].Token
        )
        {
          this.newFileTokens[element.TargetIndex].IsNew = true;
          this.oldFileTokens[element.Index].IsDeleted = true;
          this.newFileTokens[element.TargetIndex].TargetIndex = -1;
          this.oldFileTokens[element.Index].TargetIndex = -1;
        }
        else
        {
          if (element.TargetIndex > -1 && element.TargetIndex < this.newFileTokens.length && this.newFileTokens[element.TargetIndex].Token == this.oldFileTokens[element.Index].Token) {
            this.newFileTokens[element.TargetIndex].IsNew = false;
            this.oldFileTokens[element.Index].IsDeleted = false;
            this.newFileTokens[element.TargetIndex].TargetIndex = element.Index;
            this.oldFileTokens[element.Index].TargetIndex = element.TargetIndex;
          }
        }

        k++;
      }
    }
    else {
      // right side is min length
      while (k < minLengthtoProcess) {
        let element = this.newFileTokens[k];

        let prevElement = this.findPreviousMatchStringToken(element.Index, FileEnum.NewFile).GetPreviousMatchTokenData();
        let tarprevElement = this.findPreviousMatchStringToken(element.TargetIndex, FileEnum.OldFile).GetPreviousMatchTokenData();

        /// Need to fix one token which is in valid token with wrong TargetIndex => Invalid Token
        if ((prevElement &&
               (prevElement.TargetIndex < element.TargetIndex))
          && ((tarprevElement &&
               (tarprevElement.TargetIndex > -1
                 && element.TargetIndex > -1
                 && element.TargetIndex < this.oldFileTokens.length
                 && tarprevElement.TargetIndex < this.oldFileTokens.length
                 && tarprevElement.TargetIndex > this.oldFileTokens[element.TargetIndex].TargetIndex)))
          && this.oldFileTokens[element.TargetIndex].Token == this.newFileTokens[element.Index].Token
        ) {
          this.newFileTokens[element.Index].IsNew = true;
          this.oldFileTokens[element.TargetIndex].IsDeleted = true;
          this.oldFileTokens[element.TargetIndex].TargetIndex = -1;
          this.newFileTokens[element.Index].TargetIndex =-1;
        }
        else
        {
          if (element.TargetIndex > -1 && element.TargetIndex < this.oldFileTokens.length && this.oldFileTokens[element.TargetIndex].Token == this.newFileTokens[element.Index].Token) {
            this.newFileTokens[element.Index].IsNew = false;
            this.oldFileTokens[element.TargetIndex].IsDeleted = false;
            this.oldFileTokens[element.TargetIndex].TargetIndex = element.Index;
            this.newFileTokens[element.Index].TargetIndex = element.TargetIndex;
          }
        }

        k++;
      }
    }

    for (var p = 0; p < mismatchLeftTargetIndex.length; p++) {
      this.oldFileTokens[mismatchLeftTargetIndex[p]].IsDeleted = true;
      let _targetIndexToChange = this.oldFileTokens[mismatchLeftTargetIndex[p]].TargetIndex;
      if (_targetIndexToChange != -1) {
        this.newFileTokens[_targetIndexToChange].TargetIndex = -1;
        this.oldFileTokens[mismatchLeftTargetIndex[p]].TargetIndex = -1
      }
    }

    for (var p = 0; p < mismatchRightTargetIndex.length; p++) {
      this.newFileTokens[mismatchRightTargetIndex[p]].IsNew = true;
      let _targetIndexToChange = this.newFileTokens[mismatchRightTargetIndex[p]].TargetIndex;
      if (_targetIndexToChange != -1) {
        this.oldFileTokens[_targetIndexToChange].TargetIndex = -1
        this.newFileTokens[mismatchRightTargetIndex[p]].TargetIndex = -1;
      }
    }

    for(i=0; i < this.oldFileTokens.length; i++){
      let ele = this.oldFileTokens[i];
      if(ele.Token == '' || ele.Token==' ' || ele.Token == '\n'){
        this.oldFileTokens[i].IsDeleted = false;
        this.oldFileTokens[i].TargetIndex = -1;
      }

      if (ele.TargetIndex == -1 && ele.Token != '' && ele.Token != ' ' && ele.Token != '\n') {
        ele.IsDeleted = true;
      }
    }

    for(i=0; i < this.newFileTokens.length; i++){
      let ele = this.newFileTokens[i];
      if(ele.Token == '' || ele.Token==' ' || ele.Token == '\n'){
        this.newFileTokens[i].IsNew = false;
        this.newFileTokens[i].TargetIndex = -1;
      }

      if (ele.TargetIndex == -1 && ele.Token != '' && ele.Token != ' ' && ele.Token != '\n') {
        ele.IsNew = true;
      }
    }

  }

  calculateSubIndexForLeftTree() {
    let nearestIndex = 0;
    let subIndex = 0;

    for (var i = 0; i < this.oldFileTokens.length; i++) {
      let ele = this.oldFileTokens[i];
      if (ele.Token != '' && ele.Token != ' ' && ele.Token != '\n' && !ele.IsDeleted) {
        nearestIndex = ele.Index;
        subIndex = 0;
      }

      if (ele.Token == '' || ele.Token == ' ' || ele.Token == '\n' || ele.IsDeleted) {
        ele.SubIndex = subIndex;
        ele.NearestIndex = nearestIndex;
        subIndex++;
      }
    }
  }

  calculateSubIndexForRightTree() {
    let nearestIndex = 0;
    let subIndex = 0;

    for (var i = 0; i < this.newFileTokens.length; i++) {
      let ele = this.newFileTokens[i];

      if (ele.Token != '' && ele.Token != ' ' && ele.Token != '\n' && !ele.IsNew) {
        nearestIndex = ele.Index;
        subIndex = 0;
      }

      if (ele.Token == '' || ele.Token == ' ' || ele.Token == '\n' || ele.IsNew) {
        ele.SubIndex = subIndex;
        ele.NearestIndex = nearestIndex;
        subIndex++;
      }
    }
  }

  calculateBothSideAreNotMatched() {
    for (var i = 0; i < this.oldFileTokens.length; i++) {
      let element = this.oldFileTokens[i];
      if (element.Token != '' && element.Token != ' ' && element.Token != '\n') {
        if (element.TargetIndex != -1) {
          let targetElement = this.newFileTokens.filter(x => x.Index == element.TargetIndex)[0];
          if (element.Token == targetElement.Token && (element.IsDeleted || targetElement.IsNew)) {
            element.IsDeleted = true;
            targetElement.IsNew = true;
          }
        }
      }
    }
  }

  processTokens() {
    this.findDeletedTokensInOldFile();
    this.findNewTokensInNewFile();

    this.reIterateNewTokens();
    this.reIterateDeletedTokens();

   // this.checkIndexAndTargetIndexForOldFile();
    // this.checkIndexAndTargetIndexForNewFile();

    // this.oldFileTokenMatchToNewFileTokenMap();
    // this.newFileTokenMatchToOldFileTokenMap();

    this.normalizeTokens();

   // this.calculateSubIndexForLeftTree();
    //this.calculateSubIndexForRightTree();

    //this.calculateBothSideAreNotMatched();

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

  equalizeTokensOnIndexAndTargetIndexMatch() {
    for (let i = 0; i < this.oldFileTokens.length; i++) {
      let _token = this.oldFileTokens[i];

      if (_token.TargetIndex >= this.newFileTokens.length) {
        continue;
      }

      let _newToken = this.newFileTokens[_token.TargetIndex];

      if (_token.Token != ' ' && _token.Token != '' && _token.Token != this.getNewLineBasedOnEditor() &&
        this.IsObjectDefined(_newToken) &&
        _token.Token == _newToken.Token
      ) {
        this.oldFileTokens[_token.Index].IsDeleted = false;
        this.newFileTokens[_token.TargetIndex].IsNew = false;
      }
    }
  }

  oldFileTokenMatchToNewFileTokenMap() {

    for (let i = 0; i < this.oldFileTokens.length; i++) {
      let tok = this.oldFileTokens[i];

      if (!tok.IsDeleted && tok.Token != this.getNewLineBasedOnEditor() && tok.Token != ' ') {

        let newFileIndex = tok.TargetIndex;
        let newTok = this.newFileTokens[newFileIndex];

        if (newTok.IsNew) {
          let _prevTokenMatch = this.findPreviousMatchStringToken(tok.Index, FileEnum.OldFile);

          if (_prevTokenMatch) {
            let _preTokenMatchData = _prevTokenMatch.GetPreviousMatchTokenData();
            if (_preTokenMatchData) {
              let prevTokenNewFile = this.newFileTokens[_preTokenMatchData.TargetIndex];
              let nextIndexToCheck = prevTokenNewFile.Index;
              let nextToken = this.newFileTokens[nextIndexToCheck];

              do {

                nextIndexToCheck++;
                nextToken = this.newFileTokens[nextIndexToCheck];

                if (this.IsObjectDefined(nextToken) && tok.Token == nextToken.Token && nextToken.IsNew) {
                  this.oldFileTokens[i].IsDeleted = false;
                  this.oldFileTokens[i].TargetIndex = nextIndexToCheck;
                  this.newFileTokens[nextIndexToCheck].IsNew = false;
                  this.newFileTokens[nextIndexToCheck].TargetIndex = i;
                  break;
                }

                if (this.IsObjectDefined(nextToken) && !nextToken.IsNew && nextToken.Token != ''
                  && nextToken.TargetIndex > -1 && nextToken.TargetIndex < this.oldFileTokens.length && !this.oldFileTokens[nextToken.TargetIndex].IsDeleted
                  && nextToken.Token != this.getNewLineBasedOnEditor()
                  && nextToken.Token != ' ') {
                  break;
                }
              } while (this.IsObjectDefined(nextToken) && tok.Token != nextToken.Token);
            }
          }
        }
      }
    }
  }

  newFileTokenMatchToOldFileTokenMap() {
    for (let i = 0; i < this.newFileTokens.length; i++) {
      let tok = this.newFileTokens[i];

      if (!tok.IsNew && tok.Token != this.getNewLineBasedOnEditor() && tok.Token != ' ') {

        let oldFileIndex = tok.TargetIndex;
        let oldTok = this.oldFileTokens[oldFileIndex];

        if (oldTok.IsDeleted) {
          let _prevTokenMatch = this.findPreviousMatchStringToken(tok.Index, FileEnum.NewFile);

          if (_prevTokenMatch) {

            let _preMatchTokenData = _prevTokenMatch.GetPreviousMatchTokenData();
            if (_preMatchTokenData) {
              let prevTokenOldFile = this.oldFileTokens[_preMatchTokenData.TargetIndex];
              let nextIndexToCheck = prevTokenOldFile.Index;
              let nextToken = this.oldFileTokens[nextIndexToCheck];

              do {

                nextIndexToCheck++;
                nextToken = this.oldFileTokens[nextIndexToCheck];

                if (this.IsObjectDefined(nextToken) && tok.Token == nextToken.Token && nextToken.IsDeleted) {
                  this.newFileTokens[i].IsNew = false;
                  this.newFileTokens[i].TargetIndex = nextIndexToCheck;
                  this.oldFileTokens[nextIndexToCheck].IsDeleted = false;
                  this.oldFileTokens[nextIndexToCheck].TargetIndex = i;
                  break;
                }

                if (this.IsObjectDefined(nextToken) && !nextToken.IsDeleted && nextToken.Token != ''
                  && nextToken.TargetIndex > -1 && nextToken.TargetIndex < this.newFileTokens.length && !this.newFileTokens[nextToken.TargetIndex].IsNew
                  && nextToken.Token != this.getNewLineBasedOnEditor()
                  && nextToken.Token != ' ') {
                  break;
                }
              } while (this.IsObjectDefined(nextToken) && tok.Token != nextToken.Token);
            }
          }
        }
      }
    }
  }

  checkIndexAndTargetIndexForOldFile() {
    for (let i = 1; i < this.oldFileTokens.length; i++) {
      let tokenData = this.oldFileTokens[i];

      let preMatchToken = this.findPreviousMatchStringToken(tokenData.Index, FileEnum.OldFile);
      let prevTokenData = preMatchToken.GetPreviousMatchTokenData();

      if (prevTokenData != undefined && prevTokenData != null && !tokenData.IsDeleted && !tokenData.Inserted) {
        if (!(tokenData.Index > prevTokenData.Index && tokenData.TargetIndex > prevTokenData.TargetIndex)) {
          this.oldFileTokens[tokenData.Index].IsDeleted = true;
        }
      }
    }
  }

  checkIndexAndTargetIndexForNewFile() {
    for (let i = 0; i < this.newFileTokens.length; i++) {
      let tokenData = this.newFileTokens[i];

      let preMatchToken = this.findPreviousMatchStringToken(tokenData.Index, FileEnum.NewFile);
      let prevTokenData = preMatchToken.GetPreviousMatchTokenData();

      if (prevTokenData != null && prevTokenData != undefined && !tokenData.IsNew && !tokenData.Inserted) {
        if (!(tokenData.Index > prevTokenData.Index && tokenData.TargetIndex > prevTokenData.TargetIndex)) {
          this.newFileTokens[tokenData.Index].IsNew = true;
        }
      }
    }
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

  findDeletedTokensInOldFile() {
    let actualLen = this.oldFileTokens.length;
    let oppoLength = this.newFileTokens.length;

    let i = 0;
    let j = 0;
    while (j < oppoLength && i < actualLen) {
      if (this.oldFileTokens[i].Token != this.newFileTokens[j].Token) {
        if (!this.oldFileTokens[i].Inserted) {
          this.oldFileTokens[i].IsDeleted = true;
        }
        i++;
      } else {

        this.newFileTokens[j].IsNew = false;
        this.newFileTokens[j].TargetIndex = this.oldFileTokens[i].Index;

        this.oldFileTokens[i].IsDeleted = false;
        this.oldFileTokens[i].TargetIndex = this.newFileTokens[j].Index;

        i++;
        j++;
      }
    }

    while(i<actualLen){
      this.oldFileTokens[i].IsDeleted = true;
      i++;
    }

  }

  IsObjectDefined(obj: any): boolean {
    if (obj == null || obj == undefined)
      return false;

    return true;
  }

  findNextValidStringInOppositeToken(index: number, token:string, type: FileEnum): NextStringMatch {

    let prevIndex: Number = -1;
    let nextValidMatchTokenForNew!: NewFile | undefined;
    let nextValidMatchTokenForOld!: OldFile | undefined;

    if (type == FileEnum.NewFile) {
      let isNewReached: boolean = false;

      do {
        index++;

        if (this.newFileTokens.length == index) {
          nextValidMatchTokenForNew = undefined;
          break;
        }

        nextValidMatchTokenForNew = this.newFileTokens[index];

        if(isNewReached && !nextValidMatchTokenForNew.IsNew && nextValidMatchTokenForNew.Token!='' && nextValidMatchTokenForNew.Token!=' ' && nextValidMatchTokenForNew.Token!='\n'){
          break;
        }

        if(nextValidMatchTokenForNew.IsNew){
          isNewReached = true;
        }

        if(nextValidMatchTokenForNew.IsNew && nextValidMatchTokenForNew.Token == token){
          break;
        }

        if(!nextValidMatchTokenForNew.IsNew && nextValidMatchTokenForNew.Token!='' && nextValidMatchTokenForNew.Token!=' ' && nextValidMatchTokenForNew.Token!='\n'){
          break;
        }
      }
      while (this.IsObjectDefined(nextValidMatchTokenForNew) && (nextValidMatchTokenForNew.Token == this.getNewLineBasedOnEditor() || nextValidMatchTokenForNew.Token == ' ' || nextValidMatchTokenForNew.Token == '' || nextValidMatchTokenForNew.IsNew))

      return new NextStringMatch(index, nextValidMatchTokenForNew);

    } else {

      let isDeletedReached: boolean = false;

      do {
        index++;

        if (this.oldFileTokens.length == index) {
          nextValidMatchTokenForOld = undefined;
          break;
        }

        nextValidMatchTokenForOld = this.oldFileTokens[index];

        if(isDeletedReached && !nextValidMatchTokenForOld.IsDeleted && nextValidMatchTokenForOld.Token!='' && nextValidMatchTokenForOld.Token!=' ' && nextValidMatchTokenForOld.Token!='\n'){
          break;
        }

        if(nextValidMatchTokenForOld.IsDeleted){
          isDeletedReached = true;
        }

        if(nextValidMatchTokenForOld.IsDeleted && nextValidMatchTokenForOld.Token == token){
          break;
        }

        if(!nextValidMatchTokenForOld.IsDeleted && nextValidMatchTokenForOld.Token!='' && nextValidMatchTokenForOld.Token!=' ' && nextValidMatchTokenForOld.Token!='\n'){
          break;
        }

      }
      while (this.IsObjectDefined(nextValidMatchTokenForOld) && (nextValidMatchTokenForOld.Token == this.getNewLineBasedOnEditor() || nextValidMatchTokenForOld.Token == ' ' || nextValidMatchTokenForOld.Token == '' || nextValidMatchTokenForOld.IsDeleted))

      return new NextStringMatch(index, nextValidMatchTokenForOld);

    }
  }

  findNextMatchStringInOppositeToken(index: number, token:string, type: FileEnum): NextStringMatch {

    let prevIndex: Number = -1;
    let nextValidMatchTokenForNew!: NewFile | undefined;
    let nextValidMatchTokenForOld!: OldFile | undefined;

    if (type == FileEnum.NewFile) {

      do {
        index++;

        if (this.newFileTokens.length == index) {
          nextValidMatchTokenForNew = undefined;
          break;
        }

        nextValidMatchTokenForNew = this.newFileTokens[index];

        if(nextValidMatchTokenForNew.Token!=''
            && nextValidMatchTokenForNew.Token!=' '
            && nextValidMatchTokenForNew.Token!='\n'
            && nextValidMatchTokenForNew.Token == token){
          break;
        }

      }
      while (this.IsObjectDefined(nextValidMatchTokenForNew)
        && (nextValidMatchTokenForNew.Token == this.getNewLineBasedOnEditor()
          || nextValidMatchTokenForNew.Token == ' '
          || nextValidMatchTokenForNew.Token == ''
          || nextValidMatchTokenForNew.Token != token))

      return new NextStringMatch(index, nextValidMatchTokenForNew);

    } else {

      let isDeletedReached: boolean = false;

      do {
        index++;

        if (this.oldFileTokens.length == index) {
          nextValidMatchTokenForOld = undefined;
          break;
        }

        nextValidMatchTokenForOld = this.oldFileTokens[index];

        if(nextValidMatchTokenForOld.Token!=''
        && nextValidMatchTokenForOld.Token!=' '
        && nextValidMatchTokenForOld.Token!='\n'
        && nextValidMatchTokenForOld.Token == token){
          break;
        }

      }
      while (this.IsObjectDefined(nextValidMatchTokenForOld)
        && (nextValidMatchTokenForOld.Token == this.getNewLineBasedOnEditor()
          || nextValidMatchTokenForOld.Token == ' '
          || nextValidMatchTokenForOld.Token == ''
          || nextValidMatchTokenForOld.Token != token))

      return new NextStringMatch(index, nextValidMatchTokenForOld);

    }
  }

  findNextMatchStringToken(index: number, type: FileEnum): NextStringMatch {

    let prevIndex: Number = -1;
    let nextValidMatchTokenForNew!: NewFile | undefined;
    let nextValidMatchTokenForOld!: OldFile | undefined;

    if (type == FileEnum.NewFile) {
      do {
        index++;

        if (this.newFileTokens.length == index) {
          nextValidMatchTokenForNew = undefined;
          break;
        }

        nextValidMatchTokenForNew = this.newFileTokens[index];
      }
      while (this.IsObjectDefined(nextValidMatchTokenForNew) && (nextValidMatchTokenForNew.Token == this.getNewLineBasedOnEditor() || nextValidMatchTokenForNew.Token == ' ' || nextValidMatchTokenForNew.Token == '' || nextValidMatchTokenForNew.IsNew))

      return new NextStringMatch(index, nextValidMatchTokenForNew);

    } else {
      do {
        index++;

        if (this.oldFileTokens.length == index) {
          nextValidMatchTokenForOld = undefined;
          break;
        }

        nextValidMatchTokenForOld = this.oldFileTokens[index];
      }
      while (this.IsObjectDefined(nextValidMatchTokenForOld) && (nextValidMatchTokenForOld.Token == this.getNewLineBasedOnEditor() || nextValidMatchTokenForOld.Token == ' ' || nextValidMatchTokenForOld.Token == '' || nextValidMatchTokenForOld.IsDeleted))

      return new NextStringMatch(index, nextValidMatchTokenForOld);

    }
  }

  findPreviousMatchStringToken(index: number, type: FileEnum): PreviousStringMatch {

    let prevIndex: Number = -1;
    let preValidMatchTokenForNew!: NewFile | undefined;
    let preValidMatchTokenForOld!: OldFile | undefined;

    if (type == FileEnum.NewFile) {
      do {
        index--;

        if (index==-1) {
          preValidMatchTokenForNew = undefined;
          break;
        }

        preValidMatchTokenForNew = this.newFileTokens[index];
      }
      while (this.IsObjectDefined(preValidMatchTokenForNew) && (preValidMatchTokenForNew.Token == this.getNewLineBasedOnEditor() || preValidMatchTokenForNew.Token == ' ' || preValidMatchTokenForNew.Token == '' || preValidMatchTokenForNew.IsNew))

      return new PreviousStringMatch(index, preValidMatchTokenForNew);

    } else {
      do {
        index--;

        if (index == -1) {
          preValidMatchTokenForOld = undefined;
          break;
        }

        preValidMatchTokenForOld = this.oldFileTokens[index];
      }
      while (this.IsObjectDefined(preValidMatchTokenForOld) && (preValidMatchTokenForOld.Token == this.getNewLineBasedOnEditor() || preValidMatchTokenForOld.Token == ' ' || preValidMatchTokenForOld.Token == '' || preValidMatchTokenForOld.IsDeleted))

      return new PreviousStringMatch(index, preValidMatchTokenForOld);

    }
  }

  reIterateNewTokens() {
    let j = -1;
    let prevNewFileIndex = -1;

    for (let i = 0; i < this.newFileTokens.length; i++) {
      let tokenData = this.newFileTokens[i];

      if (tokenData.IsNew) {

        let _token = this.findPreviousMatchStringToken(tokenData.Index, FileEnum.NewFile);

        if (tokenData.Index == 0 || _token.GetPreviousMatchTokenData() == undefined) {
          _token = new PreviousStringMatch(-1, new NewFile('', -1, false, false));
        }

        let _prevTokenData = _token.GetPreviousMatchTokenData();
        if (_prevTokenData != null && _prevTokenData != undefined) {

          j = _prevTokenData.TargetIndex + 1;
          prevNewFileIndex = j;

          while (j < this.oldFileTokens.length
            && (this.oldFileTokens[j].Token != this.newFileTokens[i].Token
              ||
              (this.oldFileTokens[j].Token == this.getNewLineBasedOnEditor() || this.oldFileTokens[j].Token == ' ')
            )) {
            j++;
          }

          if (j >= this.oldFileTokens.length) {
            continue;
          }

          if (this.oldFileTokens[j].Token == this.newFileTokens[i].Token) {
            this.newFileTokens[i].IsNew = false;
            this.oldFileTokens[j].IsDeleted = false;

            this.oldFileTokens[j].TargetIndex = this.newFileTokens[i].Index;
            this.newFileTokens[i].TargetIndex = this.oldFileTokens[j].Index;

            j++;
          }
        }
      }
    }
  }

  reIterateDeletedTokens() {
    let j = -1;
    let prevNewFileIndex = -1;

    for (let i = 0; i < this.oldFileTokens.length; i++) {
      let tokenData = this.oldFileTokens[i];

      if (tokenData.IsDeleted) {

        let _token = this.findPreviousMatchStringToken(tokenData.Index, FileEnum.OldFile);

        if (tokenData.Index == 0 || _token.GetPreviousMatchTokenData() == undefined) {
          _token = new PreviousStringMatch(-1, new NewFile('', -1, false, false));
        }

        let _prevTokenData = _token.GetPreviousMatchTokenData();

        if (_prevTokenData != undefined && _prevTokenData != null) {

          j = _prevTokenData.TargetIndex + 1;
          prevNewFileIndex = j;

          while (j < this.newFileTokens.length
            && (this.newFileTokens[j].Token != this.oldFileTokens[i].Token ||
              (this.newFileTokens[j].Token == this.getNewLineBasedOnEditor() || this.newFileTokens[j].Token == ' ')
            )) {
            j++;
          }

          if (j >= this.newFileTokens.length) {
            continue;
          }

          if (this.newFileTokens[j].Token == this.oldFileTokens[i].Token) {
            this.oldFileTokens[i].IsDeleted = false;
            this.newFileTokens[j].IsNew = false;

            this.oldFileTokens[i].TargetIndex = this.newFileTokens[j].Index;
            this.newFileTokens[j].TargetIndex = this.oldFileTokens[i].Index;

            j++;
          }

        }
      }
    }
  }

  findNewTokensInNewFile() {
    let actualLen = this.newFileTokens.length;
    let oppolen = this.oldFileTokens.length;

    let i = 0;
    let j = 0;
    while (i < actualLen && j < oppolen) {
      if (this.newFileTokens[i].Token != this.oldFileTokens[j].Token) {
        if (!this.newFileTokens[i].Inserted)
          this.newFileTokens[i].IsNew = true;
        i++;
      } else {
        this.oldFileTokens[j].IsDeleted = false;
        this.newFileTokens[i].IsNew = false;

        this.oldFileTokens[j].TargetIndex = this.newFileTokens[i].Index;
        this.newFileTokens[i].TargetIndex = this.oldFileTokens[j].Index;
        i++;
        j++;
      }
    }

    while(i<actualLen){
      this.newFileTokens[i].IsNew = true;
      i++;
    }

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
