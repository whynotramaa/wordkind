# Wordkind UI rehearsal

The user explicitly requested the Stageshow skill. Its focus, framing and cause-driven motion principles guide the real game and a separate optional instructional demonstration.

## Reference and adaptation

The `phone-touch` gold example provided a three-beat pattern: context, gesture, held result. The word-wheel tutorial adapts that pattern to a direct geometric game board: T/E/A starts unfilled, a measured path connects wheel positions, then the same word tiles become mint. It is labeled as a demonstration, never actual player activity. It runs once and can replay on request. Reduced motion shows the final, understandable state.

The game uses its own HTML/CSS components rather than importing the React kit. The app's zero-runtime-dependency constraint and native Bun client remain intact. No fake phone chrome, invented player activity, or illustrative balances are shown.

## UI checks

Desktop 1440px and mobile 390px screenshots live in `.impeccable/review/`. Browser checks also cover 360px and 768px widths. Both tablet and mobile layouts preserve the board, wheel, difficulty controls and invitation flow. PNG scorecards are separate downloadable artifacts.

Motion is tied to selection, shuffling, solving, wallet additions, countdowns, and scorecards. Sound is synthesized, opt-in, and off by default. Reduced-motion CSS removes animation, and JS animations check the same preference.

## Limits

No Stageshow React runtime or film CLI is bundled. Browser captures and interaction checks validate the shipped HTML/CSS tutorial and real game. Native mobile browsers and real-device haptics have not been checked.

## Focused game revision

The final play screen has no marketing copy or side panels. Secondary controls use a settings drawer; the wallet has a separate drawer. The grid fixes the Shuffle/Hint centres and equal spacing around the wheel. Phone widths 320, 360 and 390 are tested, along with tablet and desktop layouts. A collected bonus word follows an 850ms flight to the wallet icon, then the icon bounces for 320ms. These are actual game events; the instructional demo remains separate.
