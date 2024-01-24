// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { Dependency, MarksProvider } from "./marksProvider";

// defined a struct save file name and line number, and content
class FileLineContent {
  fileName: string;
  lineNumber: number;
  content: string;
  constructor(fileName: string, lineNumber: number, content: string) {
    this.fileName = fileName;
    this.lineNumber = lineNumber;
    this.content = content;
  }
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "vscode-test" is now active!');

  const rootPath =
    vscode.workspace.workspaceFolders &&
    vscode.workspace.workspaceFolders.length > 0
      ? vscode.workspace.workspaceFolders[0].uri.fsPath
      : "";
  let marksProvider = new MarksProvider(rootPath);
  // 1.在vscode-test标签页创建一个树形视图
  //   vscode.window.registerTreeDataProvider("vscode-test", marksProvider);
  // 2.在Explorer标签页创建一个树形视图
  vscode.window.createTreeView("explorer-marks", {
    treeDataProvider: marksProvider,
    // showCollapseAll: true,
    // canSelectMany: true,
    // dragAndDropController: new TestViewDragAndDrop(context),
  });

  let refreshEntry = () => {
    marksProvider.refresh();
    vscode.window.showInformationMessage(`Successfully called refresh entry.`);
  };
  // vscode.commands.registerCommand('extension.openPackageOnNpm', moduleName => vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(`https://www.npmjs.com/package/${moduleName}`)));
  let addEntryFunc = () => {
    const filePath = vscode.window.activeTextEditor?.document.fileName;
    // path.join(rootPath, "go-mod-test", element.label, "package.json");
    let line = vscode.window.activeTextEditor?.selection.active.line;
    let content =
      line !== undefined
        ? vscode.window.activeTextEditor?.document.lineAt(line).text
        : undefined;
    if (filePath !== undefined && line !== undefined && content !== undefined) {
      marksProvider.addMark(filePath, line, content);
      marksProvider.refresh();
    }
  };
  let deleteEntry = (...args: Dependency[]) => {
    for (let i = 0; i < args.length; i++) {
      let element = args[i];
      if (element == null) {
        break;
      }
      marksProvider.delMark(element.getLabel(), element.getExtra());
    }
    marksProvider.refresh();
  };
  let clearEntry = () => {
    marksProvider.clearMarks();
    marksProvider.refresh();
  };
  let itemClicked = (item: Dependency) => {
    marksProvider.onItemClick(item);
  };
  vscode.commands.registerCommand("explorer-marks.addEntry", addEntryFunc);
  vscode.commands.registerCommand("explorer-marks.refreshEntry", refreshEntry);
  vscode.commands.registerCommand("explorer-marks.deleteEntry", deleteEntry);
  vscode.commands.registerCommand("explorer-marks.clearEntry", clearEntry);
  vscode.commands.registerCommand(
    "explorer-marks.on_item_clicked",
    itemClicked
  );
  let disposable = vscode.commands.registerCommand(
    "vscode-test.helloWorld",
    addEntryFunc
  );
  context.subscriptions.push(disposable);
}
// This method is called when your extension is deactivated
export function deactivate() {}
