import { AfterViewInit, Component, ViewEncapsulation, inject, Input, Output, EventEmitter } from '@angular/core';
import { Directory, MergedList, MergeFilterWorkerObject } from '../Models/BaseToken';
import { FileDiffComponent } from '../file-diff/file-diff.component';
import { TokenService } from '../token.service';
import { delay } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';

import {
  HighlightAutoResult,
  HighlightLoader,
  HighlightJS,
  HighlightModule,
  HighlightOptions,
  HIGHLIGHT_OPTIONS,
 
} from 'ngx-highlightjs';

@Component({
  selector: 'app-folder-browse',
  templateUrl: './folder-browse.component.html',
  styleUrls: ['./folder-browse.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class FolderBrowseComponent implements AfterViewInit {

  worker: Worker | undefined = undefined;
  startTime = performance.now();
  isFolderDifferenceDone: boolean = false;
  totalFilesinLeftTree: number =0;
  totalFilesinRightTree: number = 0;
  selectFolderButton1: any;
  folderInput1: any;
  canShowCompareScreen: boolean = false;
  selectFolderButton2: any;
  folderInput2: any;
  dialogRef:any | undefined = undefined;
  leftSideDirectory: Directory | null = new Directory();
  rightSideDirectory: Directory | null = new Directory();

  fileList1: any;
  fileList2: any;

  MergedView: MergedList[] = [];
  CurrentView: MergedList[] = [];
  diffFolderRootPath: string[] = [];
  currentLevel: number = -1;
  
  leftDirLoadIsInProgress: boolean = false;
  rightDirLoadIsInProgress: boolean = false;
  compareDirIsInProgress: boolean = false;

  compareOnlyImmediateChild: boolean =false;

  processingFileCount: number = 0;
  display = "none";
  totalFiles: number = -1;
  statusMessage: string = '';
  selectedFile: FileDiffComponent | null = null;
  selectedMergedItem: MergedList | null = null;
  themeAndroidStudio: string =
    'node_modules/highlight.js/styles/androidstudio.css';

  time: number = 0;
  interval: any;

  @Input('EnableHighlight') EnableHighlight: boolean = false;

  @Output() syntaxHighlighFn: EventEmitter<boolean> = new EventEmitter<boolean>();

  constructor(public dialog: MatDialog, private hljs: HighlightJS) {
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('../app.worker', import.meta.url), { type: 'module' });
    }
    
  }

  openModal(){
    this.display = "block";
    //this.hljsLoader.setTheme(this.themeAndroidStudio);
  }

  enableHighlightFn() {
    this.EnableHighlight = !this.EnableHighlight;
    if (this.selectedFile?.isDiffCalculated) {
      this.selectedFile.enableHighlight = this.EnableHighlight;
      this.selectedFile.generateDiffHtml();
    }
  }

  onCloseHandled() {
    this.selectedFile?.reduceMemoryConsumption();
    
    this.syntaxHighlighFn?.emit(this.EnableHighlight);

    if(this.selectedFile!=null)
    {
      this.selectedFile.DiffNewHtml = '';
      this.selectedFile.DiffOldHtml = '';
      this.selectedFile.result1 = '';
      this.selectedFile.result2 = '';
      this.selectedFile.file1Content = '';
      this.selectedFile.file2Content = '';
    }
    this.selectedMergedItem = null;
    this.display = "none";
  }

  compareOnlyImmediateChildFn(){
    this.compareOnlyImmediateChild = !this.compareOnlyImmediateChild;
    this.CancelCompare();
  }

  fetchPathInfo(path: string): string[] {
    return path.split('/');
  }

  compareSort<T extends Directory | File>( a:T, b:T ) {
    if(a instanceof Directory) {

      let left = a as Directory;
      let right = b as Directory;

      if ( left.Name.toLowerCase() < right.Name.toLowerCase() ){
        return -1;
      }
      if ( left.Name.toLowerCase() > right.Name.toLowerCase() ){
        return 1;
      }
      return 0;

    } else{

      let left = a as File;
      let right = b as File;

      if ( left.name.toLowerCase() < right.name.toLowerCase() ){
        return -1;
      }
      if ( left.name.toLowerCase() > right.name.toLowerCase() ){
        return 1;
      }
      return 0;

    }
  }

  generateFoldersFilesForTree(dir: Directory, parentElement: HTMLElement) {

    if(dir==undefined || dir==null)
      return;

    const listItem: HTMLLIElement = document.createElement('li');
    const folderImage: any = document.getElementById("folderImage")?.cloneNode(true);
    const fileImage: any = document.getElementById("fileImage")?.cloneNode(true);

    if(dir.Files.length > 0 || dir.Folders.length > 0){
      const spanele: HTMLSpanElement = document.createElement('span');
      const spanele1: HTMLSpanElement = document.createElement('span');

      spanele.classList.add('caret');
      spanele.style.font = "menu";

      spanele.appendChild(folderImage);
      spanele1.textContent = dir.Name;

      spanele.appendChild(spanele1);

      const ulEle: HTMLUListElement = document.createElement("ul");
      ulEle.classList.add("nested");

      dir.Folders.sort(this.compareSort);

      for(let i=0; i<dir.Folders.length; i++){
        this.generateFoldersFilesForTree(dir.Folders[i], ulEle);
      }

      dir.Files.sort(this.compareSort);

      for(let i=0;i<dir.Files.length; i++){
        const listItem1: HTMLLIElement = document.createElement('li');
        const spanele2: HTMLSpanElement = document.createElement('span');
        spanele2.style.font = "menu";
        spanele2.textContent = dir.Files[i].name;
        //listItem1.appendChild(fileImage);
        listItem1.appendChild(spanele2);

        ulEle.appendChild(listItem1);
      }

      listItem.appendChild(spanele);
      listItem.appendChild(ulEle);
    }
    else {
      const spanele2: HTMLSpanElement = document.createElement('span');

      spanele2.textContent = dir.Name;
      //listItem.appendChild(fileImage);
      listItem.appendChild(spanele2);
    }

    parentElement.appendChild(listItem);
  }

  generateLeftTree(){

    this.fileList1 = document.getElementById('leftUL');

    if (this.fileList1 != null){
          this.fileList1.innerHTML = '';
      }

    if (this.leftSideDirectory!=null && this.leftSideDirectory!=undefined){
          this.generateFoldersFilesForTree(this.leftSideDirectory.Folders[0], this.fileList1);
          this.expandEnable();
      }
  }

  generateRightTree(){
    this.fileList2 = document.getElementById('rightUL');

    if (this.fileList2 != null){
          this.fileList2.innerHTML = '';
      }

    if (this.rightSideDirectory!=null && this.rightSideDirectory!=undefined){
          this.generateFoldersFilesForTree(this.rightSideDirectory.Folders[0], this.fileList2);
          this.expandEnable();
      }
  }

createDirectory(folder: Directory | null, path: string[], index: number, file:File){

  if(index>= path.length && folder==null)
    return;

  if(folder!=null){
      let dir = folder.Folders?.filter(x=>x.Name.toLowerCase()==path[index].toLowerCase());

      if(dir!=undefined && dir!=null && dir.length > 0){
        index++;
        this.createDirectory(dir[0], path, index, file);
      }
      else if(index==path.length-1){
        folder.Files?.push(file);
      }
      else{
        let newDir = new Directory();
        newDir.Name = path[index];
        index++;
        folder.Folders?.push(newDir);
        this.createDirectory(newDir, path, index, file);
      }
    }
}

ngAfterViewInit(): void {
    this.selectFolderButton1 = document.getElementById('selectFolder1');
    this.folderInput1 = document.getElementById('folderInput1');

    this.selectFolderButton2 = document.getElementById('selectFolder2');
    this.folderInput2 = document.getElementById('folderInput2');

    this.folderInput1?.addEventListener("cancel", () => {
      this.leftDirLoadIsInProgress = false;
    });

    this.folderInput1?.addEventListener('change', () => {
      this.leftSideDirectory = new Directory();
      if (this.folderInput1 != null) {
        const files = this.folderInput1.files;
        this.totalFilesinLeftTree = files.length;

        if (files.length > 0) {
          for (let i = 0; i < files.length; i++) {
            let filepaths = this.fetchPathInfo(files[i].webkitRelativePath);
            this.createDirectory(this.leftSideDirectory, filepaths, 0, files[i]);
          }

          this.generateLeftTree();

          let leftTreeUl: any = document.getElementById('leftUL');
          leftTreeUl.childNodes[0].childNodes[0].click();

        } else {
          this.fileList1.textContent = 'No files selected.';
        }

        this.leftDirLoadIsInProgress = false;
      }

    });

    this.folderInput2?.addEventListener("cancel", () => {
      this.rightDirLoadIsInProgress =false;
    });

    this.folderInput2?.addEventListener('change', () => {

      this.rightSideDirectory = new Directory();
      if (this.folderInput2 != null) {
        const files = this.folderInput2.files;
        this.totalFilesinRightTree = files.length;

        if (files.length > 0) {
          for (let i = 0; i < files.length; i++) {
            let filepaths = this.fetchPathInfo(files[i].webkitRelativePath);
            this.createDirectory(this.rightSideDirectory, filepaths, 0, files[i]);
          }

          this.generateRightTree();
          let rightTreeUl: any = document.getElementById('rightUL');
          rightTreeUl.childNodes[0].childNodes[0].click();

        } else {
          this.fileList2.textContent = 'No files selected.';
        }

        this.rightDirLoadIsInProgress = false;
      }

    });
}

  expandEnable(){
    var toggler = document.getElementsByClassName("caret");
    var i;

    for (i = 0; i < toggler.length; i++) {
      toggler[i].removeEventListener("click", this.toggleExpand);
    }

    for (i = 0; i < toggler.length; i++) {
      toggler[i].addEventListener("click", this.toggleExpand);
    }
  }


async refreshUI(){
    if(performance.now() > this.startTime + 20){    //You can change the 20 to how often you want to refresh the UI in milliseconds
        this.startTime = performance.now();
        await new Promise(r => setTimeout(r, 0));
    }
}

  async compareFolders() {
    console.log(this.EnableHighlight);
    this.canShowCompareScreen = true;
    this.diffFolderRootPath = [];
    this.CurrentView = [];
    this.currentLevel=0;
    this.compareDirIsInProgress = true;
    this.refreshUI();
    this.time = 0;
    this.startTimer();

    await this.compareCurrentFolder();
  }

  CancelCompare(){
    this.worker?.terminate();
    this.worker = new Worker(new URL('../app.worker', import.meta.url), { type: 'module' });

    this.canShowCompareScreen = false;
    this.diffFolderRootPath = [];
    this.CurrentView = [];
    this.currentLevel=0;
    this.compareDirIsInProgress = false;
    this.refreshUI();
    this.stopTimer();
    this.statusMessage = "";
  }

  startTimer() {
    this.interval = setInterval(() => {
      if (this.time === 0) {
        this.time++;
      } else {
        this.time++;
      }

      this.compareDirIsInProgress = true;
    }, 1000);
  }

  pauseTimer() {
    clearInterval(this.interval);
  }

  stopTimer() {
    clearInterval(this.interval);
    this.time = 0;
    this.compareDirIsInProgress = false;
  }

  toDateTimer(value: number, args?: any): string {

    const hours: number = Math.floor(value / 60);
    const minutes: number = (value - hours * 60);

    if (hours < 10 && minutes < 10) {
      return '0' + hours + ' : 0' + (value - hours * 60);
    }

    if (hours > 10 && minutes > 10) {
      return '0' + hours + ' : ' + (value - hours * 60);
    }
    if (hours > 10 && minutes < 10) {
      return hours + ' : 0' + (value - hours * 60);
    }

    if (minutes >= 10) {
      return '0' + hours + ' : ' + (value - hours * 60);
    }

    return "";
  }

  async selectedItem(item: MergedList){
    this.canShowCompareScreen = true;
    this.selectedMergedItem = item;
    this.time = 0;

    if(item.IsFolder){
      this.CurrentView = [];
      this.compareDirIsInProgress = true;
      this.refreshUI();
      this.diffFolderRootPath.push(item.Name);
      this.currentLevel++;
      this.startTimer();
      this.totalFiles=-1;

      if(this.compareOnlyImmediateChild) {
        await this.compareCurrentFolder();
      }

      if(!this.compareOnlyImmediateChild)
        this.compareFoldersView();
    }
    else{
      console.log(item);
      //this.openModal();

      let targetIndex = this.diffFolderRootPath.length-1;
      if(this.leftSideDirectory!=null && this.rightSideDirectory!=null){
        let currentLeftFolder;
        let currentRightFolder;

        if(this.currentLevel==0){
          currentLeftFolder = this.leftSideDirectory.Folders[0];
          currentRightFolder = this.rightSideDirectory.Folders[0];
        }else{

          let paths = item.parentFolderPath.split('\\');

          this.diffFolderRootPath = [];
          for(let i=1; i<paths.length; i++){
            this.diffFolderRootPath.push(paths[i]);
          }

          let targetIndex = this.diffFolderRootPath.length-1;
          currentLeftFolder = this.GetCurrentDirectoryFromDiffPath(this.leftSideDirectory.Folders[0], 0, targetIndex,this.diffFolderRootPath[targetIndex]);
          currentRightFolder = this.GetCurrentDirectoryFromDiffPath(this.rightSideDirectory.Folders[0], 0, targetIndex, this.diffFolderRootPath[targetIndex]);
        }

        let leftFiles = currentLeftFolder.Files.filter(x=>x.name.toLowerCase() == item.Name.toLowerCase());
        let rightFiles = currentRightFolder.Files.filter(x=>x.name.toLowerCase() == item.Name.toLowerCase());

        item.fileDiffComponent = new FileDiffComponent(new TokenService(), this.hljs);
        item.fileDiffComponent.enableHighlight = this.EnableHighlight;

        if(leftFiles.length>0 && rightFiles.length ==0){
          item.fileDiffComponent.ReadFile1Content(leftFiles[0])
          item.fileDiffComponent.file1LoadedCallback = async () => {
            await this.refreshUI();
            this.setSelectedFile(item, true);
          };
        }
        else if(leftFiles.length ==0 && rightFiles.length > 0) {
          item.fileDiffComponent.ReadFile2Content(rightFiles[0]);
          item.fileDiffComponent.file2LoadedCallback = async()=> {
            await this.refreshUI();
            this.setSelectedFile(item, true);
          }
        } else {
            item.fileDiffComponent.ReadFile1Content(leftFiles[0]);

            item.fileDiffComponent.file1LoadedCallback = async () => {
              await this.refreshUI();
              item.fileDiffComponent.ReadFile2Content(rightFiles[0]);
            };

            item.fileDiffComponent.file2LoadedCallback = async () => {
              this.setSelectedFile(item, false);
            };
        }
      }

    }
  }

  setSelectedFile(item: MergedList, isSingleFile:boolean){
    item.fileDiffComponent.findDiff(isSingleFile);
    this.selectedFile = item.fileDiffComponent;
    this.openModal();
  }

  async moveToParentFolder(){
    this.CurrentView = [];
    this.canShowCompareScreen = true;
    this.compareDirIsInProgress =true;
    this.refreshUI();
    this.diffFolderRootPath.pop();
    this.currentLevel--;
    this.time = 0;
    this.startTimer();
    this.totalFiles=-1;

    if(this.compareOnlyImmediateChild) {
      await this.compareCurrentFolder();
    }

    if(!this.compareOnlyImmediateChild)
      this.compareFoldersView();
  }

  compareFoldersView(){
    let createPath = "";

    for(let i=0; i<this.diffFolderRootPath.length; i++){
      createPath+="\\"+this.diffFolderRootPath[i];
    }

    let result = this.MergedView.filter(x=>x.parentFolderPath.toLowerCase()==createPath.toLowerCase() && x.Level==this.currentLevel);
    this.CurrentView = result;
    this.isFolderDifferenceDone = true;
    this.compareDirIsInProgress = false;
    this.time = 0;
    this.stopTimer();
  }

  GetCurrentDirectoryFromDiffPath(dir: Directory, currentIndex: number, targetIndex: number, dirName: string): Directory{
    let currentDirname = this.diffFolderRootPath[currentIndex];
    let selectedDir = dir.Folders.filter(x=>x.Name.toLowerCase()==currentDirname.toLowerCase());

    if(selectedDir.length>0){
      if(currentIndex==targetIndex && selectedDir[0].Name.toLowerCase()==dirName.toLowerCase())
        return selectedDir[0];
      else {
        currentIndex++;
        return this.GetCurrentDirectoryFromDiffPath(selectedDir[0], currentIndex, targetIndex, dirName);
      }
    }

    return new Directory();
  }

  async compareCurrentFolder() {
    let currentLeftFolder: Directory;
    let currentRightFolder: Directory;
    this.MergedView = [];
    let level = 0;
    let targetLevel = 0;

    if (this.leftSideDirectory != null && this.rightSideDirectory != null) {
      if (this.currentLevel == 0) {
        currentLeftFolder = this.leftSideDirectory.Folders[0];
        currentRightFolder = this.rightSideDirectory.Folders[0];
      } else {
        let targetIndex = this.diffFolderRootPath.length - 1;
        currentLeftFolder = this.GetCurrentDirectoryFromDiffPath(this.leftSideDirectory.Folders[0], 0, targetIndex, this.diffFolderRootPath[targetIndex]);
        currentRightFolder = this.GetCurrentDirectoryFromDiffPath(this.rightSideDirectory.Folders[0], 0, targetIndex, this.diffFolderRootPath[targetIndex]);
        level = this.currentLevel;
      }

      if (this.compareOnlyImmediateChild) {
        targetLevel = 0;
      } else {
        targetLevel = -99999;
      }

      let createPath = "";

      for (let i = 0; i < this.diffFolderRootPath.length; i++) {
        createPath += "\\" + this.diffFolderRootPath[i];
      }

      if ((currentLeftFolder != null && currentLeftFolder != undefined) && (currentRightFolder != null && currentRightFolder != undefined)) {
        if (this.worker !== undefined) {

          let self = this;

          this.worker.onmessage = ({data}) => {

            if(data.isCompleted) {
              self.MergedView = data.mergedView;
              self.compareFoldersView();
              self.compareDirIsInProgress = false;
              this.statusMessage = "";
            } else{
              this.statusMessage = "Total Files :" + data.totalFiles+", Remaining Files: "+data.remainingfilesCount;
            }
          };

          this.worker.postMessage({currentLeftFolder, currentRightFolder, level, targetLevel, undefined, createPath});
        } else {
          alert("Webworker not supported");
        }
      } else {
        this.compareDirIsInProgress = false;
        this.canShowCompareScreen = false;
      }
    }
  }

  getBothSideFilesCount(leftTree: Directory): number{
    let leftFiles = leftTree.Files.length;

    for (let i=0; i< leftTree.Folders.length; i++){
      leftFiles = leftFiles + this.getBothSideFilesCount(leftTree.Folders[i]);
    }

    return leftFiles;
  }

  async MergedFoldersView(leftTree: Directory, rightTree: Directory, level: number, currentLevel: number, parent: MergedList | undefined = undefined, parentPath:string){

    if(this.totalFiles==-1) {
      if (this.compareOnlyImmediateChild) {
        let leftFiles = leftTree.Files.length;
        let rightFiles = rightTree.Files.length;

        for (let i = 0; i < leftTree.Folders.length; i++) {
          leftFiles = leftFiles + leftTree.Folders[i].Files.length
        }

        for (let i = 0; i < rightTree.Folders.length; i++) {
          rightFiles = rightFiles + rightTree.Folders[i].Files.length
        }

        this.totalFiles = leftFiles + rightFiles;
      } else {
        let leftFiles = this.getBothSideFilesCount(leftTree);
        let rightFiles = this.getBothSideFilesCount(rightTree);
        this.totalFiles = leftFiles + rightFiles;
      }
    }

    if(currentLevel > 1)
      return;

    for(let i=0; i<leftTree.Folders.length; i++){
      let foldername = leftTree.Folders[i].Name;
      let folderExistsinRightTree = rightTree.Folders.filter(x=>x.Name.toLowerCase()==foldername.toLowerCase())
      if(folderExistsinRightTree.length>0){
        let item = new MergedList(folderExistsinRightTree[0].Name, true, false, true, true, level, parentPath);

        // Looping the child folders and files
        await this.MergedFoldersView(leftTree.Folders[i], folderExistsinRightTree[0], (level+1), (currentLevel+1), item, parentPath+'\\'+folderExistsinRightTree[0].Name);
        item.parent = parent;
        this.MergedView.push(item);

      }else{
        let item = new MergedList(leftTree.Folders[i].Name, true, false, true, false, level, parentPath);
        await this.MergedFoldersView(leftTree.Folders[i], new Directory(), (level+1), (currentLevel+1), item, parentPath+'\\'+leftTree.Folders[i].Name);
        item.parent = parent;
        this.MergedView.push(item);
      }
    }

    for(let i=0; i<rightTree.Folders.length; i++){
      let foldername = rightTree.Folders[i].Name;
      let folderExistsinLeftTree = leftTree.Folders.filter(x=>x.Name.toLowerCase()==foldername.toLowerCase())
      if(folderExistsinLeftTree.length>0){

      }else{
        let item = new MergedList(rightTree.Folders[i].Name, true, false, false, true, level, parentPath);
        await this.MergedFoldersView(new Directory(), rightTree.Folders[i], (level+1), (currentLevel+1), item, parentPath+'\\'+rightTree.Folders[i].Name);
        item.parent = parent;
        this.MergedView.push(item);
      }
    }

    for(let i=0; i<leftTree.Files.length; i++){
      let filename = leftTree.Files[i].name;
      let fileExistsinRightTree = rightTree.Files.filter(x=>x.name.toLowerCase()==filename.toLowerCase())
      if(fileExistsinRightTree.length>0){
        let item = new MergedList(fileExistsinRightTree[0].name, false, true, true, true, level, parentPath);

        let diffComponent = new FileDiffComponent(new TokenService(), this.hljs);
        diffComponent.enableHighlight = this.EnableHighlight;

        this.processingFileCount++;

        diffComponent.ReadFile1Content(leftTree.Files[i]);

        diffComponent.file1LoadedCallback = async () => {
          await this.refreshUI();
          diffComponent.ReadFile2Content(fileExistsinRightTree[0]);
        };

        diffComponent.file2LoadedCallback = async () => {
          diffComponent.findDiff();
          item.fileDiffComponent = diffComponent;
          item.IsHaveDeletedTokens = diffComponent.oldFileTokens.some(x=>x.IsDeleted);
          item.IsHaveNewTokens = diffComponent.newFileTokens.some(x=>x.IsNew);

          if((item.IsHaveDeletedTokens || item.IsHaveNewTokens) && parent!=undefined) {
              parent.folderHaveChange = true;

              let _par: MergedList | undefined = parent;

              while(_par!=undefined){
                _par.folderHaveChange = true;
                _par = _par.parent;
              }

          }

          item.parent = parent;
          this.MergedView.push(item);
          this.processingFileCount--;
          this.totalFiles = this.totalFiles - 2;

          if (this.totalFiles == 0) {
            this.compareFoldersView();
          }

          diffComponent.reduceMemoryConsumption();
          diffComponent.DiffNewHtml = '';
          diffComponent.DiffOldHtml = '';
          diffComponent.result1 = '';
          diffComponent.result2 = '';
          diffComponent.file1Content = '';
          diffComponent.file2Content = '';

          item.fileDiffComponent;

          await this.refreshUI();
        }


      }else{
        let item = new MergedList(leftTree.Files[i].name, false, true, true, false, level, parentPath);
        item.parent = parent;
        this.totalFiles--;
        this.MergedView.push(item);
      }
    }


    for(let i=0; i<rightTree.Files.length; i++){
      let filename = rightTree.Files[i].name;
      let fileExistsinLeftTree = leftTree.Files.filter(x=>x.name.toLowerCase()==filename.toLowerCase())
      if(fileExistsinLeftTree.length>0){

      }else{
        let item = new MergedList(rightTree.Files[i].name, false, true, false, true, level, parentPath);
        item.parent = parent;
        this.totalFiles--;
        this.MergedView.push(item);
      }
    }

  }

  toggleExpand(event:any) {
      event.target.parentElement.querySelector(".nested")?.classList.toggle("active");
      event.target.classList.toggle("caret-down");
    }


  browseFolder1() {
    this.isFolderDifferenceDone = false;
    this.canShowCompareScreen = false;
    this.leftDirLoadIsInProgress = true;
    this.diffFolderRootPath = [];
    this.folderInput1.click();
  }

  browseFolder2() {
    this.isFolderDifferenceDone = false;
    this.canShowCompareScreen = false;
    this.rightDirLoadIsInProgress = true;
    this.diffFolderRootPath = [];
    this.folderInput2.click();
  }

}
