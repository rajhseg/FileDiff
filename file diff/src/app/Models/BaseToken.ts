import { FileDiffComponent } from "../file-diff/file-diff.component";

export abstract class BaseToken {
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

export enum MarkerType {
  None,
  Down,
  Up
}

export class OldFile extends BaseToken {

    constructor(content:string, index: number, isdeleted:boolean = false, inserted:boolean = false){
        super();
        this.Token = content;
        this.IsDeleted = isdeleted;
        this.Index = index;
        this.Inserted = inserted;
    }

    IsDeleted: boolean = false;
}

export class NewFile extends BaseToken {
    IsNew: boolean = false;

    constructor(content: string, index: number, isnew: boolean =false, inserted:boolean = false){
        super();
        this.Token =content;
        this.IsNew = isnew;
        this.Index = index;
        this.Inserted = inserted;
    }
}

export enum FileEnum {
    OldFile,
    NewFile
}

export class PreviousStringMatch{
  private prevPathLength!: number;
  private prevMatchTokenData!: BaseToken | undefined;

  constructor(previousMatchDistance: number, previousMatchtoken: BaseToken | undefined) {
        this.prevPathLength = previousMatchDistance;
        this.prevMatchTokenData = previousMatchtoken;
    }

    GetPreviousMatchDistance(){
        return this.prevPathLength;
    }

    GetPreviousMatchTokenData(){
        return this.prevMatchTokenData;
    }
}


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


export class Directory{

    Files: File[] = [];
    Folders: Directory[] = [];

    Name!: string;
}

export class MergedList{
    Name!: string;
    IsFolder!: boolean;
    IsFile!: boolean;
    IsPresentInLeftTree!: boolean;
    IsPresentInRightTree!: boolean;
    IsHaveDeletedTokens: boolean =false;
    IsHaveNewTokens: boolean =false;
    fileDiffComponent!: FileDiffComponent;
    Level: number = -1;
    folderHaveChange: boolean = false;
    parentFolderPath: string = '';
    parent: MergedList | undefined = undefined;

    constructor(name: string, isfolder: boolean, isfile: boolean, presentinLeftTree: boolean,
        presentinRightTree: boolean, level: number, parentfolderpath: string){
        this.Name = name;
        this.IsFile = isfile;
        this.IsFolder = isfolder;
        this.IsPresentInLeftTree = presentinLeftTree;
        this.IsPresentInRightTree = presentinRightTree;
        this.Level = level;
        this.parentFolderPath = parentfolderpath;
    }
}

export class MergeFilterWorkerObject {
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

