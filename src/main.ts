import './styles/style.scss'

type Screen = 'welcome' | 'settings' | 'game' | 'game_over'
type Player = 'blue' | 'orange'

const SCREEN_IDS: Record<Screen, string> = {
    welcome:   'welcome',
    settings:  'settings',
    game:      'field',
    game_over: 'game_over'
}

const base = import.meta.env.BASE_URL

function showScreen(screen: Screen) {
    document.querySelectorAll<HTMLElement>('.screen').forEach(el => el.classList.remove('is-active'))
    document.getElementById(SCREEN_IDS[screen])?.classList.add('is-active')
}

// ── Settings ──────────────────────────────────────────────────────────────────

document.getElementById('play-button')?.addEventListener('click', () => showScreen('settings'))

const themePreviewMap: Record<string, string> = {
    'it-logos':    `${base}src/assets/icons/theme=IT logos.svg`,
    'gaming':      `${base}src/assets/icons/theme=gameing.svg`,
    'da-projects': `${base}src/assets/icons/theme=DA projects.svg`,
    'foods':       `${base}src/assets/icons/theme=foods.svg`,
}

document.querySelectorAll<HTMLInputElement>('input[name="theme"]').forEach(input => {
    input.addEventListener('change', () => {
        const preview = document.getElementById('theme-preview') as HTMLImageElement | null
        if (preview) preview.src = themePreviewMap[input.value]
    })
})

const lineDefault = `${base}src/assets/icons/Line_vertikal_default.svg`
const lineActive  = `${base}src/assets/icons/Line_vertikal_active.svg`
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

const CODE_VIBES = ['angular','bootstrap','css','django','firebase','git','github','html',
    'javascript','nodejs','python','react','sass','sql','terminal','typescript','vscode','vue']
    .map(n => `${base}src/assets/icons/code_vibes_theme/${n}.svg`)

const themeImages: Record<string, string[]> = {
    'it-logos':    CODE_VIBES,
    'gaming':      CODE_VIBES,
    'da-projects': CODE_VIBES,
    'foods':       CODE_VIBES,
}

// ── Game state ────────────────────────────────────────────────────────────────

let flippedCards: HTMLButtonElement[] = []
let lockBoard = false
let scores: Record<Player, number> = { blue: 0, orange: 0 }
let currentPlayer: Player = 'blue'
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

function updateCurrentPlayerIcon() {
    const icon = document.getElementById('current-player-icon') as HTMLImageElement | null
    if (icon) icon.src = `${base}src/assets/icons/label_${currentPlayer}.svg`
}

// ── Card logic ────────────────────────────────────────────────────────────────

function createCard(imageSrc: string): HTMLButtonElement {
    const card = document.createElement('button')
    card.className = 'card'
    card.dataset.image = imageSrc
    card.innerHTML = `
        <div class="card__inner">
            <div class="card__face">
                <img src="${imageSrc}" alt="" />
            </div>
            <div class="card__face card__face--back"></div>
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

function showWinner() {
    const winner =
        scores.blue > scores.orange ? 'Blue wins!' :
        scores.orange > scores.blue ? 'Orange wins!' :
        "It's a draw!"

    const blueEl   = document.getElementById('final-score-blue')
    const orangeEl = document.getElementById('final-score-orange')
    const winnerEl = document.getElementById('game-over-winner')
    if (blueEl)   blueEl.textContent   = String(scores.blue)
    if (orangeEl) orangeEl.textContent = String(scores.orange)
    if (winnerEl) winnerEl.textContent = winner

    showScreen('game_over')
}

// ── Start game ────────────────────────────────────────────────────────────────

function startGame(theme: string, player: Player, size: number) {
    scores        = { blue: 0, orange: 0 }
    currentPlayer = player
    matchedPairs  = 0
    flippedCards  = []
    lockBoard     = false

    const images    = themeImages[theme] ?? CODE_VIBES
    const pairCount = Math.min(size / 2, images.length)
    totalPairs      = pairCount

    const cols = size === 16 ? 4 : 6
    const cardImages = shuffle([...images.slice(0, pairCount), ...images.slice(0, pairCount)])

    const grid = document.getElementById('card-grid')!
    grid.innerHTML = ''
    grid.dataset.size = String(size)
    grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`

    cardImages.forEach(src => grid.appendChild(createCard(src)))

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
document.getElementById('play-again')?.addEventListener('click', () => showScreen('settings'))

showScreen('welcome')
