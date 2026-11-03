---
name: Wordkind
description: A game-only word puzzle with cream paper, a lilac wheel and mint solved tiles.
colors:
  paper: "#f6f4ec"
  white: "#fffef9"
  ink: "#303a30"
  muted: "#606657"
  line: "#e0e4d7"
  lilac: "#e6e0f5"
  wheel: "#e7e0f3"
  purple: "#72638e"
  mint: "#d6e8ba"
  green: "#45633b"
  yellow: "#f3efb3"
  coral: "#ed827c"
typography:
  level:
    fontFamily: "Manrope, sans-serif"
    fontSize: "17px"
    fontWeight: 800
    letterSpacing: "-0.4px"
  drawer-title:
    fontFamily: "Manrope, sans-serif"
    fontSize: "22px"
    fontWeight: 800
    letterSpacing: "-0.6px"
  body:
    fontFamily: "DM, sans-serif"
    fontSize: "14px"
  label:
    fontFamily: "DM, sans-serif"
    fontSize: "11px"
  wheel-letter:
    fontFamily: "Manrope, sans-serif"
    fontSize: "26px"
    fontWeight: 800
rounded:
  tile: "8px"
  input: "8px"
  control: "10px"
  tool: "12px"
  sheet: "24px"
spacing:
  grid-gap: "5px"
  small: "8px"
  medium: "12px"
  mobile-gutter: "15px"
  playground-gutter: "24px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
    rounded: "{rounded.control}"
    padding: "14px 16px"
    width: "100%"
  button-primary-hover:
    backgroundColor: "#4c5944"
  button-text:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    padding: "10px 0"
  input:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.input}"
    padding: "12px"
  tool-button:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.tool}"
    width: "64px"
    height: "64px"
  word-chip:
    backgroundColor: "#e3e6d8"
    textColor: "#58614d"
    padding: "5px 7px"
  word-chip-complete:
    backgroundColor: "{colors.mint}"
    textColor: "#405734"
---

# Design System: Wordkind

## Overview

**Creative North Star: "Cream paper, lilac wheel, mint tiles"**

Wordkind opens directly on the puzzle. A compact header, centred board, word input and letter wheel fill a single narrow column. Shuffle and Hint sit symmetrically beside the wheel. The game has no enclosing dashboard card.

The user chose a pastel, minimal interface with light desi humour and rejected the earlier cluttered page. Difficulty, modes, library, instructions, sound and visit statistics live in the menu. The wallet has its own drawer. Keep attention on the board and wheel until the player requests another task.

**Key Characteristics:**

- A game-only screen on cream paper.
- A lilac wheel with raised letter buttons and mint completed tiles.
- Symmetric tools beside the centred wheel.
- Supporting tasks in dialogs and drawers.
- Event-driven motion with reduced-motion alternatives.

## Colors

### Primary

The wheel has a dedicated pale lilac fill. Lilac also marks the selected solo mode and race strip. Purple supports focus, the submit control and accents. Ink is the main text colour and primary-action fill.

### Secondary

Mint marks completed board tiles, collected words, wallet counts and the selected difficulty. Green supports success feedback. Keep labels and counts alongside colour states.

### Tertiary

Butter yellow accents result tiles and the second player's score. Coral appears in result confetti. The original SVG icon retains its stronger yellow, black, lilac and coral reference palette.

### Neutral

Paper fills the page and drawers. White fills board tiles, wheel letter buttons, form fields and scorecards. Muted is supporting text; line divides menu sections. The wheel's light inner ring helps define its circular form without another container.

## Typography

Self-hosted Manrope carries headings, the wordmark, wheel letters, board letters and typed words. Self-hosted DM Sans uses the CSS family name `DM` for controls and instructions. Both fall back to sans-serif.

The puzzle number is a compact heading using the level token, reduced to 15px on phones. Drawer titles use the drawer-title token, reduced to 20px on phones. Wheel letters reduce to 24px on phones, or 23px on narrow or short screens. The word input uses 21px Manrope with three-pixel tracking. Tool labels are 11px, progress is 12px, and primary actions are 13px. Timers and puzzle numbers use tabular numerals. Large result numbers belong inside scorecards, not on the play screen.

## Layout

The header has a maximum width of 1100px, an 88px height and 35px side padding. The centred playground has a maximum width of 570px and 24px side padding. The toolbar balances difficulty and refresh around the puzzle number using equal 100px outer columns. Progress sits below it; clicking progress opens the word-length checklist.

The wheel row is a three-column grid: matching 64px tool columns around a 270px wheel, separated by 13px gaps. Align both tool buttons vertically to the wheel's centre. Keep their icon, label, width and height consistent. The board uses a five-pixel grid gap; its tiles scale to the generated layout. Expanded boards open in a scrollable dialog.

