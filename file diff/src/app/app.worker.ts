/// <reference lib="webworker" />

addEventListener('message', async ({ data }) => {
  const response = `worker response to ${data}`;

  let folder = new FolderComponent();
  await folder.MergedFoldersView(data.currentLeftFolder, data.currentRightFolder, data.level, data.targetLevel, undefined, data.createPath, postMessage);

});

export class NextStringMatch {
  private nextPathLength!: number;
  private nextMatchTokenData!: BaseToken | undefined;

  constructor(previousMatchDistance: number, previousMatchtoken: BaseToken | undefined) {
    this.nextPathLength = previousMatchDistance;
    this.nextMatchTokenData = previousMatchtoken;
  }

  GetNextMatchDistance() {
    return this.nextPathLength;
  }

  GetNextMatchTokenData() {
    return this.nextMatchTokenData;
  }
}


class CallbackStatus {
  constructor(
        public isCompleted: boolean =false,
        public mergedView: MergedList[] = [],
        public remainingfilesCount: number = 0,
        public totalFiles: number = -1
      ) { }
}
class FolderComponent {

  public MergedView: MergedList[] = [];
  private filesCount: number = 0;
  private remainingtotalFilesToProcess: number = -1;
  private callbackTotalFiles: number = -1;

  constructor() {
    this.MergedView = [];
  }

  getBothSideFilesCount(leftTree: Directory): number{
    let leftFiles = leftTree.Files.length;

    for (let i=0; i< leftTree.Folders.length; i++){
      leftFiles = leftFiles + this.getBothSideFilesCount(leftTree.Folders[i]);
    }

    return leftFiles;
  }

