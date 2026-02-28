# E++ Language Support

> **Write code in plain English.** E++ is a Turing-complete programming language that reads like natural English sentences.

Full syntax highlighting, IntelliSense, snippets, and a one-click Run button for the **E++ English Programming Language**.

## ✨ Features

### 🎨 Syntax Highlighting
Rich, colorful syntax highlighting for all E++ keywords and pseudo code constructs.

### 🧠 IntelliSense
- **Hover tooltips** — hover over any keyword to see documentation and usage examples.
- **Auto-completion** — smart snippets for common constructs like `if` blocks, `define` functions, `repeat` loops, and more.

### ▶️ One-Click Run
Click the **play button** in the top-right corner to instantly run your `.epp` file. Requires the `epp` CLI to be installed (`pip install epp-lang`).

### 📝 Pseudo Code Support
Supports both natural English syntax and traditional pseudo code:

```
// E++ English syntax
say "Hello, World!"
let x be 10.
repeat 5 times.
    say x.
end repeat.

// Pseudo code syntax
DECLARE y = 20
PRINT y
FOR i = 1 TO 5
    PRINT i
NEXT
```

### 🔍 Diagnostics
Basic linting with block-balancing checks to catch unclosed `if`, `while`, `repeat`, and `define` blocks.

## 📦 Requirements

- **VS Code** 1.80.0 or higher
- **Python 3.8+** installed
- **E++ Interpreter** — install via `pip install epp-lang`

## 🚀 Getting Started

1. Install this extension from the VS Code Marketplace.
2. Install the E++ interpreter: `pip install epp-lang`
3. Open any `.epp` file.
4. Click the ▶️ play button to run your program!

## 📄 Example

```
// Fibonacci sequence in E++
let a be 0.
let b be 1.
repeat 10 times.
    say a.
    let temp be a plus b.
    set a to b.
    set b to temp.
end repeat.
```

## 📚 Learn More

Visit the [E++ Language Guide](https://github.com/epp/epp) for full documentation and more examples.

## 📄 License

MIT — see [LICENSE](LICENSE) for details.