At 650px and below, the header becomes 66px tall and the playground uses 15px gutters. The wheel is 244px with 46px tool columns and seven-pixel gaps. Below 374px it is 226px with 42px tools. On phones at most 740px tall the wheel reduces to 220px and vertical spacing tightens. Preserve safe-area padding at the bottom.

Settings open as a 380px right-hand drawer on desktop and a bottom sheet with a 91dvh maximum height on phones. Difficulty and solo modes use three-column grids inside it. The wallet opens separately in a 400px right-hand drawer and fills the phone viewport. The library uses six columns on desktop and three on phones. Do not reintroduce permanent side rails, marketing copy or statistics around the game.

Below 359px, the wheel is 200px with 42px tool columns and four-pixel gaps. The header stays available while a dense board scrolls. Keep the normal Easy game within the phone viewport; harder layouts can use the expanded board from the menu.

## Elevation & Depth

Board cells and wheel letter buttons have small bottom shadows. Selected wheel letters change fill, text and shadow together. Page regions stay flat. Drawers and dialogs have broad shadows over a dimmed, blurred backdrop. Scorecards retain their white paper, dashed separators and stamp treatment.

Buttons transition over 150ms. Solved cells enter over 500ms; invalid guesses shake once. A fresh bonus word becomes a mint token that flies from the input to the header wallet control over 850ms. The wallet icon then bounces over 320ms. This motion explains where the word went. Reduced motion replaces the flight with a status message. Countdown, result and optional tutorial animations also respect reduced motion; the tutorial shows its completed state.

## Shapes

The wheel and header icon buttons are circular. Wheel letter buttons are raised circles; board tiles have gently rounded corners. Shuffle and Hint use identical rounded hit areas. Difficulty and mode choices use rounded rectangular outlines. Desktop drawers meet the viewport edge without rounded corners; the mobile settings sheet has rounded upper corners. Scorecards retain a clipped zigzag lower edge and a slightly rotated stamp.

## Components

### Buttons

Primary actions use ink fill, white text, a 46px minimum height and rounded corners. Text actions have no fill and turn purple on hover. Header icon buttons are 44px squares with circular hover backgrounds. Shuffle and Hint are equal-size icon-and-label controls. Disabled buttons reduce opacity. Focusable controls show a three-pixel purple outline with a four-pixel offset.

### Chips

The word checklist appears in a dialog opened from progress. Chips state word length and completion count, with mint for complete groups. Selected difficulty uses mint; selected Zen, Sprint or Daily uses lilac. Both have text labels and borders.

### Cards / Containers

The playable game sits directly on the page. The library uses small bordered preview buttons. Results use white receipt paper, coloured player blocks, dashed dividers and an outline stamp. Keep cards inside the tasks that require them; the main game does not need another panel.

### Inputs / Fields

Dialog fields use white fill, a thin green-grey border and rounded corners. The word input stays transparent and centred below the board. It has uppercase Manrope lettering and a subtle baseline on focus. Keep typed input available alongside drag and tap selection. Search, sorting and room settings use labelled native controls.

### Navigation

The header has the wordmark, wallet count and menu trigger. The menu contains Solo/With a friend, difficulty, solo modes and task links. Sound and session statistics belong here. The toolbar's difficulty pill opens settings, and the progress button opens the checklist. The wallet opens its own drawer from the header or menu.

### Letter wheel and board

White raised letter buttons sit around the lilac wheel. Selected letters turn purple with white text. A thick rounded line follows the real selection path, including backtracking. The centre button clears selection. Solved board tiles turn mint and animate in word order. Keep the varied board layouts readable, including diagonal and reverse paths at higher difficulties.

### Dialogs and results

Native dialogs provide a visible close button and heading. The optional demonstration stays separate from play. Results show actual scores, names and measurements, plus text copying, PNG saving and supported native sharing. Keep desi humour brief and friendly.

## Do's and Don'ts

### Do:

- Do keep the board and wheel central in one column.
- Do align Shuffle and Hint symmetrically around the wheel.
- Do keep wallet contents, settings and visit statistics behind their controls.
- Do connect bonus-word motion to the header wallet icon.
- Do preserve typed input, visible focus and reduced-motion feedback.
- Do retain the original SVG icon and approved pastel palette.

### Don't:

- Don't restore marketing introductions, permanent side rails or invitation cards on the play screen.
- Don't show the word checklist or visit statistics permanently beside the board.
- Don't turn the temporary wallet into cash, coins or paid rewards.
- Don't invent player activity, scores or saved streaks.
- Don't add perpetual decorative motion or rely on colour alone.

## Sharing QR

Invites and scorecard exports use a rounded QR code with sage `#405d42` and purple `#70517f` modules, cream `#fffef9` quiet space, a lilac `#e6e0f5` frame and small coral/mint corner dots outside the scan area. Preserve the four-module quiet zone and three finder patterns. The invite presents its link next to a native-share/PNG action; scorecards keep a QR footer with the visible game URL. Decoder checks cover the rendered phone-sized code and exported PNGs.