  async MergedFoldersView(leftTree: Directory, rightTree: Directory, level: number, currentLevel: number, parent: MergedList | undefined = undefined, parentPath: string, postMessageFn: any) {

    if(this.remainingtotalFilesToProcess==-1) {
      if (currentLevel == 0) {
        let leftFiles = leftTree.Files.length;
        let rightFiles = rightTree.Files.length;

        for (let i = 0; i < leftTree.Folders.length; i++) {
          leftFiles = leftFiles + leftTree.Folders[i].Files.length
        }

        for (let i = 0; i < rightTree.Folders.length; i++) {
          rightFiles = rightFiles + rightTree.Folders[i].Files.length
        }

        this.remainingtotalFilesToProcess = leftFiles + rightFiles;
        this.callbackTotalFiles = leftFiles + rightFiles;
      } else {
        let leftFiles = this.getBothSideFilesCount(leftTree);
        let rightFiles = this.getBothSideFilesCount(rightTree);
        this.remainingtotalFilesToProcess = leftFiles + rightFiles;
        this.callbackTotalFiles = leftFiles + rightFiles;
      }
    }

    if (currentLevel > 1)
      return;

    for (let i = 0; i < leftTree.Folders.length; i++) {
      let foldername = leftTree.Folders[i].Name;
      let folderExistsinRightTree = rightTree.Folders.filter(x => x.Name.toLowerCase() == foldername.toLowerCase())
      if (folderExistsinRightTree.length > 0) {
        let item = new MergedList(folderExistsinRightTree[0].Name, true, false, true, true, level, parentPath);

        // Looping the child folders and files
        await this.MergedFoldersView(leftTree.Folders[i], folderExistsinRightTree[0], (level + 1), (currentLevel + 1), item, parentPath + '\\' + folderExistsinRightTree[0].Name, postMessageFn);
        item.parent = parent;
        this.MergedView.push(item);

      } else {
        let item = new MergedList(leftTree.Folders[i].Name, true, false, true, false, level, parentPath);
        await this.MergedFoldersView(leftTree.Folders[i], new Directory(), (level + 1), (currentLevel + 1), item, parentPath + '\\' + leftTree.Folders[i].Name, postMessageFn);
        item.parent = parent;
        this.MergedView.push(item);
      }
    }

    for (let i = 0; i < rightTree.Folders.length; i++) {
      let foldername = rightTree.Folders[i].Name;
      let folderExistsinLeftTree = leftTree.Folders.filter(x => x.Name.toLowerCase() == foldername.toLowerCase())
      if (folderExistsinLeftTree.length > 0) {

      } else {
        let item = new MergedList(rightTree.Folders[i].Name, true, false, false, true, level, parentPath);
        await this.MergedFoldersView(new Directory(), rightTree.Folders[i], (level + 1), (currentLevel + 1), item, parentPath + '\\' + rightTree.Folders[i].Name, postMessageFn);
        item.parent = parent;
        this.MergedView.push(item);
      }
    }

    for (let i = 0; i < leftTree.Files.length; i++) {
      let filename = leftTree.Files[i].name;
      let fileExistsinRightTree = rightTree.Files.filter(x => x.name.toLowerCase() == filename.toLowerCase())
      if (fileExistsinRightTree.length > 0) {

        let item = new MergedList(fileExistsinRightTree[0].name, false, true, true, true, level, parentPath);

        let diffComponent = new FileDiffComponent(new TokenService());
        this.filesCount = this.filesCount + 2;

        diffComponent.ReadFile1Content(leftTree.Files[i], postMessageFn);

        diffComponent.file1LoadedCallback = async (postMessageFunction: any) => {
          diffComponent.ReadFile2Content(fileExistsinRightTree[0], postMessageFunction);
        };

        diffComponent.file2LoadedCallback = async (postMessageFunction: any) => {
          diffComponent.findDiff();
          item.fileDiffComponent = diffComponent;
          item.IsHaveDeletedTokens = diffComponent.oldFileTokens.some(x => x.IsDeleted);
          item.IsHaveNewTokens = diffComponent.newFileTokens.some(x => x.IsNew);

          if ((item.IsHaveDeletedTokens || item.IsHaveNewTokens) && parent != undefined) {
            parent.folderHaveChange = true;

            let _par: MergedList | undefined = parent;

            while (_par != undefined) {
              _par.folderHaveChange = true;
              _par = _par.parent;
            }

          }

          item.parent = parent;
          this.MergedView.push(item);

          diffComponent.reduceMemoryConsumption();
          diffComponent.DiffNewHtml = '';
          diffComponent.DiffOldHtml = '';
          diffComponent.result1 = '';
          diffComponent.result2 = '';
          diffComponent.file1Content = '';
          diffComponent.file2Content = '';

          item.fileDiffComponent = diffComponent;
          this.remainingtotalFilesToProcess = this.remainingtotalFilesToProcess -2;

          if (this.remainingtotalFilesToProcess == 0) {
            let callback = new CallbackStatus(true, this.MergedView,this.remainingtotalFilesToProcess, this.callbackTotalFiles);
            let obj = JSON.parse(JSON.stringify(callback));
            postMessageFunction(obj);
          }
          else{
            let callback = new CallbackStatus(false, [], this.remainingtotalFilesToProcess, this.callbackTotalFiles);
            let obj = JSON.parse(JSON.stringify(callback));
            postMessageFunction(obj);
          }

        }


      } else {
        let item = new MergedList(leftTree.Files[i].name, false, true, true, false, level, parentPath);
        item.parent = parent;
        this.remainingtotalFilesToProcess--;
        this.filesCount++;
        this.MergedView.push(item);
        let callback = new CallbackStatus(false, [], this.remainingtotalFilesToProcess, this.callbackTotalFiles);
        let obj = JSON.parse(JSON.stringify(callback));
        postMessageFn(obj);
      }
    }


    for (let i = 0; i < rightTree.Files.length; i++) {
      let filename = rightTree.Files[i].name;
      let fileExistsinLeftTree = leftTree.Files.filter(x => x.name.toLowerCase() == filename.toLowerCase())
      if (fileExistsinLeftTree.length > 0) {

      } else {
        let item = new MergedList(rightTree.Files[i].name, false, true, false, true, level, parentPath);
        item.parent = parent;
        this.remainingtotalFilesToProcess--;
        this.filesCount++;
        this.MergedView.push(item);
        let callback = new CallbackStatus(false, [],this.remainingtotalFilesToProcess, this.callbackTotalFiles);
        let obj = JSON.parse(JSON.stringify(callback));
        postMessageFn(obj);
      }
    }

    if (this.remainingtotalFilesToProcess == 0) {
      let callback = new CallbackStatus(true, this.MergedView,this.remainingtotalFilesToProcess, this.callbackTotalFiles);
      let obj = JSON.parse(JSON.stringify(callback));
      postMessageFn(obj);
    }

  }

}

export class FileDiffComponent {

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

  preHtml: string = "<pre style=\'height:450px;margin-top:25px;\'><code>";
  DiffpreOldHtml: string = "<pre id=\'preOld\' style=\'height:485px;margin-top:15px;\'><code>";
  DiffpreNewHtml: string = "<pre id=\'preNew\' style=\'height:485px;margin-top:15px;\'><code>";
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

