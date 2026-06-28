import './styles/style.scss'

/** Logical screens of the app, in roughly the order the user moves through them. */
type Screen = 'welcome' | 'settings' | 'game' | 'game_over' | 'result'
/** The two players, identified by their colour. */
type Player = 'blue' | 'orange'

/** Maps each logical screen to the id of its DOM element. */
const SCREEN_IDS: Record<Screen, string> = {
    welcome:   'welcome',
    settings:  'settings',
    game:      'field',
    game_over: 'game_over',
    result:    'result'
}

// Every icon is resolved through Vite so it gets a hashed, build-safe URL.
// Plain runtime strings like `/src/assets/...` are invisible to the bundler
// and would 404 in a production build.
const iconUrls = import.meta.glob('./assets/icons/**/*.svg', {
    eager: true,
    query: '?url',
    import: 'default',
}) as Record<string, string>

/**
 * Resolves an icon path (relative to `src/assets/icons/`) to its hashed,
 * build-safe URL.
 *
 * @param path - Path under `src/assets/icons/`, e.g. "general/label_blue.svg".
 * @returns The bundled asset URL (empty string if the file does not exist).
 */
function icon(path: string): string {
    return iconUrls[`./assets/icons/${path}`] ?? ''
}

/**
 * Shows a single screen and hides all others.
 *
 * @param screen - The screen to activate.
 */
function showScreen(screen: Screen) {
    document.querySelectorAll<HTMLElement>('.screen').forEach(el => el.classList.remove('is-active'))
    document.getElementById(SCREEN_IDS[screen])?.classList.add('is-active')
}

// ── Settings ──────────────────────────────────────────────────────────────────

document.getElementById('play-button')?.addEventListener('click', () => showScreen('settings'))

const themePreviewMap: Record<string, string> = {
    'code-vibes':  icon('general/theme_code-vibes.svg'),
    'gaming':      icon('general/theme_gaming.svg'),
    'da-projects': icon('general/theme_da-projects.svg'),
    'foods':       icon('general/theme_foods.svg'),
}

document.querySelectorAll<HTMLInputElement>('input[name="theme"]').forEach(input => {
    input.addEventListener('change', () => {
        const preview = document.getElementById('theme-preview') as HTMLImageElement | null
        if (preview) preview.src = themePreviewMap[input.value]
    })
})

const lineDefault = icon('general/Line_vertikal_default.svg')
const lineActive  = icon('general/Line_vertikal_active.svg')
const playerLabels: Record<string, string> = { blue: 'Blue Player', orange: 'Orange Player' }
const sizeLabels: Record<string, string>   = { '16': 'Board-16 Cards', '24': 'Board-24 Cards', '36': 'Board-36 Cards' }

/**
 * Enables the "Start" button only once a player and a board size are chosen,
 * and keeps the breadcrumb labels and divider icons in sync with the selection.
 */
function updateStartButton() {
    const playerInput = document.querySelector<HTMLInputElement>('input[name="player"]:checked')
    const sizeInput   = document.querySelector<HTMLInputElement>('input[name="size"]:checked')
    const ready = !!playerInput && !!sizeInput

    const btn = document.getElementById('start-game') as HTMLButtonElement | null
    if (btn) btn.disabled = !ready

    const line1 = document.getElementById('line-v-1') as HTMLImageElement | null
    const line2 = document.getElementById('line-v-2') as HTMLImageElement | null
    if (line1) line1.src = ready ? lineActive : lineDefault
    if (line2) line2.src = ready ? lineActive : lineDefault

    const bcPlayer = document.getElementById('breadcrumb-player')
    const bcSize   = document.getElementById('breadcrumb-size')
    if (bcPlayer) bcPlayer.textContent = playerInput ? playerLabels[playerInput.value] : 'Player'
    if (bcSize)   bcSize.textContent   = sizeInput   ? sizeLabels[sizeInput.value]    : 'Board size'
}

document.querySelectorAll<HTMLInputElement>('input[name="player"], input[name="size"]').forEach(input => {
    input.addEventListener('change', updateStartButton)
})

// ── Theme images ──────────────────────────────────────────────────────────────

// Card fronts are auto-loaded from each theme's cards/ folder — drop an SVG in
// and it becomes a card, no list to maintain. Vite returns hashed, build-safe URLs.
const cardModules = import.meta.glob('./assets/icons/*/cards/*.svg', {
    eager: true,
    query: '?url',
    import: 'default',
}) as Record<string, string>

