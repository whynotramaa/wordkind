export default function GameScreen() {
  return (
    <>
      <header className="header">
        <a className="brand" href="/" aria-label="Wordkind home">
          <img src="/assets/icon.svg" width="34" height="34" alt="" />
          <span>
            wordkind<span className="brand-dot">.</span>
          </span>
        </a>
        <div className="header-actions">
          <button
            className="icon-button wallet-nav"
            id="wallet-nav"
            aria-label="Open word wallet"
          >
            <span data-icon="wallet"></span>
            <b id="wallet-count" hidden>
              0
            </b>
          </button>
          <button
            className="icon-button"
            id="menu-button"
            aria-label="Open game menu"
            aria-haspopup="dialog"
          >
            <span data-icon="menu"></span>
          </button>
        </div>
      </header>
      <main className="playground">
        <section className="game" aria-label="Word puzzle">
          <div className="game-toolbar">
            <button
              id="difficulty-button"
              className="difficulty-pill"
              aria-label="Change difficulty"
              aria-haspopup="dialog"
            >
              <span id="difficulty-label">Easy</span>
              <span data-icon="chevron"></span>
            </button>
            <h1 id="level-label">Loading…</h1>
            <button
              className="icon-button"
              id="new-puzzle"
              aria-label="Pick a new random puzzle"
              title="New puzzle"
            >
              <span data-icon="refresh"></span>
            </button>
          </div>
          <div id="race-strip" hidden></div>
          <div className="game-status">
            <button
              id="word-list-button"
              className="game-progress"
              aria-label="View words to find"
            >
              <span id="progress-label">0 / 4 words</span>
              <span data-icon="chevron"></span>
            </button>
            <span id="timer-label" hidden></span>
          </div>
          <div
            id="countdown"
            className="countdown"
            hidden
            aria-live="assertive"
          ></div>
          <div className="board-area">
            <div id="board" className="board" aria-label="Puzzle board"></div>
          </div>
          <div
            id="board-message"
            className="board-message"
            aria-live="polite"
          ></div>
          <div id="word-checklist" hidden></div>
          <div className="word-entry">
            <input
              id="word-input"
              aria-label="Type a word or connect wheel letters"
              maxLength="8"
              autoComplete="off"
              spellCheck={false}
              placeholder="Make a word"
            />
            <button
              className="icon-button"
              id="submit-word"
              aria-label="Submit word"
            >
              <span data-icon="arrow"></span>
            </button>
          </div>
          <div className="wheel-row">
            <button className="tool-button" id="shuffle-button">
              <span data-icon="shuffle"></span>
              <span>Shuffle</span>
            </button>
            <div className="wheel" id="wheel" aria-label="Letter wheel">
              <svg
                className="connections"
                viewBox="0 0 260 260"
                aria-hidden="true"
              >
                <polyline id="wheel-line" points="" />
              </svg>
              <button
                className="wheel-center"
                id="clear-word"
                aria-label="Clear selected word"
                title="Clear word"
              >
                <span data-icon="close"></span>
              </button>
              <div id="letters"></div>
            </div>
            <button className="tool-button" id="hint-button">
              <span data-icon="bulb"></span>
              <span>Hint</span>
            </button>
          </div>
        </section>
      </main>
      <dialog
        id="settings-dialog"
        className="settings-drawer"
        aria-labelledby="settings-heading"
      >
        <div className="drawer-header">
          <h2 id="settings-heading">Your game</h2>
          <button
            className="icon-button"
            id="close-settings"
            aria-label="Close game menu"
          >
            <span data-icon="close"></span>
          </button>
        </div>
        <nav className="menu-modes" aria-label="Game modes">
          <button className="active" id="solo-nav">
            Solo
          </button>
          <button id="race-nav">
            With a friend <span data-icon="arrow"></span>
          </button>
        </nav>
        <section className="settings-section">
          <h3>Difficulty</h3>
          <div
            className="difficulty-options"
            role="group"
            aria-label="Puzzle difficulty"
            id="difficulty-options"
          ></div>
        </section>
        <section className="settings-section">
          <h3>Mode</h3>
          <div className="play-modes" role="group" aria-label="Solo play mode">
            <button data-mode="zen" className="active">
              Zen<span>Untimed</span>
            </button>
            <button data-mode="sprint">
              Sprint<span>3 minutes</span>
            </button>
            <button data-mode="daily">
              Daily<span>Today’s puzzle</span>
            </button>
          </div>
        </section>
        <div className="menu-links">
          <button id="library-button">
            <span data-icon="grid"></span>Puzzle library
            <span className="menu-count">1,440</span>
          </button>
          <button id="open-wallet">
            <span data-icon="wallet"></span>Word wallet
            <span data-icon="arrow"></span>
          </button>
          <button id="expand-board">
            <span data-icon="expand"></span>Expand board
          </button>
          <button id="how-button">
            <span data-icon="help"></span>How to play
          </button>
          <button
            id="sound-button"
            aria-label="Turn sound on"
            aria-pressed="false"
          >
            <span data-icon="sound"></span>Sound
            <span id="sound-state" className="menu-count">
              Off
            </span>
          </button>
        </div>
        <div id="visit-stats" className="visit-stats"></div>
      </dialog>
      <dialog id="dialog">
        <button
          className="dialog-close icon-button"
          id="close-dialog"
          aria-label="Close"
        >
          <span data-icon="close"></span>
        </button>
        <div id="dialog-content"></div>
      </dialog>
      <div id="toast" role="status" aria-live="polite"></div>
    </>
  );
}
