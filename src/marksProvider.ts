import * as vscode from "vscode";
import * as path from "path";

export class MarksProvider implements vscode.TreeDataProvider<Dependency> {
  private elements: Dependency[] = [];
  private view: vscode.TreeView<Dependency> | undefined = undefined;
  constructor(private workspaceRoot: string) {}
  _getMark(filePath: string) {
    let fileName = path.basename(filePath);
    let fileReleationPath = filePath
      .replace(this.workspaceRoot + "/", "")
      .replace("/" + fileName, "");
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
  delMark(label: string, extra: string) {
    for (let i = 0; i < this.elements.length; i++) {
      if (
        this.elements[i].label === label &&
        this.elements[i].getDescription() === extra
      ) {
        this.elements.splice(i, 1);
        break;
      } else {
        let items = this.elements[i].getItems();
        for (let j = 0; j < items.length; j++) {
          if (items[j].label === label && items[j].getDescription() === extra) {
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
  async addMark(filePath: string, lineNumber: number, content: string) {
    let mark = this._getMark(filePath);
    content = content.trim();
    mark.addItem(lineNumber, content);
    if (mark.getItems().length === 0) {
      this.delMark(mark.getLabel(), mark.getExtra());
    } else {
      this.refresh();
      await this.view?.reveal(mark, { expand: true });
    }
    this.refresh();
  }
  clearMarks(): void {
    this.elements = [];
  }

  public getParent(element: Dependency): Dependency | undefined {
    return element.Parent();
  }
  getTreeItem(element: Dependency): vscode.TreeItem {
    var title = element.label ? element.label : "";
    var result = new vscode.TreeItem(title, element.collapsibleState);
    result.command = {
      command: "explorer-marks.on_item_clicked",
      title: title,
      arguments: [element],
    };
    const tooltip = new vscode.MarkdownString(
      `$(go-to-file) ${title}/${element.label}`,
      true
    );
    result.tooltip = tooltip;
    result.iconPath = element.iconPath;
    result.description = element.description;
    // if (element.collapsibleState !== vscode.TreeItemCollapsibleState.None) {
    //   result.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
    // }
    return result;
  }
  setView(view: vscode.TreeView<Dependency>) {
    this.view = view;
  }
  getChildren(element?: Dependency): Thenable<Dependency[]> {
    if (element === undefined) {
      return Promise.resolve(this.elements);
    } else {
      return Promise.resolve(element.getItems());
    }
  }

  async collapsedAll() {
    await vscode.commands.executeCommand(
      `workbench.actions.treeView.explorer-marks.collapseAll`
    );
    this.refresh();
  }
  async expandedAll() {
    let pp: Thenable<void>[] = [];
    for (let ele of this.elements) {
      if (this.view) {
        pp.push(this.view.reveal(ele, { expand: true }));
      }
    }
    await Promise.all(pp);
    this.refresh();
  }
  onItemClick(element?: Dependency) {
    if (element != undefined && element?.Parent() === undefined) {
      // jump to file by element.label and element.description as file path
      let description = element.getDescription();
      if (description) {
        let filePath = path.join(
          this.workspaceRoot,
          `${description.toString()}/${element.label}`
        );
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
          let filePath = path.join(
            this.workspaceRoot,
            `${description.toString()}/${parent.label}`
          );
          vscode.workspace.openTextDocument(filePath).then(
            (doc) => {
              vscode.window.showTextDocument(doc).then((editor) => {
                let line = parseInt(element?.label || "0");
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
    public readonly extra: string,
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
  addItem(line: number, content: string) {
    for (let idx = 0; idx < this.items.length; idx++) {
      let item = this.items[idx];
      if (item.label === line.toString()) {
        this.items.splice(idx, 1);
        return;
      }
    }
    let item = new Dependency(
      line.toString(),
      content,
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