const FOLDER_TO_THEME: Record<string, string> = {
    code_vibes_theme:  'code-vibes',
    gaming_theme:      'gaming',
    da_projects_theme: 'da-projects',
    foods_theme:       'foods',
}

const themeImages: Record<string, string[]> = {}
for (const [path, url] of Object.entries(cardModules)) {
    const folder = path.match(/icons\/([^/]+)\/cards\//)?.[1]
    const key = folder ? FOLDER_TO_THEME[folder] : undefined
    if (key) (themeImages[key] ??= []).push(url)
}

// da-projects has no card art yet → fall back to the code-vibes deck for now.
themeImages['da-projects'] ??= themeImages['code-vibes']

const themeBackImages: Record<string, string> = {
    'code-vibes':  icon('code_vibes_theme/back.svg'),
    'gaming':      icon('gaming_theme/back.svg'),
    'da-projects': icon('general/back_logo.svg'),
    'foods':       icon('general/back_logo.svg'),
}

// ── Game state ────────────────────────────────────────────────────────────────

let flippedCards: HTMLButtonElement[] = []
let lockBoard = false
let scores: Record<Player, number> = { blue: 0, orange: 0 }
let currentPlayer: Player = 'blue'
let currentTheme = 'code-vibes'
let totalPairs = 0
let matchedPairs = 0

/**
 * Returns a new array with the elements in random order (Fisher–Yates).
 * The input array is left untouched.
 *
 * @param arr - The array to shuffle.
 * @returns A shuffled copy.
 */
function shuffle<T>(arr: T[]): T[] {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]]
    }
    return a
}

// ── DOM helpers ───────────────────────────────────────────────────────────────

/** Writes the current blue/orange scores into the in-game score labels. */
function updateScores() {
    const spans = document.querySelectorAll<HTMLElement>('.score')
    if (spans[0]) spans[0].textContent = String(scores.blue)
    if (spans[1]) spans[1].textContent = String(scores.orange)
}

/**
 * Resolves the player-token image for a player in the active theme.
 *
 * @param player - The player whose icon is requested.
 * @returns The icon URL for the current theme.
 */
function playerIcon(player: Player): string {
    switch (currentTheme) {
        case 'gaming': return icon(`general/Player_${player}.svg`)
        case 'foods':  return icon(`foods_theme/chess_pawn_${player}.svg`)
        default:       return icon(`general/label_${player}.svg`)
    }
}

const playerColor: Record<Player, string> = { blue: '#097fc5', orange: '#ea6900' }
const gamingPlayerColor: Record<Player, string> = { blue: '#2bb1ff', orange: '#f58e39' }

/**
 * Updates the "current player" indicator icon (and its background tint) to
 * reflect whose turn it is in the active theme.
 */
function updateCurrentPlayerIcon() {
    const iconEl = document.getElementById('current-player-icon') as HTMLImageElement | null
    if (!iconEl) return
    if (currentTheme === 'foods') {
        // Neutral pawn figure on a pill tinted in the current player's colour.
        iconEl.src = icon('foods_theme/chess_pawn.svg')
        iconEl.style.backgroundColor = playerColor[currentPlayer]
    } else if (currentTheme === 'gaming' || currentTheme === 'da-projects') {
        // White player figure on a pill tinted in the current player's colour.
        iconEl.src = icon('general/Player_white.svg')
        iconEl.style.backgroundColor = gamingPlayerColor[currentPlayer]
    } else {
        iconEl.src = playerIcon(currentPlayer)
        iconEl.style.backgroundColor = ''
    }
}

// ── Card logic ────────────────────────────────────────────────────────────────

/**
 * Builds a single memory card as a flippable button.
 *
 * @param imageSrc - URL of the card's front image (the symbol to match).
 * @param backSrc - URL of the shared card-back image.
 * @returns The card button, with its click handler already wired up.
 */
function createCard(imageSrc: string, backSrc: string): HTMLButtonElement {
    const card = document.createElement('button')
    card.className = 'card'
    card.dataset.image = imageSrc
    card.innerHTML = `
        <div class="card__inner">
            <div class="card__face">
                <img src="${imageSrc}" alt="Memory card front" draggable="false" />
            </div>
            <div class="card__face card__face--back">
                <img src="${backSrc}" alt="Card back" draggable="false" />
            </div>
        </div>`
    card.addEventListener('click', () => onCardClick(card))
    return card
}

