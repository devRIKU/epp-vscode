"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const path = require("path");
function activate(context) {
    console.log('E++ Language Support is now active!');
    // 1. Run Command (One-click Run E++ program)
    let runCmd = vscode.commands.registerCommand('epp.run', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage("No active editor to run.");
            return;
        }
        const filePath = editor.document.uri.fsPath;
        if (!filePath.endsWith('.epp')) {
            vscode.window.showErrorMessage("Active file is not an E++ program (.epp)");
            return;
        }
        // Save file before running
        editor.document.save().then(() => {
            const terminal = vscode.window.createTerminal("E++");
            terminal.show();
            // We assume epp_interpreter.py is either in PATH or in the parent directly.
            // Let's run python epp_interpreter.py with the absolute file path.
            // First cd into the script's directory so relative paths work.
            const dir = path.dirname(filePath);
            terminal.sendText(`cd "${dir}"`);
            terminal.sendText(`python epp_interpreter.py "${path.basename(filePath)}"`);
        });
    });
    // 2. Hover Provider (Intellisense Documentation)
    let hoverProvider = vscode.languages.registerHoverProvider('epp', {
        provideHover(document, position, token) {
            const range = document.getWordRangeAtPosition(position);
            if (!range)
                return null;
            const word = document.getText(range).toLowerCase();
            const hoverDocs = {
                'say': '**say** `[expression]`\n\nPrints the expression to the console. (Equivalent to `print`)\n\n*Example:* `say "Hello."`',
                'print': '**PRINT** `[expression]`\n\nPseudo code output instruction.',
                'declare': '**DECLARE** `[variable] = [value]`\n\nCreates a new variable.',
                'set': '**set** `[variable]` **to** `[value]`\n\nAssigns a new value to a variable.',
                'let': '**let** `[variable]` **be** `[value]`\n\nDeclares a variable.',
                'function': '**FUNCTION** `name(args)`\n... \n**END FUNCTION**\n\nDefines a pseudo code function.',
                'define': '**define** `name` **with** `args`.\n... \n**end define**.\n\nDefines a new E++ functional block.',
                'repeat': '**repeat** `[N]` **times**.\n... \n**end repeat**.\n\nLoops exactly N times.',
                'while': '**while** `[condition]`.\n... \n**end while**.\n\nLoops as long as condition is true.',
                'ask': '**ask** `"[prompt]"` **and store it in** `[variable]`.\n\nGets user input.',
                'create': '**create window titled** `"[Title]"`\n\nInitializes a graphical webview window.',
                'open': '**open url** `"[URL]"` **in window** `"[Title]"`\n\nLoads a webpage in a window.',
                'show': '**show windows**.\n\nStarts the graphical interface loop. Must be the last statement.',
                'fetch': '**fetch page** `"[URL]"` **into** `[variable]`.\n\nDownloads raw HTML of a web page.',
                'attempt': '**attempt**.\n...\n**if it fails**.\n...\n**end attempt**.\n\nTry-catch block for error handling.',
                'record': '**record**.\n...\n**end record**.\n\nCreates an object/record to store properties.'
            };
            if (hoverDocs[word]) {
                const md = new vscode.MarkdownString(hoverDocs[word]);
                md.isTrusted = true;
                return new vscode.Hover(md);
            }
            return null;
        }
    });
    // 3. Completion Provider (Intellisense Snippets)
    let completionProvider = vscode.languages.registerCompletionItemProvider('epp', {
        provideCompletionItems(document, position, token, context) {
            const items = [];
            const createSnippet = (label, text, detail) => {
                const item = new vscode.CompletionItem(label, vscode.CompletionItemKind.Snippet);
                item.insertText = new vscode.SnippetString(text);
                item.detail = detail;
                return item;
            };
            items.push(createSnippet('if block', 'if ${1:condition} then.\n\t${2:say "true"}\nend if.', 'E++ If Block'));
            items.push(createSnippet('IF THEN ENDIF', 'IF ${1:condition} THEN\n\t${2:PRINT "true"}\nENDIF', 'Pseudo Code IF Block'));
            items.push(createSnippet('define function', 'define ${1:name} with ${2:args}.\n\t${3:give back null}\nend define.', 'E++ Function'));
            items.push(createSnippet('FUNCTION', 'FUNCTION ${1:name}(${2:args})\n\t${3:RETURN null}\nEND FUNCTION', 'Pseudo Code Function'));
            items.push(createSnippet('repeat times', 'repeat ${1:10} times.\n\t${2:say "loop"}\nend repeat.', 'E++ Repeat Loop'));
            items.push(createSnippet('FOR loop', 'FOR ${1:i} = ${2:1} TO ${3:10}\n\t${4:PRINT i}\nNEXT', 'Pseudo Code FOR Loop'));
            items.push(createSnippet('create window', 'create window titled "${1:My App}" sized ${2:800} by ${3:600}.\nshow windows.', 'E++ UI Window'));
            // Keywords
            const keywords = ['say', 'ask', 'let', 'set', 'declare', 'print', 'output', 'input', 'increment', 'decrement', 'swap', 'start program.', 'end program.'];
            keywords.forEach(kw => {
                items.push(new vscode.CompletionItem(kw, vscode.CompletionItemKind.Keyword));
            });
            return items;
        }
    });
    // 4. Basic Diagnostics (Linter)
    const diagnosticCollection = vscode.languages.createDiagnosticCollection('epp');
    function updateDiagnostics(document) {
        if (document.languageId !== 'epp')
            return;
        const diagnostics = [];
        const text = document.getText();
        const lines = text.split(/\r?\n/);
        // Let's do a basic block balancing check
        let blocks = 0;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim().toLowerCase();
            if (!line || line.startsWith('//') || line.startsWith('note'))
                continue;
            // Check for unbalanced typical blocks
            const openMatch = line.match(/\b(if .* then|while|define|function|procedure|repeat .* times|for |try|text block)\b/);
            const closeMatch = line.match(/\b(end if|endif|end while|endwhile|end define|end function|endfunction|end procedure|endprocedure|end repeat|next|end for|endfor|end try|end text)\b/);
            if (openMatch)
                blocks++;
            if (closeMatch)
                blocks--;
        }
        // We could flag if blocks < 0, but since E++ is dynamic, we'll keep it simple
        // If we want real lints, we should spawn python...
        diagnosticCollection.set(document.uri, diagnostics);
    }
    vscode.workspace.onDidSaveTextDocument(updateDiagnostics, null, context.subscriptions);
    vscode.workspace.onDidOpenTextDocument(updateDiagnostics, null, context.subscriptions);
    if (vscode.window.activeTextEditor) {
        updateDiagnostics(vscode.window.activeTextEditor.document);
    }
    context.subscriptions.push(runCmd, hoverProvider, completionProvider, diagnosticCollection);
}
function deactivate() { }
//# sourceMappingURL=extension.js.map