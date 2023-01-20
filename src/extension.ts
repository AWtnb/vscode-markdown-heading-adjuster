import * as vscode from "vscode";

const decreaseHeading = (s: string): string => {
  if (s.startsWith("##")) {
    return s.substring(1);
  }
  return s;
};

const increaseHeading = (s: string): string => {
  if (s.startsWith("#") && !s.startsWith("######")) {
    return "#" + s;
  }
  return s;
};

const getEOF = (editor: vscode.TextEditor): vscode.Position => {
  const maxLineIdx = editor.document.lineCount - 1;
  return new vscode.Position(maxLineIdx, editor.document.lineAt(maxLineIdx).text.length);
};

const getMdHeading = (editor: vscode.TextEditor, start: vscode.Position, end: vscode.Position): vscode.Range[] => {
  const reg: RegExp = new RegExp("^#{1,6} .+$", "g");
  const found: vscode.Range[] = [];
  for (let i = start.line; i <= end.line; i++) {
    const line = editor.document.lineAt(i);
    let result;
    while ((result = reg.exec(line.text)) !== null) {
      const matchStart = new vscode.Position(i, result.index);
      const matchEnd = new vscode.Position(i, result.index + result[0].length);
      found.push(new vscode.Range(matchStart, matchEnd));
    }
  }
  return found.filter((range) => {
    return range.start.isAfterOrEqual(start) && range.end.isBeforeOrEqual(end);
  });
};

const selectAllMdHeading = (editor: vscode.TextEditor) => {
  const start = new vscode.Position(0, 0);
  const end = getEOF(editor);
  editor.selections = getMdHeading(editor, start, end).map((range) => {
    return new vscode.Selection(range.start, range.end);
  });
};

const extendSelections = (editor: vscode.TextEditor) => {
  const selBottom = editor.selections
    .slice()
    .sort((a, b) => {
      if (a.end.line < b.end.line) {
        return -1;
      }
      if (b.end.line < a.end.line) {
        return 1;
      }
      return 0;
    })
    .slice(-1)[0];
  const searchStart = new vscode.Position(selBottom.end.line + 1, 0);
  const possibles = getMdHeading(editor, searchStart, getEOF(editor));
  if (possibles.length < 1) {
    return;
  }
  const next = possibles[0];
  const newSels = editor.selections.slice();
  newSels.push(new vscode.Selection(next.start, next.end));
  editor.selections = newSels;
};

const splitSelections = (editor: vscode.TextEditor) => {
  const newSels: vscode.Selection[] = [];
  editor.selections
    .filter((sel) => !sel.isEmpty)
    .forEach((sel) => {
      const start = new vscode.Position(sel.start.line, 0);
      const end = new vscode.Position(sel.end.line, editor.document.lineAt(sel.end.line).text.length);
      getMdHeading(editor, start, end).forEach((range) => {
        const sel = new vscode.Selection(range.start, range.end);
        newSels.push(sel);
      });
    });
  editor.selections = newSels;
};

const replaceSelections = (editor: vscode.TextEditor, formatter: Function) => {
  editor.edit((editBuilder) => {
    editor.selections
      .filter((sel) => !sel.isEmpty)
      .forEach((sel) => {
        const text = editor.document.getText(sel);
        const newText = formatter(text);
        if (text != newText) {
          editBuilder.replace(sel, newText);
        }
      });
  });
};

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerTextEditorCommand("markdown-heading-adjuster.increase", (editor: vscode.TextEditor) => {
      replaceSelections(editor, increaseHeading);
    })
  );
  context.subscriptions.push(
    vscode.commands.registerTextEditorCommand("markdown-heading-adjuster.decrease", (editor: vscode.TextEditor) => {
      replaceSelections(editor, decreaseHeading);
    })
  );
  context.subscriptions.push(
    vscode.commands.registerTextEditorCommand("markdown-heading-adjuster.selectAll", (editor: vscode.TextEditor) => {
      selectAllMdHeading(editor);
    })
  );
  context.subscriptions.push(
    vscode.commands.registerTextEditorCommand("markdown-heading-adjuster.extendSelections", (editor: vscode.TextEditor) => {
      extendSelections(editor);
    })
  );
  context.subscriptions.push(
    vscode.commands.registerTextEditorCommand("markdown-heading-adjuster.splitSelections", (editor: vscode.TextEditor) => {
      splitSelections(editor);
    })
  );
}

export function deactivate() {}