/**
 * Handles a click on a card: flips it and, once two cards are face up, locks
 * the board and checks for a match.
 *
 * @param card - The clicked card button.
 */
function onCardClick(card: HTMLButtonElement) {
    if (lockBoard || card.classList.contains('is-flipped') || card.classList.contains('is-matched')) return

    card.classList.add('is-flipped')
    flippedCards.push(card)

    if (flippedCards.length === 2) {
        lockBoard = true
        checkMatch()
    }
}

/**
 * Compares the two currently flipped cards. On a match they stay face up, the
 * active player scores and keeps the turn, and the game ends when the last pair
 * is found; otherwise both cards flip back and the turn passes to the other player.
 */
function checkMatch() {
    const [a, b] = flippedCards

    if (a.dataset.image === b.dataset.image) {
        a.classList.add('is-matched')
        b.classList.add('is-matched')
        scores[currentPlayer]++
        matchedPairs++
        updateScores()
        flippedCards = []
        lockBoard = false

        if (matchedPairs === totalPairs) setTimeout(showWinner, 400)
    } else {
        setTimeout(() => {
            a.classList.remove('is-flipped')
            b.classList.remove('is-flipped')
            flippedCards = []
            lockBoard = false
            currentPlayer = currentPlayer === 'blue' ? 'orange' : 'blue'
            updateCurrentPlayerIcon()
        }, 1000)
    }
}

// ── Result / draw screen: one entry per theme (button label + icons) ────────────
// The look lives in CSS tokens (#result[data-theme]); here we only set content/assets.

/** Per-theme content for the result screen: back-button label and result icons. */
type ResultTheme = {
    backLabel: string
    drawIcon: string
    winnerIcon: (winner: Player) => string
}

const DEFAULT_RESULT: ResultTheme = {
    backLabel: 'Home',
    drawIcon: icon('code_vibes_theme/scale.svg'),
    winnerIcon: (w) => icon(`general/Player_${w}.svg`),
}

const RESULT_THEMES: Record<string, Partial<ResultTheme>> = {
    'code-vibes': {
        backLabel: 'Back to start',
    },
    gaming: {
        drawIcon: icon('gaming_theme/scale.svg'),
        winnerIcon: () => icon('gaming_theme/pockal.svg'),
    },
    foods: {
        drawIcon: icon('foods_theme/scale.svg'),
        winnerIcon: (w) => icon(`foods_theme/Frame_${w}.svg`),
    },
    'da-projects': {
        drawIcon: icon('da_projects_theme/scale.svg'),
    },
}

/**
 * Reveals the game-over screen, then transitions to the result screen showing
 * the winner (or a draw) with the active theme's labels and icons.
 */
function showWinner() {
    const blueEl   = document.getElementById('final-score-blue')
    const orangeEl = document.getElementById('final-score-orange')
    if (blueEl)   blueEl.textContent   = String(scores.blue)
    if (orangeEl) orangeEl.textContent = String(scores.orange)

    showScreen('game_over')

    setTimeout(() => {
        const gameOverEl = document.getElementById('game_over')!
        const isDraw = scores.blue === scores.orange
        const winner: Player | null = isDraw ? null : (scores.blue > scores.orange ? 'blue' : 'orange')

        const subtitleEl = document.getElementById('result-subtitle')!
        const titleEl    = document.getElementById('result-title')!
        const iconEl     = document.getElementById('result-icon') as HTMLImageElement
        const confettiEl = document.getElementById('result-confetti')!

        const result = { ...DEFAULT_RESULT, ...(RESULT_THEMES[currentTheme] ?? {}) }

        const backBtn = document.getElementById('back-to-start')
        if (backBtn) backBtn.textContent = result.backLabel

        if (isDraw) {
            subtitleEl.textContent = "It's a"
            titleEl.textContent    = 'DRAW'
            titleEl.className      = 'result__title result__title--draw'
            iconEl.src             = result.drawIcon
            confettiEl.classList.remove('is-visible')
        } else {
            subtitleEl.textContent = 'The winner is'
            titleEl.textContent    = winner === 'blue' ? 'BLUE PLAYER' : 'ORANGE PLAYER'
            titleEl.className      = `result__title result__title--${winner}`
            iconEl.src             = result.winnerIcon(winner!)
            confettiEl.classList.add('is-visible')
        }

        gameOverEl.classList.add('is-sliding-out')
        gameOverEl.addEventListener('animationend', () => {
            gameOverEl.classList.remove('is-sliding-out')
            showScreen('result')
        }, { once: true })
    }, 2000)
}

