import * as vscode from "vscode";
import * as path from "path";

export class MarksProvider implements vscode.TreeDataProvider<Dependency> {
  private elements: Dependency[] = [];
  constructor(private workspaceRoot: string) {}
  _getMark(filePath: string) {
    let fileName = path.basename(filePath);
    let fileReleationPath = filePath.replace(this.workspaceRoot + "/", "");
    for (let ele of this.elements) {
      if (
        ele.getLabel() == fileName ||
        ele.getDescription() == fileReleationPath
      ) {
        return ele;
      }
    }
    let mark = new Dependency(
      fileName,
      fileReleationPath,
      undefined,
      vscode.TreeItemCollapsibleState.Collapsed
    );
    mark.description = fileReleationPath;
    this.elements.push(mark);
    return mark;
  }
  delMark(label: string, version: string) {
    for (let i = 0; i < this.elements.length; i++) {
      if (
        this.elements[i].label === label &&
        this.elements[i].getDescription() === version
      ) {
        this.elements.splice(i, 1);
        break;
      } else {
        let items = this.elements[i].getItems();
        for (let j = 0; j < items.length; j++) {
          if (
            items[j].label === label &&
            items[j].getDescription() === version
          ) {
            items.splice(j, 1);
            if (items.length === 0) {
              this.elements.splice(i, 1);
            }
            break;
          }
        }
      }
    }
  }
  addMark(filePath: string, lineNumber: number, content: string) {
    let mark = this._getMark(filePath);
    content = content.trim();
    mark.addItem(content, lineNumber);
    if (mark.getItems().length === 0) {
      this.delMark(mark.getLabel(), mark.getExtra());
    }
  }
  clearMarks(): void {
    this.elements = [];
  }
  getTreeItem(element: Dependency): vscode.TreeItem {
    var title = element.label ? element.label.toString() : "";
    var result = new vscode.TreeItem(title, element.collapsibleState);
    result.command = {
      command: "explorer-marks.on_item_clicked",
      title: title,
      arguments: [element],
    };
    const tooltip = new vscode.MarkdownString(`$(go-to-file) ${title}`, true);
    result.tooltip = tooltip;
    result.iconPath = element.iconPath;
    result.description = element.description;
    result.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
    return result;
  }

  getChildren(element?: Dependency): Thenable<Dependency[]> {
    if (element === undefined) {
      return Promise.resolve(this.elements);
    } else {
      return Promise.resolve(element.getItems());
    }
  }

  onItemClick(element?: Dependency) {
    if (element != undefined && element?.Parent() === undefined) {
      // jump to file by element.label and element.description as file path
      let description = element.getDescription();
      if (description) {
        let filePath = path.join(this.workspaceRoot, description.toString());
        vscode.workspace.openTextDocument(filePath).then(
          (doc) => {
            vscode.window.showTextDocument(doc);
          },
          (err) => {
            vscode.window.showWarningMessage(err.message);
          }
        );
      }
    } else {
      // jump to file by element.parent.label and element.parent.description as file path,
      // and jump to file line by element.getVersion() as line number
      let parent = element?.Parent();
      if (parent != undefined) {
        let description = parent.getDescription();
        if (description) {
          let filePath = path.join(this.workspaceRoot, description.toString());
          vscode.workspace.openTextDocument(filePath).then(
            (doc) => {
              vscode.window.showTextDocument(doc).then((editor) => {
                let line = parseInt(element?.getExtra() || "0");
                line >= editor.document.lineCount
                  ? (line = editor.document.lineCount - 1)
                  : (line = line);
                let range = editor.document.lineAt(line).range;
                editor.selection = new vscode.Selection(range.start, range.end);
                editor.revealRange(range);
              });
            },
            (err) => {
              vscode.window.showWarningMessage(err.message);
            }
          );
        }
      }
    }
  }
  private _onDidChangeTreeData: vscode.EventEmitter<
    Dependency | undefined | null | void
  > = new vscode.EventEmitter<Dependency | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<
    Dependency | undefined | null | void
  > = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }
}
export class Dependency extends vscode.TreeItem {
  private items: Dependency[] = [];
  constructor(
    public readonly label: string,
    private extra: string,
    private parent: Dependency | undefined,
    collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
    this.tooltip = `${this.label}-${this.extra}`;
    this.description = this.extra;
    this.setIconPath();
  }
  Parent(): Dependency | undefined {
    return this.parent;
  }
  getExtra(): string {
    return this.extra;
  }
  getLabel(): string {
    return this.label;
  }
  getDescription(): string | boolean {
    return this.description || false;
  }
  setCollapsibleState(state: vscode.TreeItemCollapsibleState) {
    this.collapsibleState = state;
  }
  addItem(content: string, line: number) {
    for (let idx = 0; idx < this.items.length; idx++) {
      let item = this.items[idx];
      if (item.extra === line.toString()) {
        this.items.splice(idx, 1);
        return;
      }
    }
    let item = new Dependency(
      content,
      line.toString(),
      this,
      vscode.TreeItemCollapsibleState.None
    );
    this.items.push(item);
  }

  getItems(): Dependency[] {
    return this.items;
  }
  setIconPath() {
    if (!this.parent) {
      this.iconPath = {
        light: path.join(
          __filename,
          "..",
          "..",
          "resources",
          "light",
          "document.svg"
        ),
        dark: path.join(
          __filename,
          "..",
          "..",
          "resources",
          "dark",
          "document.svg"
        ),
      };
    } else {
      this.iconPath = {
        light: path.join(
          __filename,
          "..",
          "..",
          "resources",
          "light",
          "string.svg"
        ),
        dark: path.join(
          __filename,
          "..",
          "..",
          "resources",
          "dark",
          "string.svg"
        ),
      };
    }
  }
}
