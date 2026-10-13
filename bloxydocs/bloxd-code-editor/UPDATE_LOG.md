# Update_log.md

\[[日本語](#日本語) | [English](#english)\]

# English
*All dates and times are in Japan Standard Time (JST).

## ver. 0.1.0
Date: `2026/4/14`\
Title: Development Started\
Started development as `bloxd codeeditor`.\
Implemented core editor features such as syntax highlighting.

Editor Features
- Line numbers, active line highlighting, and code folding
- Auto-closing brackets and bracket matching
- Search and undo/redo (Ctrl+Z)
- Indentation with Tab key
- Code completion with Ctrl+Space

Toolbar
- Language switching (JS / TS / HTML / CSS / Python / JSON / Markdown / SQL / C++ / Java)
- Copy to clipboard
- Clear editor
- JSON formatting

## ver. 0.2.0
Date: `2026/4/14`\
Title: UI Refinement

Design Changes
- Background: Minecraft-style background with custom pixel pattern + brightness(.6)
- Editor: Dark panel matching game UI, blue border accent, and oneDark theme
- Buttons: Implemented NewButton style directly from the game CSS (top/bottom borders, text-shadow, box-shadow) in blue, green, red, and purple
- Language Select: Dropdown menu using the same button-style design
- Status Bar: Displays line/column, language, and character count at the bottom

## ver. 0.3.0
Date: `2026/4/15`\
Title: API Completion

- Typing `api.` now displays all methods as candidates
  - Signature example: `(void) GameApi.setVelocity(eId, x, y, z)`
  - Descriptions (info) are displayed for each method
  - Deprecated methods are marked with ⚠ and shown at the bottom of the list

- Global variables (`myId`, `playerId`, `thisPos`, `ownerDbId`, `api`) are shown at the top
- Callback names (`tick`, `onPlayerJoin`, `onPlayerKilledOtherPlayer`, etc.) added to completion
- JS keywords (`const`, `async`, `await`, `for`, etc.) added to completion

## ver. 0.4.0
Date: `2026/4/16`\
Title: API Completion Arguments and Descriptions

- Signature Help Popup (`#sig-popup`)
  - Automatically appears the moment `api.methodName(` is typed
  - Argument names (orange) and types (blue) are styled according to the game screenshot
  - Current argument is highlighted with an underline and bold text
  - `?` indicates optional arguments
  - Return types shown in cyan
  - Highlight moves to the next argument whenever a comma is typed
  - Argument descriptions displayed at the bottom

- Enhanced Completion Info Panel
  - Rich DOM elements used for popups when completing `api.`
  - Includes typed signatures, descriptions for each argument, and deprecated warnings

## ver. 0.5.0
Date: `2026/4/16`\
Title: Multiple Fixes and Additions

- JavaScript Dropdown Position — Removed `position: absolute` to place it within the flow. No longer overlaps with Submit Code.
- Signature Popup Visibility — Removed the check for the autocomplete popup. Now displays immediately upon typing `api.foo(`.
- Auto-delete Brackets — Pressing Backspace after `(` will also delete the matching `)`. Same for `[`/`]` and `{`/`}`.
- World Code Header — Clicking the World Code button toggles the header between "Code Block" and "World Code". The button text also changes to "Code Block" to allow switching back. Code Block and World Code now maintain separate content.
- Toast Notifications — Displays as a full-width green bar at the bottom of the editor.
- Hide/Show Tooltips — Default state is "Hide Tooltips" (completion and signatures enabled). Clicking changes it to "Show Tooltips", completely disabling completion and signatures. Click again to restore. Search (Ctrl+F) tooltips remain available.
- Callbacks restricted to World Code — `onPlayerJoin` and others now only appear in the completion list while in World Code mode.

## ver. 0.6.0
Date: `2026/4/17`\
Title: API Completion Formatting

```
giveItem(
playerId: PlayerId,
itemName: ItemName,
itemAmount?: number,   // -1 for infinity
attributes?: ItemAttributes
): number
```
- Methods with zero arguments (e.g., `now()`) remain on a single line
- `?` used to indicate optional parameters
- Arguments with descriptions include them as inline comments `// ...` on the same line
- Return type is placed on the same line as the closing parenthesis
- Method description displayed below as standard text

### ver. 0.6.1
Date: `2026/4/17`\
Title: API Completion Formatting Fix

- Updated `renderSigPopup` to output with newlines and indentation for each argument

## ver. 1.0.0
Date: `2026/4/18`\
Title: Release

Released on GitHub.\
[Try Bloxd Code Editor](https://cod-git12.github.io/Bloxd-Code-Editor)

## ver. 1.1.0
Date: `2026/4/19`\
Title: Minimap Addition and Functional Fixes/Additions

- Added a loading animation.
- Matched the font to the official Bloxd font style.
- Fixed an issue where the triangle icon in the language selection dropdown was isolated on the right side.
- Added a Minimap feature.
  - Display — A 110px wide minimap on the right edge of the editor. Displays code with syntax coloring (keywords in blue, strings in orange, comments in green, api in purple, etc.)
  - Scroll Synchronization — A blue viewport box on the minimap moves in sync with the editor's scroll position.
  - Jump via Click/Drag — Clicking or dragging the minimap scrolls the editor to the corresponding location.
  - Toggle — Click the ⊟ Map icon at the right end of the status bar to hide it (changes to ⊞ Map), and click again to show it.
  - Auto-update on Code Changes — The minimap redraws automatically as you type.

## ver. 1.2.0
Date: `2026/4/19`\
Title: Addition of Modal Settings

Clicking the settings icon in the bottom right corner opens a modal window where you can adjust various preferences.
- Minimap — ON/OFF toggle.
- Save .txt files — Saves the current code as a text file.
- Load .txt files — Loads and imports files into the editor (supports .txt, .js, and .ts).
- Auto-save — When toggled ON, code is automatically saved to localStorage as you type and will be restored upon reopening the tab. When toggled OFF, all data in localStorage is deleted.

*Note: The map toggle button has been moved to this modal.

## ver. 1.2.1
Date: `2026/4/19`
Title: Local Storage Fix

Fixed an issue where `autosaveEnabled` was not defined, which caused local storage features and other related functions to become unavailable.

## ver. 1.2.2
Date: `2026/4/19`
Title: Local Storage Re-fix

Fixed an issue where local storage features were not functioning correctly due to improper save timing within the code, preventing data from being saved and loaded properly.

## ver. 1.2.3
Date: `2026/4/20`
Title: Updates

Made several changes to the code.
- Fixed an issue where the custom font was not being applied within the editor.
- Added version notation.

Additionally, implemented a Preview Version. This allows you to try out features currently under development ahead of their official release.  
*Note: As this is a development version, bugs may occur.

The Preview Version is available [here](https://cod-git12.github.io/Bloxd-Code-Editor/preview.html).

# 日本語
※日付はすべて日本時間（JST）です

## ver. 0.1.0
日付: `2026/4/14`\
タイトル: 作成開始\
`bloxd codeeditor`として作成を開始。\
ハイライトなどの主なエディター機能を搭載しました。

**エディター機能**
- 行番号・アクティブ行ハイライト・折りたたみ
- 括弧の自動補完・マッチング
- 検索・undo/redo（Ctrl+Z）
- Tabキーでインデント
- Ctrl+Space でコード補完

**ツールバー**
- 言語切替（JS / TS / HTML / CSS / Python / JSON / Markdown / SQL / C++ / Java）
- クリップボードへのコピー
- エディタクリア
- JSONフォーマット整形

## ver. 0.2.0
日付: `2026/4/14`\
タイトル: 外見の整形

**デザインの変更**
- 背景: 指定のピクセルパターン + brightness(.6) のマイクラ風背景
- エディター: 画像と同じ暗めのパネル、青枠のアクセント、oneDarkテーマ
- ボタン: ゲームCSSそのままの NewButton スタイル（上下ボーダー、テキストシャドウ、box-shadow）を青・緑・赤・紫の各色で配置
- 言語セレクト: 同じボタン系デザインのドロップダウン
- ステータスバー: 下部に行/列・言語・文字数を表示

## ver. 0.3.0
日付: `2026/4/15`\
タイトル: apiの補完

- `api.` と打つと メソッド全部が候補として出るように
  - シグネチャ例: `(void) GameApi.setVelocity(eId, x, y, z)`
  - 説明文（`info`）にも各メソッドの解説が表示される
  - deprecated なメソッドは ⚠ マーク付きで候補の下位に表示

- グローバル変数（`myId`, `playerId`, `thisPos`, `ownerDbId`, `api`）がトップに表示される
- コールバック名（`tick`, `onPlayerJoin`, `onPlayerKilledOtherPlayer` など）も補完に出る
- JSキーワード（`const`, `async`, `await`, `for` など）も補完

## ver. 0.4.0
日付: `2026/4/16`\
タイトル: apiの補完の引数・説明

- **シグネチャヘルプポップアップ** (`#sig-popup`)
  - `api.methodName(` を入力した瞬間に自動表示
  - 引数名（オレンジ）・型（青）をスクリーンショットと同じスタイルで表示
  - 現在カーソルがいる引数をアンダーライン＋太字でハイライト
  - `?` で optional引数を示す
  - 戻り値の型（シアン）
  - カンマを打つたびにハイライトが次の引数に移動
  - 引数の説明文を下部に表示

- **補完 info パネルの強化**
  - `api.` 補完時のポップアップをリッチなDOM要素で表示
  - 型付きシグネチャ・各引数の説明・deprecated警告

## ver. 0.5.0
日付: `2026/4/16`\
タイトル: 複数の機能を修正・追加

- **JavaScriptドロップダウンの位置** — `position: absolute` を外してフロー内に配置。Submit Codeと重ならなくなりました。
- **シグネチャポップアップが出ない問題** — autocomplete ポップアップの有無チェックを除去。`api.foo(` と入力した瞬間に必ず表示されるようになりました。
- **括弧の自動削除** — `(` の直後で Backspace を押すと `)` も同時に消えます。`[`/`]`、`{`/`}` も同様。
- **World Code ヘッダー** — World Code ボタンを押すと、ヘッダーが「Code Block」→「World Code」に切り替わります。ボタンのテキストも「Code Block」に変わり、押すと戻れます。Code Block と World Code は別々の内容を保持します。
- **トースト通知** — エディター下部に全幅の緑バーとして表示されます。
- **Hide/Show Tooltips** — 初期状態は「Hide Tooltips」（補完・シグネチャ有効）。押すと「Show Tooltips」になり補完とシグネチャが完全に無効化。再度押すと復活。検索（Ctrl+F）ツールチップは引き続き利用可能です
- **コールバック補完はWorld Codeのみ** — `onPlayerJoin` などは World Code モードでのみ候補に出ます。

## ver. 0.6.0
日付: `2026/4/17`\
タイトル: apiの補完の整形
```
giveItem(
  playerId: PlayerId,
  itemName: ItemName,
  itemAmount?: number,   // -1 for infinity
  attributes?: ItemAttributes
): number
```

- 引数ゼロのメソッド（`now()` など）は1行のまま
- `?` で optional を表示
- descriptionがある引数は `// ...` でインラインコメントとして同じ行に表示
- 戻り値の型は閉じカッコと同じ行
- メソッド説明は下部に通常テキストで表示

### ver. 0.6.1
日付: `2026/4/17`\
タイトル: apiの補完の整形の修正

- `renderSigPopup` を引数ごとに改行＋インデントして出力するようにした

## ver. 1.0.0
日付: `2026/4/18`\
タイトル: 公開

githubにて公開しました。\
[Bloxd Code Editor を使ってみる](https://cod-git12.github.io/Bloxd-Code-Editor)

## ver. 1.1.0
日付: `2026/4/19`\
タイトル: ミニマップの追加、機能の修正・追加

- ローディングアニメーションを追加しました。
- フォントをBloxdのフォントに揃えました。
- 言語選択プルダウンの三角のマークが右側に孤立していた問題を修正しました。
- ミニマップを追加しました。
  - 表示 — エディター右端に110px幅のミニマップ。コードがカラー表示されます（キーワード青、文字列オレンジ、コメント緑、api 紫など）
  - スクロール連動 — エディターのスクロールに合わせてミニマップの青い枠（ビューポート）が動きます
  - クリック/ドラッグでジャンプ — ミニマップをクリック・ドラッグすると対応箇所にスクロール
  - トグル — ステータスバー右端の ⊟ Map をクリックで非表示（⊞ Map に変わる）、もう一度で再表示
  - コード変更時に自動更新 — タイプするたびにミニマップが再描画されます

## ver. 1.2.0
日付: `2026/4/19`\
タイトル: モーダル設定の追加

右下の設定アイコンを押すことでモーダルウィンドウが開き、各種設定をすることができます。
- Minimap — ON/OFFトグル
- Save .txt files — 現在のコードをテキストファイルとして保存
- Load .txt files — ファイルを読み込んでエディターに展開（.txt / .js / .ts 対応）
- Auto-save — トグルONで入力のたびに localStorage に自動保存、タブを閉じて再度開くと復元される。OFFにするとlocalStorageのデータを削除

※マップボタンはここへ移動しました。

## ver. 1.2.1
日付: `2026/4/19`\
タイトル: ローカルストレージの修正

コード内で`autosaveEnabled`が定義されていなく、ローカルストレージ機能などが使用できなくなっていた問題を修正しました。

## ver. 1.2.2
日付: `2026/4/19`\
タイトル: ローカルストレージの再修正

コード内での保存のタイミングが悪く、正しく保存・読み込みされていなかったため、ローカルストレージ機能が使用できなくなっていた問題を修正しました。

## ver. 1.2.3
日付: `2026/4/20`\
タイトル: 変更

コードに変更を加えました。
- フォントがエディター内に適用されていなかった問題の修正
- バージョン表記を追加

さらに、プレビュー版を実装しました。プレビュー版は、現在開発中の機能を先に見ることができる機能です。\
※開発中のため、バグが発生していることがあります。

プレビュー版は[こちら](https://cod-git12.github.io/Bloxd-Code-Editor/preview.html)で見ることができます。