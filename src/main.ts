import './styles/style.scss'

type Screen = 'welcome' | 'settings' | 'game' | 'game_over' | 'result'
type Player = 'blue' | 'orange'

const SCREEN_IDS: Record<Screen, string> = {
    welcome:   'welcome',
    settings:  'settings',
    game:      'field',
    game_over: 'game_over',
    result:    'result'
}

const base = import.meta.env.BASE_URL

function showScreen(screen: Screen) {
    document.querySelectorAll<HTMLElement>('.screen').forEach(el => el.classList.remove('is-active'))
    document.getElementById(SCREEN_IDS[screen])?.classList.add('is-active')
}

// ── Settings ──────────────────────────────────────────────────────────────────

document.getElementById('play-button')?.addEventListener('click', () => showScreen('settings'))

const themePreviewMap: Record<string, string> = {
    'code-vibes':  `${base}src/assets/icons/general/theme_code-vibes.svg`,
    'gaming':      `${base}src/assets/icons/general/theme_gaming.svg`,
    'da-projects': `${base}src/assets/icons/general/theme_da-projects.svg`,
    'foods':       `${base}src/assets/icons/general/theme_foods.svg`,
}

document.querySelectorAll<HTMLInputElement>('input[name="theme"]').forEach(input => {
    input.addEventListener('change', () => {
        const preview = document.getElementById('theme-preview') as HTMLImageElement | null
        if (preview) preview.src = themePreviewMap[input.value]
    })
})

const lineDefault = `${base}src/assets/icons/general/Line_vertikal_default.svg`
const lineActive  = `${base}src/assets/icons/general/Line_vertikal_active.svg`
const playerLabels: Record<string, string> = { blue: 'Blue Player', orange: 'Orange Player' }
const sizeLabels: Record<string, string>   = { '16': 'Board-16 Cards', '24': 'Board-24 Cards', '36': 'Board-36 Cards' }

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
    'code-vibes':  `${base}src/assets/icons/code_vibes_theme/back.svg`,
    'gaming':      `${base}src/assets/icons/gaming_theme/back.svg`,
    'da-projects': `${base}src/assets/icons/code_vibes_theme/back.svg`, // TODO: → da_projects_theme/back
    'foods':       `${base}src/assets/icons/foods_theme/back_logo.svg`,
}

// ── Game state ────────────────────────────────────────────────────────────────

let flippedCards: HTMLButtonElement[] = []
let lockBoard = false
let scores: Record<Player, number> = { blue: 0, orange: 0 }
let currentPlayer: Player = 'blue'
let currentTheme = 'code-vibes'
let totalPairs = 0
let matchedPairs = 0

function shuffle<T>(arr: T[]): T[] {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]]
    }
    return a
}

// ── DOM helpers ───────────────────────────────────────────────────────────────

function updateScores() {
    const spans = document.querySelectorAll<HTMLElement>('.score')
    if (spans[0]) spans[0].textContent = String(scores.blue)
    if (spans[1]) spans[1].textContent = String(scores.orange)
}

function playerIcon(player: Player): string {
    switch (currentTheme) {
        case 'gaming': return `${base}src/assets/icons/general/Player_${player}.svg`
        case 'foods':  return `${base}src/assets/icons/foods_theme/chess_pawn_${player}.svg`
        default:       return `${base}src/assets/icons/general/label_${player}.svg`
    }
}

const playerColor: Record<Player, string> = { blue: '#097fc5', orange: '#ea6900' }

function updateCurrentPlayerIcon() {
    const icon = document.getElementById('current-player-icon') as HTMLImageElement | null
    if (!icon) return
    if (currentTheme === 'foods') {
        // Neutral pawn figure on a pill tinted in the current player's colour.
        icon.src = `${base}src/assets/icons/foods_theme/chess_pawn.svg`
        icon.style.backgroundColor = playerColor[currentPlayer]
    } else {
        icon.src = playerIcon(currentPlayer)
        icon.style.backgroundColor = ''
    }
}

// ── Card logic ────────────────────────────────────────────────────────────────

function createCard(imageSrc: string, backSrc: string): HTMLButtonElement {
    const card = document.createElement('button')
    card.className = 'card'
    card.dataset.image = imageSrc
    card.innerHTML = `
        <div class="card__inner">
            <div class="card__face">
                <img src="${imageSrc}" alt="" draggable="false" />
            </div>
            <div class="card__face card__face--back">
                <img src="${backSrc}" alt="" draggable="false" />
            </div>
        </div>`
    card.addEventListener('click', () => onCardClick(card))
    return card
}

function onCardClick(card: HTMLButtonElement) {
    if (lockBoard || card.classList.contains('is-flipped') || card.classList.contains('is-matched')) return

    card.classList.add('is-flipped')
    flippedCards.push(card)

    if (flippedCards.length === 2) {
        lockBoard = true
        checkMatch()
    }
}

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

// ── Result/Draw-Screen: ein Eintrag pro Theme (Button-Text + Icons) ─────────────
// Visuelles steckt in den CSS-Tokens (#result[data-theme]); hier nur Inhalt/Assets.
type ResultTheme = {
    backLabel: string
    drawIcon: string
    winnerIcon: (winner: Player) => string
}

const DEFAULT_RESULT: ResultTheme = {
    backLabel: 'Home',
    drawIcon: `${base}src/assets/icons/code_vibes_theme/scale.svg`,
    winnerIcon: (w) => `${base}src/assets/icons/general/Player_${w}.svg`,
}

const RESULT_THEMES: Record<string, Partial<ResultTheme>> = {
    'code-vibes': {
        backLabel: 'Back to start',
    },
    gaming: {
        drawIcon: `${base}src/assets/icons/gaming_theme/scale.svg`,
        winnerIcon: () => `${base}src/assets/icons/gaming_theme/pockal.svg`,
    },
    foods: {
        drawIcon: `${base}src/assets/icons/foods_theme/scale.svg`,
        winnerIcon: (w) => `${base}src/assets/icons/foods_theme/Frame_${w}.svg`,
    },
    'da-projects': {
        drawIcon: `${base}src/assets/icons/da_projects_theme/scale.svg`,
    },
}

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
    if (labelBlueImg)   labelBlueImg.src   = playerIcon('blue')
    if (labelOrangeImg) labelOrangeImg.src = playerIcon('orange')

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

    const backSrc = themeBackImages[theme] ?? `${base}src/assets/icons/code_vibes_theme/back.svg`
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

document.querySelector('.exit')?.addEventListener('click', () => {
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