  file1LoadedCallback: Function = () => { };
  file2LoadedCallback: Function = () => { };

  isSingleFile: boolean = false;

  constructor(private service: TokenService) {

  }

  enableEditor() {
    this.enableFileEditor = !this.enableFileEditor;
    this.resetScreen();
  }

  enableFolderBrowseFn() {
    this.enableFolderBrowse = !this.enableFolderBrowse;
    this.enableFileEditor = false;
    this.resetScreen();
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
      this.DiffOldHtml = this.result1 as string;
      this.isDiffCalculated = true;
    }
    else if (this.file2Content != null && this.file1Content == null && this.result2 != null && diffSingleFile) {
      this.DiffNewHtml = this.result2 as string;
      this.isDiffCalculated = true;
    }

    this.isSingleFile = diffSingleFile;
  }

  findNextMatchStringInOppositeToken(index: number, token:string, type: FileEnum): NextStringMatch {

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
          let oppositeNextMatch = this.findNextMatchStringInOppositeToken(oppositePrevToken.Index, tokenData.Token, FileEnum.NewFile);
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
          //this.newFileTokens[element.TargetIndex].IsNew = true;
         // mismatchRightTargetIndex.push(element.TargetIndex);
        }

        //this.oldFileTokens[element.Index].TargetIndex = -1;

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
          //this.oldFileTokens[element.TargetIndex].IsDeleted = true;
         // mismatchLeftTargetIndex.push(element.TargetIndex);
        }

        //this.newFileTokens[element.Index].TargetIndex = -1;
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

        if (element.TargetIndex > -1
          && element.TargetIndex < this.newFileTokens.length
          &&((prevElement && prevElement.TargetIndex > element.TargetIndex) 
                || ((prevElement &&
                    (prevElement.TargetIndex < element.TargetIndex))
                        && ((tarprevElement &&
                              (tarprevElement.TargetIndex > -1                 
                                && tarprevElement.TargetIndex < this.newFileTokens.length
                                && tarprevElement.TargetIndex > this.newFileTokens[element.TargetIndex].TargetIndex)))))
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
        if (element.TargetIndex > -1
          && element.TargetIndex < this.oldFileTokens.length
          &&((prevElement && prevElement.TargetIndex > element.TargetIndex) 
                ||((prevElement &&
                    (prevElement.TargetIndex < element.TargetIndex))
                      && ((tarprevElement &&
                        (tarprevElement.TargetIndex > -1                         
                          && tarprevElement.TargetIndex < this.oldFileTokens.length
                          && tarprevElement.TargetIndex > this.oldFileTokens[element.TargetIndex].TargetIndex)))))
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


  }

  processTokens() {
    this.findDeletedTokensInOldFile();
    this.findNewTokensInNewFile();

    //this.reIterateNewTokens();
    //this.reIterateDeletedTokens();

    //this.checkIndexAndTargetIndexForOldFile();
    //this.checkIndexAndTargetIndexForNewFile();

    //this.oldFileTokenMatchToNewFileTokenMap();
    //this.newFileTokenMatchToOldFileTokenMap();

    //this.normalizeTokens();

    //if (!this.oldFileTokens.some(x => x.IsDeleted) && !this.newFileTokens.some(x => x.IsNew)) {
    //  if (this.enableFileEditor) {
    //    this.DiffOldHtml = this.preHtml + this.file1Content + this.postHtml;
    //    this.DiffNewHtml = this.preHtml + this.file2Content + this.postHtml;
    //  } else {
    //    this.DiffOldHtml = this.result1 as string;
    //    this.DiffNewHtml = this.result2 as string;
    //  }
    //} else {
    //  this.generateDiffHtml();
    //}

    this.isDiffCalculated = true;
  }

  generateDiffHtml() {
    this.generateOldFileHtml();
    this.generateNewFileHtml();
  }

  getNewLineBasedOnEditor() {
    //if (this.enableFileEditor) {
    return '\n';
    //}

    //return '\r\n';
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
          this.oldFileTokens[prevTokenData.Index].IsDeleted = true;
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
          this.newFileTokens[prevTokenData.Index].IsNew = true;
        }
      }
    }
  }

  spanClickOld(event: any) {
    let id = event.srcElement.id;
    let token = this.oldFileTokens[id];

    let prevTokenMatch = this.findPreviousMatchStringToken(id, FileEnum.OldFile);

    console.log("PrevToken");
    console.log(prevTokenMatch);
    console.log("currentToken");
    console.log(token);
    console.log("NewFileTargetIndexToken");
    let tokenDat = prevTokenMatch.GetPreviousMatchTokenData();
    if (tokenDat != undefined)
      console.log(this.newFileTokens[tokenDat.TargetIndex]);
    ////let insertionIndex = prevTokenMatch.GetPreviousMatchTokenData().TargetIndex +1;
    ////this.newFileTokens.splice(insertionIndex, 0, new NewFile(token.Token, insertionIndex, false, true));

    //  let index = token.Index;
    //  let newlyAddedTokens = this.newFileTokens.filter(x=> (x.IsNew || x.Inserted) && x.Index <= index).length;
    //  let spaceAndNewLineAfterIndex = 0;
    //  let TargetIndex = newlyAddedTokens + index;

    //  if(this.newFileTokens[TargetIndex].Token == prevtoken.Token)
    //  {
    //     // check the prevToken is same NEwFilePrevToken or find the target index needs to check and added to model
    //  }

    //  this.newFileTokens.splice(TargetIndex, 0, new NewFile(token.Token, TargetIndex, false, true));

    ////for(let i = insertionIndex+1; i<this.newFileTokens.length; i++){
    ////insertionIndex++;
    ////this.newFileTokens[i].Index = insertionIndex;
    ////}

    ////this.processTokens();
  }

  spanClickNew(event: any) {
    event.srcElement.id
  }

  generateNewFileHtml() {
    let resConcat = "";
    for (let i = 0; i < this.newFileTokens.length; i++) {
      let tokenData = this.newFileTokens[i];
      if (tokenData.IsNew) {
        if (tokenData.IsMarkerInCurrentToken) {
          resConcat = resConcat + "<span id=\'rightspanContentMarker_" + tokenData.Index + "\' class=\'spanContentMarker\'>" + this.replaceAngleBracets(tokenData.Token) + "</span><span> </span>";
        } else {
          resConcat = resConcat + "<span id=\'" + tokenData.Index + "\' class=\'spanContentNew\'>" + this.replaceAngleBracets(tokenData.Token) + "</span><span> </span>";
        }
      } else {
        resConcat = resConcat + "<span id=\'" + tokenData.Index + "\' class=\'spanContentNotNew\'>" + this.replaceAngleBracets(tokenData.Token) + "</span><span> </span>";
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
        if (tokenData.IsMarkerInCurrentToken) {
          resConcat = resConcat + "<span id=\'leftspanContentMarker_" + tokenData.Index + "\' class=\'spanContentMarker\'>" + this.replaceAngleBracets(tokenData.Token) + "</span><span> </span>";
        }
        else {
          resConcat = resConcat + "<span id=\'" + tokenData.Index + "\' class=\'spanContentDeleted\'>" + this.replaceAngleBracets(tokenData.Token) + "</span><span> </span>";
        }
      } else {
        resConcat = resConcat + "<span id=\'" + tokenData.Index + "\' class=\'spanContentNotDeleted\'>" + this.replaceAngleBracets(tokenData.Token) + "</span><span> </span>";
      }
    }

    this.DiffOldHtml = this.DiffpreOldHtml + resConcat + this.postHtml;
  }

  
  findDeletedTokensInOldFile() {
    let actualLen = this.oldFileTokens.length;
    let oppoLength = this.newFileTokens.length;

    let i = 0;
    let j = 0;
    while (i < actualLen && j < oppoLength) {
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

        if (index == -1) {
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
    let oppoLen = this.oldFileTokens.length;

    let i = 0;
    let j = 0;
    while (i < actualLen && j < oppoLen) {
      if (this.newFileTokens[i].Token != this.oldFileTokens[j].Token) {
        if (!this.newFileTokens[i].Inserted)
          this.newFileTokens[i].IsNew = true;
        i++;
      } else {        
          this.oldFileTokens[j].IsDeleted = false;
          this.oldFileTokens[j].TargetIndex = this.newFileTokens[i].Index;
          this.newFileTokens[i].IsNew = false;
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

  ReadFile1Content(file: File, postMessageFunction: any) {
    let fileReader: FileReader = new FileReader();
    var content: string | null | ArrayBuffer = null;
    let self = this;

    fileReader.onloadend = (function (file, postFn) {
      return function (evt) {
        self.file1Content = fileReader.result;
        // self.result1 = self.preHtml + self.file1Content + self.postHtml;
        self.file1LoadedCallback(postFn);
      }
    })(file, postMessageFunction);

    fileReader.readAsText(file);
  }


  ReadFile2Content(file: File, postMessageFunction: any) {
    let fileReader: FileReader = new FileReader();
    var content: string | null | ArrayBuffer = null;
    let self = this;

    fileReader.onloadend = (function (file, postFn) {
      return function (evt) {
        self.file2Content = fileReader.result;
        self.result2 = self.preHtml + self.file2Content + self.postHtml;
        self.file2LoadedCallback(postFn);
      }
    })(file, postMessageFunction);

    fileReader.readAsText(file);

  }

  file1EditorChange($event: any) {
    this.file1Content = $event.target.innerText;
  }

  file2EditorChange($event: any) {
    this.file2Content = $event.target.innerText;
  }


}

abstract class BaseToken {
  Token: string = "";
  Index: number = -1;
  OriginalIndex: number = -1;
  Inserted: boolean = false;
  TargetIndex: number = -1;
  IsMarkerInCurrentToken: boolean = false;
  SubIndex: number = -1;
  NearestIndex: number = -1;
  Moved: boolean = false;
}

class OldFile extends BaseToken {

  constructor(content: string, index: number, isdeleted: boolean = false, inserted: boolean = false) {
    super();
    this.Token = content;
    this.IsDeleted = isdeleted;
    this.Index = index;
    this.Inserted = inserted;
  }

  IsDeleted: boolean = false;
}

class NewFile extends BaseToken {
  IsNew: boolean = false;

  constructor(content: string, index: number, isnew: boolean = false, inserted: boolean = false) {
    super();
    this.Token = content;
    this.IsNew = isnew;
    this.Index = index;
    this.Inserted = inserted;
  }
}

 enum FileEnum {
  OldFile,
  NewFile
}

 class PreviousStringMatch {
   private prevPathLength!: number;
   private prevMatchTokenData!: BaseToken | undefined;

   constructor(previousMatchDistance: number, previousMatchtoken: BaseToken | undefined) {
    this.prevPathLength = previousMatchDistance;
    this.prevMatchTokenData = previousMatchtoken;
  }

  GetPreviousMatchDistance() {
    return this.prevPathLength;
  }

  GetPreviousMatchTokenData() {
    return this.prevMatchTokenData;
  }
}



 class Directory {

  Files: File[] = [];
  Folders: Directory[] = [];

  Name!: string;
}

 class MergedList {
  Name!: string;
  IsFolder!: boolean;
  IsFile!: boolean;
  IsPresentInLeftTree!: boolean;
  IsPresentInRightTree!: boolean;
  IsHaveDeletedTokens: boolean = false;
  IsHaveNewTokens: boolean = false;
  fileDiffComponent!: FileDiffComponent;
  Level: number = -1;
  folderHaveChange: boolean = false;
  parentFolderPath: string = '';
  parent: MergedList | undefined = undefined;

  constructor(name: string, isfolder: boolean, isfile: boolean, presentinLeftTree: boolean,
    presentinRightTree: boolean, level: number, parentfolderpath: string) {
    this.Name = name;
    this.IsFile = isfile;
    this.IsFolder = isfolder;
    this.IsPresentInLeftTree = presentinLeftTree;
    this.IsPresentInRightTree = presentinRightTree;
    this.Level = level;
    this.parentFolderPath = parentfolderpath;
  }
}

 class MergeFilterWorkerObject {
  constructor(
    public leftTree: Directory,
    public rightTree: Directory,
    public level: number,
    public currentLevel: number,
    public parent: MergedList | undefined,
    public parentPath: string,
    public MergedView: MergedList[]) {
  }
}



 class TokenService {

  constructor() { }

   ConvertOldFileToToken(content: string, isFromEditor: boolean = false): OldFile[] {
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

     for (let i = 0; i < multipleLines.length; i++) {
       let tokens = multipleLines[i].split(' ');
       let list = tokens.map((x) => { index++; return new OldFile(x, index); });
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


   ConvertNewFileToToken(content: string, isFromEditor: boolean = false): NewFile[] {
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

     for (let i = 0; i < multipleLines.length; i++) {
       let tokens = multipleLines[i].split(' ');
       let list = tokens.map((x) => { index++; return new NewFile(x, index); });
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
