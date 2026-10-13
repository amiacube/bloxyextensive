# Bloxd-Code-Editor
A high-performance code editor that replicates the in-game editor of [Bloxd.io](https://bloxd.io) within your browser.  
Built using [JavaScript modules (esm.sh)](https://esm.sh), it provides a development experience close to professional environments.

\[[日本語](README_ja.md) | [English](README.md)\]

<img src="./image/Screenshot_04.png" alt="Code Editor" width="80%">

# Features
- Syntax Highlighting
- Auto-completion
- Tooltip Features (Find & Replace)
- Main Control Buttons
- Modal Settings

## Syntax Highlighting
This feature categorizes code elements by color to improve readability.  
It utilizes CodeMirror via [esm.sh](https://esm.sh).  
The following color scheme applies when the [Language](#Language-Selection) is set to JavaScript:

| Category | Color | Examples |
|---|---|---|
| Variables & Properties | `#e06c75` | `const name`, `player.pos` |
| Strings | `#98c379` | `"Hello World"` |
| Keywords (async, etc.) | `#e5c07b` | `async`, `await` |
| Operators | `#56b6c2` | `+`, `-`, `=`, `=>` |
| Punctuation & Brackets | `#abb2bf` | `()`, `{}`, `;`, `,` |
| Control Flow & Declarations | `#c678dd` | `if`, `else`, `function`, `let` |
| Function Names | `#61afef` | `print()`, `addEvent()` |

*Note: If you encounter any highlighting issues, please report them in the Issues section.*

Additionally, when the cursor is placed on a bracket, both the active and its matching bracket are highlighted. This makes it easier to navigate complex code structures.

## Auto-completion
When you type an opening bracket, the corresponding closing bracket is automatically inserted. This also applies to HTML tags.  
Furthermore, when the language is set to JavaScript, a suggestion list appears as you type keywords.  
This includes the Bloxd API; typing part of an API function name will display a list of matching functions along with their descriptions. (Callbacks are only displayed in World Code mode. See [World Code / Code Block](#World-Code-/-Code-Block) for details.)

## Tooltip Features
The tooltip menu primarily handles text searching.  
You can open it by pressing `Ctrl + F` while the cursor is in the editor, or by clicking the [Show Tooltips](#Hide-Tooltips-/-Show-Tooltips) button.

### Search
Enter the text you want to find in the "Find" field to highlight matching results.  
- **next / previous**: Navigate through the results.  
- **all**: Selects and highlights all matches.  
- **match case**: Distinguishes between uppercase and lowercase letters.  
- **regexp**: Enables Regular Expressions. For example, `^ab` finds text starting with "ab".  
- **by word**: Searches for whole words only. Searching "ab" will match `ab-ab` or `ab ab`, but not `abab`.

### Replace
Use this to swap text. Enter the original text in the Search field and the new text in the "Replace" field.  
- **replace**: Replaces the currently selected match.  
- **replace all**: Replaces every occurrence in the code.

## Main Control Buttons
Located below the code input area, these buttons provide various utilities:

### Language Selection (Dropdown)
Changes the [Syntax Highlighting](#Syntax-Highlighting) mode. Selecting a different language updates the color scheme to match that language's syntax.

### Submit Code
Saves the current code to a file.  
In the actual Bloxd.io game, this would save the code to a block and close the UI. In this editor, it triggers a file download/save.

### Show Docs
Opens the official Bloxd Code API documentation.  
Redirects to the [Bloxdy/code-api](https://github.com/Bloxdy/code-api) GitHub repository.

### Format Code
Automatically formats your code using **Prettier** via [esm.sh](https://esm.sh).  
It tidies up the code according to the language rules and displays an error message if the syntax is invalid.

### Copy Code
Copies the entire code to your clipboard.  
While this performs the same action as `Ctrl+A` > `Ctrl+C`, it is included because the actual Bloxd.io game editor often fails to select the entire script (only selecting the visible area) when using keyboard shortcuts.

### Hide Tooltips / Show Tooltips
Toggles the visibility of the auto-completion list and the search/replace tooltips.  
When set to `Hide Tooltips`, suggestions will appear; when set to `Show Tooltips`, they are disabled.

### World Code / Code Block
Toggles between **World Code** and **Code Block** modes.  
The main difference is the availability of Callbacks. In this editor, this toggle only affects the auto-completion suggestions.  
*Note: In the actual game, Code Blocks trigger on click/interaction, while World Code runs as part of the world logic.* The current mode is displayed in the status bar at the bottom of the editor.

## Modal Settings
Clicking the settings icon in the bottom right corner opens a modal window where you can adjust various preferences.
- Minimap — ON/OFF toggle.
- Save .txt files — Saves the current code as a text file.
- Load .txt files — Loads and imports files into the editor (supports .txt, .js, and .ts).
- Auto-save — When toggled ON, code is automatically saved to localStorage as you type and will be restored upon reopening the tab. When toggled OFF, all data in localStorage is deleted.

### Minimap Feature
This feature displays a minimap of your code.
A minimap provides a scaled-down overview of the entire script on the right side of the screen, helping you visualize the overall structure and quickly navigate to specific sections.
You can toggle its visibility using the Minimap switch in the Modal Settings.

# Preview Version
A "Preview Version" of the editor is available, featuring experimental functions currently under development (created on 2026/4/20).  
This version is updated frequently, allowing users to test new features ahead of their official release. Please be aware that you may encounter bugs or instability while using this version.  
If the version numbers of the Preview and Main versions are identical, it indicates that there are currently no new experimental features in development.  

You can access the Preview Version [here](https://cod-git12.github.io/Bloxd-Code-Editor/preview.html).