// ── Start game ────────────────────────────────────────────────────────────────

/**
 * Resets all game state, builds the shuffled board for the chosen theme/size,
 * applies the theme to the relevant screens, and shows the game screen.
 *
 * @param theme - The selected theme key (e.g. "code-vibes", "foods").
 * @param player - The player who takes the first turn.
 * @param size - The number of cards on the board (16, 24 or 36).
 */
function startGame(theme: string, player: Player, size: number) {
    scores        = { blue: 0, orange: 0 }
    currentPlayer = player
    currentTheme  = theme
    matchedPairs  = 0
    flippedCards  = []
    lockBoard     = false
    document.getElementById('game_over')?.classList.remove('is-sliding-out')

    const field = document.getElementById('field')!
    field.dataset.theme = theme
    document.getElementById('game_over')!.dataset.theme = theme
    document.getElementById('result')!.dataset.theme = theme

    const labelBlueImg   = document.querySelector<HTMLImageElement>('.label.blue img')
    const labelOrangeImg = document.querySelector<HTMLImageElement>('.label.orange img')
    // da-projects uses the same blue/orange player figures as the gaming theme.
    const labelIcon = (p: Player) =>
        theme === 'da-projects' ? icon(`general/Player_${p}.svg`) : playerIcon(p)
    if (labelBlueImg)   labelBlueImg.src   = labelIcon('blue')
    if (labelOrangeImg) labelOrangeImg.src = labelIcon('orange')

    const goBlueImg   = document.querySelector<HTMLImageElement>('.game-over__score.blue img')
    const goOrangeImg = document.querySelector<HTMLImageElement>('.game-over__score.orange img')
    if (goBlueImg)   goBlueImg.src   = playerIcon('blue')
    if (goOrangeImg) goOrangeImg.src = playerIcon('orange')

    const images    = themeImages[theme] ?? themeImages['code-vibes']
    const pairCount = Math.min(size / 2, images.length)
    totalPairs      = pairCount

    const cols = size === 16 ? 4 : 6
    const cardImages = shuffle([...images.slice(0, pairCount), ...images.slice(0, pairCount)])

    const grid = document.getElementById('card-grid')!
    grid.innerHTML = ''
    grid.dataset.size  = String(size)
    grid.dataset.theme = theme
    grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`

    const backSrc = themeBackImages[theme] ?? icon('code_vibes_theme/back.svg')
    cardImages.forEach(src => grid.appendChild(createCard(src, backSrc)))

    updateScores()
    updateCurrentPlayerIcon()
    showScreen('game')
}

document.getElementById('start-game')?.addEventListener('click', () => {
    const theme  = document.querySelector<HTMLInputElement>('input[name="theme"]:checked')?.value
    const player = document.querySelector<HTMLInputElement>('input[name="player"]:checked')?.value as Player | undefined
    const size   = document.querySelector<HTMLInputElement>('input[name="size"]:checked')?.value

    if (theme && player && size) startGame(theme, player, parseInt(size))
})

const exitOverlay = document.getElementById('exit-overlay')!

// Per-theme overrides for the exit-overlay button labels (otherwise the default).
const DEFAULT_EXIT_LABELS = { cancel: 'Back to game', confirm: 'Exit game' }
const EXIT_LABELS: Record<string, { cancel: string; confirm: string }> = {
    gaming: { cancel: 'No, back to game', confirm: 'Yes, quit game' },
}

document.querySelector('.exit')?.addEventListener('click', () => {
    const labels = EXIT_LABELS[currentTheme] ?? DEFAULT_EXIT_LABELS
    const cancelBtn  = document.getElementById('exit-cancel')
    const confirmBtn = document.getElementById('exit-confirm')
    if (cancelBtn)  cancelBtn.textContent  = labels.cancel
    if (confirmBtn) confirmBtn.textContent = labels.confirm
    exitOverlay.classList.add('is-open')
})

document.getElementById('exit-cancel')?.addEventListener('click', () => {
    exitOverlay.classList.remove('is-open')
})

document.getElementById('exit-confirm')?.addEventListener('click', () => {
    exitOverlay.classList.remove('is-open')
    showScreen('welcome')
})
document.getElementById('back-to-start')?.addEventListener('click', () => showScreen('settings'))

showScreen('welcome')
