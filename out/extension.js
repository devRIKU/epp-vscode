"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
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
            terminal.sendText(`epp "${filePath}"`);
        });
    });
    // ═══════════════════════════════════════════════════════════════════════
    // 2. Hover Provider (Intellisense Documentation)
    //    Covers ALL syntax variations from both E++ and pseudo code styles.
    // ═══════════════════════════════════════════════════════════════════════
    let hoverProvider = vscode.languages.registerHoverProvider('epp', {
        provideHover(document, position, token) {
            const lineText = document.lineAt(position.line).text;
            const range = document.getWordRangeAtPosition(position, /[a-zA-Z_]+/);
            if (!range)
                return null;
            const word = document.getText(range).toLowerCase();
            // ── Multi-word detection ──
            // For compound keywords like "give back", "for each", "end if", etc.
            const lineLC = lineText.toLowerCase();
            const multiWordDocs = [
                // Variable assignment variations
                { pattern: /\blet\s+\w+\s+be\b/i, doc: '**let** `[variable]` **be** `[value]`\n\nDeclares a variable with a value.\n\n*Variations:*\n- `let x be 10`\n- `let x = 10`\n- `set x to 10`\n- `set x = 10`\n- `DECLARE x = 10`\n- `DECLARE x AS integer`\n- `ASSIGN x = 10`\n- `ASSIGN 10 TO x`\n- `x <- 10`' },
                { pattern: /\bset\s+\w+\s+to\b/i, doc: '**set** `[variable]` **to** `[value]`\n\nAssigns a new value to a variable.\n\n*Variations:*\n- `set x to 10`\n- `set x = 10`\n- `let x be 10`\n- `DECLARE x = 10`\n- `ASSIGN x = 10`\n- `x <- 10`' },
                { pattern: /\bassign\s+.*\s+to\b/i, doc: '**ASSIGN** `[value]` **TO** `[variable]`\n\nPseudo code assignment (value first, then variable).\n\n*Also:* `ASSIGN variable = value`\n\n*E++ equivalents:* `let x be 10` · `set x to 10`' },
                { pattern: /\bdeclare\s+.*\s+as\b/i, doc: '**DECLARE** `[variable]` **AS** `[type]`\n\nDeclares a variable with a type default.\n\n*Supported types:* `integer`, `int`, `float`, `real`, `double`, `string`, `char`, `boolean`, `bool`, `array`\n\n*Also:* `DECLARE x = value` · `DECLARE x`' },
                { pattern: /\bgive\s+back\b/i, doc: '**give back** `[value]`\n\nReturns a value from a function (E++ style).\n\n*Pseudo code equivalent:* `RETURN value`' },
                { pattern: /\bfor\s+each\b/i, doc: '**for each** `[item]` **in** `[list]`\n\nIterates over each element in a collection.\n\n*Example:*\n```\nfor each name in names.\n    say name.\nend for.\n```' },
                { pattern: /\band\s+store\s+in\b/i, doc: '**ask** `"prompt"` **and store in** `[variable]`\n\nGets user input and stores it in a variable.\n\n*Pseudo code equivalents:*\n- `INPUT variable`\n- `READ variable`\n- `INPUT variable WITH PROMPT "prompt"`' },
                { pattern: /\bstop\s+loop\b/i, doc: '**stop loop**\n\nBreaks out of the current loop (E++ style).\n\n*Pseudo code equivalents:* `BREAK` · `EXIT`' },
                { pattern: /\bskip\s+loop\b/i, doc: '**skip loop**\n\nSkips to the next iteration of the current loop (E++ style).\n\n*Pseudo code equivalents:* `CONTINUE` · `NEXT ITERATION`' },
                { pattern: /\bnext\s+iteration\b/i, doc: '**NEXT ITERATION**\n\nSkips to the next iteration of the current loop.\n\n*E++ equivalent:* `skip loop`\n*Also:* `CONTINUE`' },
                { pattern: /\bif\s+it\s+fails\b/i, doc: '**if it fails**\n\nCatch block in E++ error handling.\n\n*Example:*\n```\nattempt.\n    say 10 divided by 0.\nif it fails.\n    say "Error!"\nend attempt.\n```\n\n*Pseudo code equivalent:* `ON ERROR`' },
                { pattern: /\bon\s+error\b/i, doc: '**ON ERROR**\n\nPseudo code catch block for error handling.\n\n*E++ equivalent:* `if it fails`' },
                { pattern: /\bstart\s+program\b/i, doc: '**start program**\n\nDefines the main entry point of the program.\n\n*Paired with:* `end program`\n\n*Pseudo code equivalent:* `BEGIN` ... `END`' },
                { pattern: /\bend\s+program\b/i, doc: '**end program**\n\nCloses the main entry point block.' },
                { pattern: /\btext\s+block\b/i, doc: '**text block**\n\nBegins a multi-line string.\n\n*Example:*\n```\nset myText to text block.\nHello,\nWorld!\nend text.\n```' },
                { pattern: /\bend\s+text\b/i, doc: '**end text**\n\nEnds a multi-line text block.' },
                { pattern: /\bend\s+record\b/i, doc: '**end record**\n\nEnds a record (object) definition.' },
                { pattern: /\bcreate\s+window\s+titled\b/i, doc: '**create window titled** `"Title"` [**sized** `W` **by** `H`]\n\nCreates a graphical webview window.\n\n*Example:*\n```\ncreate window titled "My App" sized 800 by 600.\n```' },
                { pattern: /\bopen\s+url\b/i, doc: '**open url** `"URL"` **in window** `"Title"`\n\nLoads a webpage in a previously created window.' },
                { pattern: /\bshow\s+windows\b/i, doc: '**show windows**\n\nStarts the graphical interface event loop. Must be the last statement.' },
                { pattern: /\bload\s+file\b/i, doc: '**load file** `"path"` **into window** `"Title"`\n\nLoads a local HTML file into a window.' },
                { pattern: /\bset\s+window\s+content\s+of\b/i, doc: '**set window content of** `"Title"` **to** `"HTML"`\n\nSets the HTML content of a window directly.' },
                { pattern: /\bfetch\s+page\b/i, doc: '**fetch page** `"URL"` **into** `[variable]`\n\nDownloads raw HTML of a web page.' },
                { pattern: /\bread\s+text\s+from\s+html\b/i, doc: '**read text from html** `[variable]` **into** `[variable2]`\n\nExtracts plain text from HTML content.' },
                { pattern: /\bread\s+html\s+file\b/i, doc: '**read html file** `"path"` **into** `[variable]`\n\nReads an HTML file into a variable.' },
                { pattern: /\bread\s+file\b/i, doc: '**read file** `"path"` **into** `[variable]`\n\nReads a file\'s contents into a variable.' },
                { pattern: /\bwrite\s+.*\s+to\s+file\b/i, doc: '**write** `[content]` **to file** `"path"`\n\nWrites content to a file.' },
                { pattern: /\bbring\s+in\b/i, doc: '**bring in** `[module]`\n\nImports a module (E++ style).\n\n*Example:* `bring in random`' },
                { pattern: /\badd\s+.*\s+to\b/i, doc: '**add** `[item]` **to** `[list]`\n\nAppends an item to a list.\n\n*Example:* `add "hello" to myList`' },
                { pattern: /\bremove\s+.*\s+from\b/i, doc: '**remove** `[item]` **from** `[list]`\n\nRemoves an item from a list.' },
                { pattern: /\bincrement\s+.*\s+by\b/i, doc: '**INCREMENT** `[variable]` **BY** `[value]`\n\nIncreases a variable by a specific amount.\n\n*Also:* `INCREMENT variable` (increases by 1)' },
                { pattern: /\bdecrement\s+.*\s+by\b/i, doc: '**DECREMENT** `[variable]` **BY** `[value]`\n\nDecreases a variable by a specific amount.\n\n*Also:* `DECREMENT variable` (decreases by 1)' },
                { pattern: /\bcheck\s+if\b/i, doc: '**check if** `[variable]` **is a** `number`/`string`/`boolean`/`list`\n\nType-checking expression.\n\n*Example:* `if check if x is a number then.`' },
                { pattern: /\bloop\s+while\b/i, doc: '**LOOP WHILE** `[condition]`\n\nEnd of a `DO` ... `LOOP WHILE` block. Continues looping while condition is true.\n\n*Also:* `UNTIL condition` (loops until condition becomes true)' },
                { pattern: /\bdivided\s+by\b/i, doc: '**divided by**\n\nDivision operator.\n\n*Also:* `/`' },
                { pattern: /\bis\s+not\b/i, doc: '**is not**\n\nInequality comparison.\n\n*Also:* `!=`' },
                { pattern: /\bis\s+greater\s+than\b/i, doc: '**is greater than**\n\nGreater-than comparison.\n\n*Also:* `>`' },
                { pattern: /\bis\s+less\s+than\b/i, doc: '**is less than**\n\nLess-than comparison.\n\n*Also:* `<`' },
                { pattern: /\bis\s+at\s+least\b/i, doc: '**is at least**\n\nGreater-or-equal comparison.\n\n*Also:* `>=`' },
                { pattern: /\bis\s+at\s+most\b/i, doc: '**is at most**\n\nLess-or-equal comparison.\n\n*Also:* `<=`' },
                { pattern: /\bjoined\s+with\b/i, doc: '**joined with**\n\nString concatenation operator.\n\n*Also:* `+`' },
                { pattern: /\bsquare\s+root\s+of\b/i, doc: '**call square root of** `[expression]`\n\nReturns the square root of a number.' },
                { pattern: /\babsolute\s+of\b/i, doc: '**call absolute of** `[expression]`\n\nReturns the absolute value of a number.' },
                { pattern: /\blength\s+of\b/i, doc: '**call length of** `[expression]`\n\nReturns the length of a string or list.' },
                { pattern: /\buppercase\s+of\b/i, doc: '**call uppercase of** `[expression]`\n\nConverts a string to uppercase.' },
                { pattern: /\blowercase\s+of\b/i, doc: '**call lowercase of** `[expression]`\n\nConverts a string to lowercase.' },
                { pattern: /\bsort\s+list\b/i, doc: '**call sort list** `[expression]`\n\nReturns a sorted version of a list.' },
                { pattern: /\breverse\s+list\b/i, doc: '**call reverse list** `[expression]`\n\nReturns a reversed version of a list.' },
                { pattern: /\bsize\s+of\b/i, doc: '**size of** `[expression]`\n\nReturns the length/size of a collection.\n\n*Also:* `call length of`' },
                { pattern: /\blist\s+of\b/i, doc: '**list of** `[items]`\n\nCreates a list from the given items.\n\n*Example:* `let fruits be list of "apple", "banana", "cherry"`' },
                { pattern: /\ba\s+new\s+list\b/i, doc: '**a new list**\n\nCreates an empty list.\n\n*Example:* `let items be a new list`' },
            ];
            for (const entry of multiWordDocs) {
                if (entry.pattern.test(lineLC)) {
                    const md = new vscode.MarkdownString(entry.doc);
                    md.isTrusted = true;
                    return new vscode.Hover(md);
                }
            }
            // ── Single-word hover docs ──
            const hoverDocs = {
                // --- Output ---
                'say': '**say** `[expression]`\n\nPrints the expression to the console (E++ style).\n\n*Pseudo code equivalents:*\n- `PRINT expression`\n- `OUTPUT expression`\n- `DISPLAY expression`',
                'print': '**PRINT** `[expression]`\n\nPseudo code output.\n\n*E++ equivalent:* `say expression`\n*Also:* `OUTPUT` · `DISPLAY`',
                'output': '**OUTPUT** `[expression]`\n\nPseudo code output.\n\n*E++ equivalent:* `say expression`\n*Also:* `PRINT` · `DISPLAY`',
                'display': '**DISPLAY** `[expression]`\n\nPseudo code output.\n\n*E++ equivalent:* `say expression`\n*Also:* `PRINT` · `OUTPUT`',
                // --- Variables ---
                'let': '**let** `[variable]` **be** `[value]`\n\nDeclares a variable (E++ style).\n\n*Variations:* `let x be 10` · `set x to 10` · `DECLARE x = 10` · `ASSIGN x = 10` · `x <- 10`',
                'set': '**set** `[variable]` **to** `[value]`\n\nAssigns a value (E++ style).\n\n*Variations:* `set x to 10` · `let x be 10` · `DECLARE x = 10` · `x <- 10`',
                'declare': '**DECLARE** `[variable]` `= [value]` | `AS [type]`\n\nDeclares a variable (pseudo code).\n\n*Supported types:* integer, float, string, boolean, array\n\n*E++ equivalents:* `let x be value` · `set x to value`',
                'assign': '**ASSIGN** `[variable] = [value]` | `[value] TO [variable]`\n\nPseudo code assignment.\n\n*E++ equivalents:* `let x be value` · `set x to value`',
                // --- Input ---
                'ask': '**ask** `"[prompt]"` **and store in** `[variable]`\n\nGets user input (E++ style).\n\n*Pseudo code equivalents:*\n- `INPUT variable`\n- `READ variable`\n- `INPUT variable WITH PROMPT "prompt"`',
                'input': '**INPUT** `[variable]` [**WITH PROMPT** `"prompt"`]\n\nReads user input (pseudo code).\n\n*E++ equivalent:* `ask "prompt" and store in variable`\n*Also:* `READ variable`',
                'read': '**READ** `[variable]` [**PROMPT** `"prompt"`]\n\nReads user input (pseudo code).\n\n*E++ equivalent:* `ask "prompt" and store in variable`\n*Also:* `INPUT variable`',
                // --- Functions ---
                'define': '**define** `name` **with**/**accepting** `args`\n\nDefines a new function (E++ style).\n\n*Example:*\n```\ndefine greet with name.\n    say "Hello " joined with name.\nend define.\n```\n\n*Pseudo code equivalents:*\n- `FUNCTION name(args)` ... `END FUNCTION`\n- `PROCEDURE name(args)` ... `END PROCEDURE`',
                'function': '**FUNCTION** `name`(`args`)\n... \n**END FUNCTION**\n\nDefines a function (pseudo code).\n\n*E++ equivalent:* `define name with args` ... `end define`\n*Also:* `PROCEDURE` · `ALGORITHM`',
                'procedure': '**PROCEDURE** `name`(`args`)\n... \n**END PROCEDURE**\n\nDefines a procedure (pseudo code).\n\n*E++ equivalent:* `define name with args` ... `end define`\n*Also:* `FUNCTION` · `ALGORITHM`',
                'algorithm': '**ALGORITHM** `name`(`args`)\n... \n**END ALGORITHM**\n\nDefines an algorithm (pseudo code).\n\n*E++ equivalent:* `define name with args` ... `end define`\n*Also:* `FUNCTION` · `PROCEDURE`',
                'return': '**RETURN** `[value]`\n\nReturns a value from a function (pseudo code).\n\n*E++ equivalent:* `give back value`',
                // --- Loops ---
                'repeat': '**repeat** `[N]` **times**\n\nLoops exactly N times (E++ style).\n\n*Example:*\n```\nrepeat 5 times.\n    say "Hello!"\nend repeat.\n```\n\n*Pseudo code equivalents:*\n- `FOR i = 1 TO 5`\n- `REPEAT` ... `UNTIL condition`',
                'while': '**while** `[condition]` [**do**]\n\nLoops while condition is true.\n\n*E++ style:* `while x is less than 10.` ... `end while.`\n*Pseudo code:* `WHILE x < 10 DO` ... `ENDWHILE`',
                'for': '**for each** `[item]` **in** `[list]` (E++ style)\n**FOR** `var` **=** `start` **TO** `end` [**STEP** `step`] (pseudo code)\n\nLoop constructs.\n\n*E++ example:*\n```\nfor each name in names.\n    say name.\nend for.\n```\n\n*Pseudo code example:*\n```\nFOR i = 1 TO 10 STEP 2\n    PRINT i\nNEXT\n```',
                // --- Control Flow ---
                'if': '**if** `[condition]` [**then**]\n\nConditional block.\n\n*E++ style:* `if x is 10 then.` ... `end if.`\n*Pseudo code:* `IF x = 10 THEN` ... `ENDIF`\n\n*Else variations:*\n- `otherwise` / `ELSE`\n- `otherwise if` / `ELSE IF` / `ELSEIF` / `ELIF`',
                'otherwise': '**otherwise** [**if** `condition`]\n\nElse / else-if in the E++ style.\n\n*Pseudo code equivalents:* `ELSE` · `ELSE IF` · `ELIF`',
                'switch': '**SWITCH** `[expression]`\n... **CASE** `value1`:\n... **DEFAULT**:\n**END SWITCH**\n\nMulti-branch conditional (pseudo code).',
                'case': '**CASE** `[value]`\n\nA branch within a `SWITCH` block.',
                'default': '**DEFAULT**\n\nThe fallback branch in a `SWITCH` block.\n\n*Also:* `OTHERWISE` (inside a switch)',
                'do': '**DO**\n\nStart of a `DO` ... `LOOP WHILE condition` / `UNTIL condition` block.\n\n*This creates a loop that runs at least once.*',
                'until': '**UNTIL** `[condition]`\n\nEnds a `REPEAT` / `DO` block when condition becomes true.',
                // --- Error Handling ---
                'attempt': '**attempt**\n... \n**if it fails**\n... \n**end attempt**\n\nTry-catch block (E++ style).\n\n*Pseudo code equivalent:* `TRY` ... `ON ERROR` ... `END TRY`',
                'try': '**TRY**\n... \n**ON ERROR**\n... \n**END TRY**\n\nPseudo code error handling.\n\n*E++ equivalent:* `attempt` ... `if it fails` ... `end attempt`',
                // --- List operations ---
                'add': '**add** `[item]` **to** `[list]`\n\nAppends an item to a list.',
                'remove': '**remove** `[item]` **from** `[list]`\n\nRemoves an item from a list.',
                'increment': '**INCREMENT** `[variable]` [**BY** `[value]`]\n\nIncreases a variable by 1 (or by a specified amount).',
                'decrement': '**DECREMENT** `[variable]` [**BY** `[value]`]\n\nDecreases a variable by 1 (or by a specified amount).',
                'swap': '**SWAP** `[var1]` **AND** `[var2]`\n\nSwaps the values of two variables.',
                // --- Other ---
                'call': '**call** `name` [**with** `args`] (E++ style)\n**CALL** `name`(`args`) (pseudo code)\n\nCalls a function.\n\n*E++ example:* `call greet with "Alice".`\n*Pseudo:* `CALL greet("Alice")`',
                'record': '**record**\n\nCreates an object/record to store properties.\n\n*Example:*\n```\nlet person be record.\nset person name to "Alice".\nset person age to 30.\nend record.\n```',
                'create': '**create window titled** `"Title"` [**sized** `W` **by** `H`]\n\nCreates a graphical webview window.',
                'open': '**open url** `"URL"` **in window** `"Title"`\n\nLoads a webpage in a window.',
                'show': '**show windows**\n\nStarts the graphical interface loop.',
                'fetch': '**fetch page** `"URL"` **into** `[variable]`\n\nDownloads raw HTML of a web page.',
                'write': '**write** `[content]` **to file** `"path"`\n\nWrites content to a file.',
                'bring': '**bring in** `[module]`\n\nImports a Python module.\n\n*Example:* `bring in random`',
                'break': '**BREAK** / **EXIT**\n\nExits the current loop.\n\n*E++ equivalent:* `stop loop`',
                'exit': '**EXIT**\n\nExits the current loop.\n\n*E++ equivalent:* `stop loop`\n*Also:* `BREAK`',
                'continue': '**CONTINUE**\n\nSkips to the next loop iteration.\n\n*E++ equivalent:* `skip loop`\n*Also:* `NEXT ITERATION`',
                'begin': '**BEGIN**\n\nPseudo code block opener (treated as no-op).\n\n*Paired with:* `END`\n\n*E++ equivalent:* `start program`',
                'end': '**END**\n\nPseudo code block closer.\n\n*Can close any open block.*',
                'item': '**item** `[index]` **of** `[list]`\n\nAccesses a list element by 1-based index.',
                // --- Operators (single word) ---
                'plus': '**plus**\n\nAddition operator. *Also:* `+`',
                'minus': '**minus**\n\nSubtraction operator. *Also:* `-`',
                'times': '**times**\n\nMultiplication operator. *Also:* `*`',
                'modulo': '**modulo**\n\nModulus/remainder operator. *Also:* `%`',
                'equals': '**equals**\n\nEquality comparison. *Also:* `==` · `is`',
                'is': '**is**\n\nEquality comparison.\n\n*Also:* `equals` · `==`\n\n*Comparison variants:*\n- `is not` → `!=`\n- `is greater than` → `>`\n- `is less than` → `<`\n- `is at least` → `>=`\n- `is at most` → `<=`',
            };
            if (hoverDocs[word]) {
                const md = new vscode.MarkdownString(hoverDocs[word]);
                md.isTrusted = true;
                return new vscode.Hover(md);
            }
            return null;
        }
    });
    // ═══════════════════════════════════════════════════════════════════════
    // 3. Completion Provider (Intellisense Snippets)
    //    Provides snippets for ALL syntax variations.
    // ═══════════════════════════════════════════════════════════════════════
    let completionProvider = vscode.languages.registerCompletionItemProvider('epp', {
        provideCompletionItems(document, position, token, context) {
            const items = [];
            const createSnippet = (label, text, detail, doc) => {
                const item = new vscode.CompletionItem(label, vscode.CompletionItemKind.Snippet);
                item.insertText = new vscode.SnippetString(text);
                item.detail = detail;
                if (doc) {
                    item.documentation = new vscode.MarkdownString(doc);
                }
                return item;
            };
            // ╔═══════════════════════════════════════════╗
            // ║  VARIABLE DECLARATION / ASSIGNMENT        ║
            // ╚═══════════════════════════════════════════╝
            items.push(createSnippet('let ... be', 'let ${1:variable} be ${2:value}.', 'E++ Variable Declaration', 'Declares a variable using E++ natural syntax.'));
            items.push(createSnippet('set ... to', 'set ${1:variable} to ${2:value}.', 'E++ Variable Assignment', 'Assigns a value to a variable using E++ syntax.'));
            items.push(createSnippet('DECLARE = value', 'DECLARE ${1:variable} = ${2:value}', 'Pseudo Code Variable (with value)', 'Declares a variable with an initial value.'));
            items.push(createSnippet('DECLARE AS type', 'DECLARE ${1:variable} AS ${2|integer,float,string,boolean,array|}', 'Pseudo Code Variable (typed)', 'Declares a typed variable with a default value.'));
            items.push(createSnippet('DECLARE', 'DECLARE ${1:variable}', 'Pseudo Code Variable (uninitialized)', 'Declares a variable without initialization (defaults to None).'));
            items.push(createSnippet('ASSIGN = value', 'ASSIGN ${1:variable} = ${2:value}', 'Pseudo Code Assignment (=)', 'Assigns a value using ASSIGN keyword.'));
            items.push(createSnippet('ASSIGN TO', 'ASSIGN ${1:value} TO ${2:variable}', 'Pseudo Code Assignment (TO)', 'Assigns a value to a variable (value-first syntax).'));
            items.push(createSnippet('arrow assignment', '${1:variable} <- ${2:value}', 'Pseudo Code Arrow Assignment', 'Assigns a value using the arrow operator.'));
            // ╔═══════════════════════════════════════════╗
            // ║  OUTPUT                                   ║
            // ╚═══════════════════════════════════════════╝
            items.push(createSnippet('say', 'say ${1:"Hello, World!"}.', 'E++ Print', 'Prints output (E++ style).'));
            items.push(createSnippet('PRINT', 'PRINT ${1:"Hello, World!"}', 'Pseudo Code Print', 'Prints output (pseudo code).'));
            items.push(createSnippet('OUTPUT', 'OUTPUT ${1:"Hello, World!"}', 'Pseudo Code Output', 'Displays output (pseudo code).'));
            items.push(createSnippet('DISPLAY', 'DISPLAY ${1:"Hello, World!"}', 'Pseudo Code Display', 'Displays output (pseudo code).'));
            // ╔═══════════════════════════════════════════╗
            // ║  INPUT                                    ║
            // ╚═══════════════════════════════════════════╝
            items.push(createSnippet('ask and store in', 'ask "${1:Enter value: }" and store in ${2:variable}.', 'E++ Input', 'Gets user input (E++ style).'));
            items.push(createSnippet('INPUT', 'INPUT ${1:variable}', 'Pseudo Code Input', 'Reads user input into a variable.'));
            items.push(createSnippet('INPUT WITH PROMPT', 'INPUT ${1:variable} WITH PROMPT ${2:"Enter: "}', 'Pseudo Code Input (with prompt)', 'Reads user input with a custom prompt.'));
            items.push(createSnippet('READ', 'READ ${1:variable}', 'Pseudo Code Read', 'Reads user input into a variable.'));
            // ╔═══════════════════════════════════════════╗
            // ║  CONDITIONALS                             ║
            // ╚═══════════════════════════════════════════╝
            items.push(createSnippet('if ... then (E++)', 'if ${1:condition} then.\n\t${2:say "true".}\nend if.', 'E++ If Block'));
            items.push(createSnippet('if ... otherwise (E++)', 'if ${1:condition} then.\n\t${2:say "true".}\notherwise.\n\t${3:say "false".}\nend if.', 'E++ If-Else Block'));
            items.push(createSnippet('if ... otherwise if (E++)', 'if ${1:condition1} then.\n\t${2:say "first".}\notherwise if ${3:condition2} then.\n\t${4:say "second".}\notherwise.\n\t${5:say "else".}\nend if.', 'E++ If-ElseIf-Else Block'));
            items.push(createSnippet('IF THEN ENDIF', 'IF ${1:condition} THEN\n\t${2:PRINT "true"}\nENDIF', 'Pseudo Code IF Block'));
            items.push(createSnippet('IF THEN ELSE ENDIF', 'IF ${1:condition} THEN\n\t${2:PRINT "true"}\nELSE\n\t${3:PRINT "false"}\nENDIF', 'Pseudo Code IF-ELSE'));
            items.push(createSnippet('IF ELSEIF ELSE ENDIF', 'IF ${1:condition1} THEN\n\t${2:PRINT "first"}\nELSE IF ${3:condition2} THEN\n\t${4:PRINT "second"}\nELSE\n\t${5:PRINT "else"}\nENDIF', 'Pseudo Code IF-ELSEIF-ELSE'));
            // ╔═══════════════════════════════════════════╗
            // ║  LOOPS                                    ║
            // ╚═══════════════════════════════════════════╝
            items.push(createSnippet('repeat times (E++)', 'repeat ${1:10} times.\n\t${2:say "loop".}\nend repeat.', 'E++ Repeat Loop'));
            items.push(createSnippet('while (E++)', 'while ${1:condition}.\n\t${2:say "looping".}\nend while.', 'E++ While Loop'));
            items.push(createSnippet('for each (E++)', 'for each ${1:item} in ${2:list}.\n\t${3:say item.}\nend for.', 'E++ For Each Loop'));
            items.push(createSnippet('FOR TO NEXT', 'FOR ${1:i} = ${2:1} TO ${3:10}\n\t${4:PRINT i}\nNEXT', 'Pseudo Code FOR Loop'));
            items.push(createSnippet('FOR TO STEP NEXT', 'FOR ${1:i} = ${2:1} TO ${3:10} STEP ${4:2}\n\t${5:PRINT i}\nNEXT', 'Pseudo Code FOR Loop (with STEP)'));
            items.push(createSnippet('WHILE DO ENDWHILE', 'WHILE ${1:condition} DO\n\t${2:PRINT "looping"}\nENDWHILE', 'Pseudo Code WHILE Loop'));
            items.push(createSnippet('DO LOOP WHILE', 'DO\n\t${1:PRINT "looping"}\nLOOP WHILE ${2:condition}', 'Pseudo Code DO-WHILE Loop', 'Runs at least once, then repeats while condition is true.'));
            items.push(createSnippet('REPEAT UNTIL', 'REPEAT\n\t${1:PRINT "looping"}\nUNTIL ${2:condition}', 'Pseudo Code REPEAT-UNTIL Loop', 'Runs at least once, then repeats until condition becomes true.'));
            // ╔═══════════════════════════════════════════╗
            // ║  FUNCTIONS                                ║
            // ╚═══════════════════════════════════════════╝
            items.push(createSnippet('define with (E++)', 'define ${1:name} with ${2:args}.\n\t${3:give back null.}\nend define.', 'E++ Function (with args)'));
            items.push(createSnippet('define accepting (E++)', 'define ${1:name} accepting ${2:args}.\n\t${3:give back null.}\nend define.', 'E++ Function (accepting)'));
            items.push(createSnippet('define (E++ no args)', 'define ${1:name}.\n\t${2:say "hello".}\nend define.', 'E++ Function (no args)'));
            items.push(createSnippet('give back', 'give back ${1:value}.', 'E++ Return'));
            items.push(createSnippet('FUNCTION', 'FUNCTION ${1:name}(${2:args})\n\t${3:RETURN null}\nEND FUNCTION', 'Pseudo Code Function'));
            items.push(createSnippet('PROCEDURE', 'PROCEDURE ${1:name}(${2:args})\n\t${3:PRINT "done"}\nEND PROCEDURE', 'Pseudo Code Procedure'));
            items.push(createSnippet('ALGORITHM', 'ALGORITHM ${1:name}(${2:args})\n\t${3:RETURN null}\nEND ALGORITHM', 'Pseudo Code Algorithm'));
            items.push(createSnippet('RETURN', 'RETURN ${1:value}', 'Pseudo Code Return'));
            // ╔═══════════════════════════════════════════╗
            // ║  FUNCTION CALLS                           ║
            // ╚═══════════════════════════════════════════╝
            items.push(createSnippet('call with (E++)', 'call ${1:function} with ${2:args}.', 'E++ Function Call (with args)'));
            items.push(createSnippet('call (E++)', 'call ${1:function}.', 'E++ Function Call (no args)'));
            items.push(createSnippet('CALL()', 'CALL ${1:function}(${2:args})', 'Pseudo Code Function Call'));
            // ╔═══════════════════════════════════════════╗
            // ║  ERROR HANDLING                           ║
            // ╚═══════════════════════════════════════════╝
            items.push(createSnippet('attempt (E++)', 'attempt.\n\t${1:say "trying".}\nif it fails.\n\t${2:say "error!".}\nend attempt.', 'E++ Try-Catch'));
            items.push(createSnippet('TRY ON ERROR', 'TRY\n\t${1:PRINT "trying"}\nON ERROR\n\t${2:PRINT "error!"}\nEND TRY', 'Pseudo Code Try-Catch'));
            // ╔═══════════════════════════════════════════╗
            // ║  SWITCH / CASE                            ║
            // ╚═══════════════════════════════════════════╝
            items.push(createSnippet('SWITCH CASE', 'SWITCH ${1:variable}\n\tCASE ${2:value1}\n\t\t${3:PRINT "case 1"}\n\tCASE ${4:value2}\n\t\t${5:PRINT "case 2"}\n\tDEFAULT\n\t\t${6:PRINT "default"}\nEND SWITCH', 'Pseudo Code Switch-Case'));
            // ╔═══════════════════════════════════════════╗
            // ║  LIST OPERATIONS                          ║
            // ╚═══════════════════════════════════════════╝
            items.push(createSnippet('add to list', 'add ${1:item} to ${2:myList}.', 'E++ Add to List'));
            items.push(createSnippet('remove from list', 'remove ${1:item} from ${2:myList}.', 'E++ Remove from List'));
            items.push(createSnippet('let list', 'let ${1:myList} be list of ${2:"a", "b", "c"}.', 'E++ List Creation'));
            items.push(createSnippet('let new list', 'let ${1:myList} be a new list.', 'E++ Empty List'));
            // ╔═══════════════════════════════════════════╗
            // ║  ARITHMETIC / VARIABLE MANIPULATION       ║
            // ╚═══════════════════════════════════════════╝
            items.push(createSnippet('INCREMENT', 'INCREMENT ${1:variable}', 'Increment by 1'));
            items.push(createSnippet('INCREMENT BY', 'INCREMENT ${1:variable} BY ${2:amount}', 'Increment by amount'));
            items.push(createSnippet('DECREMENT', 'DECREMENT ${1:variable}', 'Decrement by 1'));
            items.push(createSnippet('DECREMENT BY', 'DECREMENT ${1:variable} BY ${2:amount}', 'Decrement by amount'));
            items.push(createSnippet('SWAP', 'SWAP ${1:var1} AND ${2:var2}', 'Swap two variables'));
            // ╔═══════════════════════════════════════════╗
            // ║  FILE I/O                                 ║
            // ╚═══════════════════════════════════════════╝
            items.push(createSnippet('write to file', 'write ${1:content} to file ${2:"output.txt"}.', 'E++ Write File'));
            items.push(createSnippet('read file into', 'read file ${1:"input.txt"} into ${2:data}.', 'E++ Read File'));
            // ╔═══════════════════════════════════════════╗
            // ║  TEXT BLOCKS                              ║
            // ╚═══════════════════════════════════════════╝
            items.push(createSnippet('text block', 'set ${1:myText} to text block.\n${2:Hello, World!}\nend text.', 'E++ Multi-line String'));
            // ╔═══════════════════════════════════════════╗
            // ║  RECORDS / OBJECTS                        ║
            // ╚═══════════════════════════════════════════╝
            items.push(createSnippet('record', 'let ${1:person} be record.\nset ${1:person} ${2:name} to ${3:"Alice"}.\nend record.', 'E++ Record'));
            // ╔═══════════════════════════════════════════╗
            // ║  UI / WINDOW                              ║
            // ╚═══════════════════════════════════════════╝
            items.push(createSnippet('create window', 'create window titled "${1:My App}" sized ${2:800} by ${3:600}.\nshow windows.', 'E++ UI Window'));
            items.push(createSnippet('open url in window', 'open url "${1:https://example.com}" in window "${2:My App}".', 'E++ Open URL'));
            items.push(createSnippet('load file into window', 'load file "${1:page.html}" into window "${2:My App}".', 'E++ Load File'));
            items.push(createSnippet('fetch page', 'fetch page "${1:https://example.com}" into ${2:pageData}.', 'E++ Fetch Page'));
            // ╔═══════════════════════════════════════════╗
            // ║  PROGRAM STRUCTURE                        ║
            // ╚═══════════════════════════════════════════╝
            items.push(createSnippet('start/end program', 'start program.\n\t${1:say "Hello, World!".}\nend program.', 'E++ Program Block'));
            items.push(createSnippet('BEGIN END', 'BEGIN\n\t${1:PRINT "Hello, World!"}\nEND', 'Pseudo Code Block'));
            items.push(createSnippet('bring in', 'bring in ${1:module}.', 'E++ Import'));
            // ╔═══════════════════════════════════════════╗
            // ║  TYPE CHECKING                            ║
            // ╚═══════════════════════════════════════════╝
            items.push(createSnippet('check if is a number', 'check if ${1:variable} is a number', 'Type Check (number)'));
            items.push(createSnippet('check if is a string', 'check if ${1:variable} is a string', 'Type Check (string)'));
            items.push(createSnippet('check if is a boolean', 'check if ${1:variable} is a boolean', 'Type Check (boolean)'));
            items.push(createSnippet('check if is a list', 'check if ${1:variable} is a list', 'Type Check (list)'));
            // ╔═══════════════════════════════════════════╗
            // ║  KEYWORDS                                 ║
            // ╚═══════════════════════════════════════════╝
            const keywords = [
                'say', 'ask', 'let', 'set', 'declare', 'assign', 'print', 'output',
                'display', 'input', 'read', 'increment', 'decrement', 'swap', 'call',
                'add', 'remove', 'bring in', 'give back', 'return', 'break', 'exit',
                'continue', 'stop loop', 'skip loop', 'start program.', 'end program.',
                'begin', 'end', 'attempt.', 'try', 'record', 'show windows.',
                'otherwise', 'else', 'true', 'false', 'null', 'none',
                'and', 'or', 'not',
                'plus', 'minus', 'times', 'divided by', 'modulo',
                'equals', 'is', 'is not', 'is greater than', 'is less than',
                'is at least', 'is at most', 'joined with',
            ];
            keywords.forEach(kw => {
                items.push(new vscode.CompletionItem(kw, vscode.CompletionItemKind.Keyword));
            });
            return items;
        }
    });
    // ═══════════════════════════════════════════════════════════════════════
    // 4. Basic Diagnostics (Linter)
    //    Catches unbalanced blocks for ALL syntax variations.
    // ═══════════════════════════════════════════════════════════════════════
    const diagnosticCollection = vscode.languages.createDiagnosticCollection('epp');
    function updateDiagnostics(document) {
        if (document.languageId !== 'epp')
            return;
        const diagnostics = [];
        const text = document.getText();
        const lines = text.split(/\r?\n/);
        // Block-balancing check
        let blocks = 0;
        const blockStack = [];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim().toLowerCase();
            if (!line || line.startsWith('//') || line.startsWith('note'))
                continue;
            // Strip trailing period for matching
            const cleanLine = line.endsWith('.') ? line.slice(0, -1).trim() : line;
            // ── Block openers ──
            const openPatterns = [
                /\bif\b.*\bthen\b/, // if ... then (E++ and pseudo)
                /^if\b(?!.*\bthen\b)/, // if ... (E++ without then, but not "if it fails")
                /\bwhile\b/, // while
                /\bdefine\b/, // define
                /\bfunction\b/, // FUNCTION
                /\bprocedure\b/, // PROCEDURE
                /\balgorithm\b/, // ALGORITHM
                /\brepeat\b.*\btimes\b/, // repeat N times
                /^repeat$/, // REPEAT (do-until)
                /^do$/, // DO (do-while)
                /\bfor\s+each\b/, // for each
                /\bfor\s+\w+\s*(?:=|<-)/, // FOR i = ...
                /\btry\b/, // TRY
                /\battempt\b/, // attempt
                /\bswitch\b/, // SWITCH
                /\btext\s+block\b/, // text block
                /\bstart\s+program\b/, // start program
            ];
            const closePatterns = [
                /\bend\s+if\b/, /\bendif\b/,
                /\bend\s+while\b/, /\bendwhile\b/,
                /\bend\s+define\b/,
                /\bend\s+function\b/, /\bendfunction\b/,
                /\bend\s+procedure\b/, /\bendprocedure\b/,
                /\bend\s+algorithm\b/, /\bendalgorithm\b/,
                /\bend\s+repeat\b/,
                /\bend\s+for\b/, /\bendfor\b/, /^next$/,
                /\bend\s+try\b/,
                /\bend\s+attempt\b/,
                /\bend\s+switch\b/, /\bendswitch\b/, /\bendcase\b/, /\bend\s+case\b/,
                /\bend\s+text\b/,
                /\bend\s+program\b/,
                /\buntil\b/, // UNTIL closes REPEAT
                /\bloop\s+while\b/, // LOOP WHILE closes DO
            ];
            // Check for "if it fails" before checking if-then (it's not an opener)
            if (/\bif\s+it\s+fails\b/.test(cleanLine))
                continue;
            // "on error" is not a block opener/closer
            if (/\bon\s+error\b/.test(cleanLine))
                continue;
            // "otherwise" / "else" / "elif" are mid-block, not openers/closers
            if (/^(otherwise|else|elif|elseif|else\s*if|default|case)\b/.test(cleanLine))
                continue;
            let opened = false;
            for (const pat of openPatterns) {
                if (pat.test(cleanLine)) {
                    blocks++;
                    blockStack.push({ keyword: cleanLine.substring(0, 20), line: i });
                    opened = true;
                    break;
                }
            }
            if (!opened) {
                for (const pat of closePatterns) {
                    if (pat.test(cleanLine)) {
                        blocks--;
                        if (blocks < 0) {
                            diagnostics.push(new vscode.Diagnostic(new vscode.Range(i, 0, i, lines[i].length), `Unexpected block closer "${lines[i].trim()}" — no matching block opener found.`, vscode.DiagnosticSeverity.Error));
                            blocks = 0;
                        }
                        else {
                            blockStack.pop();
                        }
                        break;
                    }
                }
            }
        }
        // Report unclosed blocks
        while (blockStack.length > 0) {
            const unclosed = blockStack.pop();
            diagnostics.push(new vscode.Diagnostic(new vscode.Range(unclosed.line, 0, unclosed.line, lines[unclosed.line].length), `Unclosed block starting with "${lines[unclosed.line].trim()}" — missing closing statement.`, vscode.DiagnosticSeverity.Warning));
        }
        diagnosticCollection.set(document.uri, diagnostics);
    }
    vscode.workspace.onDidSaveTextDocument(updateDiagnostics, null, context.subscriptions);
    vscode.workspace.onDidOpenTextDocument(updateDiagnostics, null, context.subscriptions);
    vscode.workspace.onDidChangeTextDocument((e) => updateDiagnostics(e.document), null, context.subscriptions);
    if (vscode.window.activeTextEditor) {
        updateDiagnostics(vscode.window.activeTextEditor.document);
    }
    context.subscriptions.push(runCmd, hoverProvider, completionProvider, diagnosticCollection);
}
function deactivate() { }
//# sourceMappingURL=extension.js.map