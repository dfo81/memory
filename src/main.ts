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

const GAMING = [
    'Asset 3@2x 1','Asset 4@2x 1','Asset 5@2x 1','Asset 6@2x 1',
    'Asset 8@2x 1','Asset 8@2x 2','Asset 9@2x 1','Asset 10@2x 1',
    'Asset 11@2x 1','Asset 12@2x 1','Asset 13@2x 1','Asset 14@2x 1',
    'Asset 15@2x 1','Asset 16@2x 1','Asset 17@2x 1','Asset 18@2x 1',
    'Asset 19@2x 1','play button@2x 1',
].map(n => `${base}src/assets/icons/gaming_theme/${n.replace(/ /g, '%20')}.svg`)

const FOODS = ['01','Artboard 3','Artboard 4','Artboard 5','Artboard 6','Artboard 7',
    'Artboard 8','Artboard 9','Artboard 10','Artboard 11']
    .map(n => `${base}src/assets/icons/foods_theme/${`${n}@3x 1`.replace(/ /g, '%20')}.svg`)

// TODO(da-projects): once src/assets/icons/da_projects_theme/ holds the card SVGs,
// list their file names here and switch themeImages['da-projects'] from CODE_VIBES
// to DA_PROJECTS (and themeBackImages to the folder's back image).
// const DA_PROJECTS = ['card1','card2', /* … */]
//     .map(n => `${base}src/assets/icons/da_projects_theme/${n.replace(/ /g, '%20')}.svg`)

const themeImages: Record<string, string[]> = {
    'it-logos':    CODE_VIBES,
    'gaming':      GAMING,
    'da-projects': CODE_VIBES, // TODO: → DA_PROJECTS
    'foods':       FOODS,
}

const themeBackImages: Record<string, string> = {
    'it-logos':    `${base}src/assets/icons/code_vibes_theme/back.svg`,
    'gaming':      `${base}src/assets/icons/gaming_theme/back.svg`,
    'da-projects': `${base}src/assets/icons/code_vibes_theme/back.svg`, // TODO: → da_projects_theme/back
    'foods':       `${base}src/assets/icons/foods_theme/back_logo.svg`,
}

// ── Game state ────────────────────────────────────────────────────────────────

let flippedCards: HTMLButtonElement[] = []
let lockBoard = false
let scores: Record<Player, number> = { blue: 0, orange: 0 }
let currentPlayer: Player = 'blue'
let currentTheme = 'it-logos'
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
        case 'gaming': return `${base}src/assets/icons/Player_${player}.svg`
        case 'foods':  return `${base}src/assets/icons/foods_theme/chess_pawn_${player}.svg`
        default:       return `${base}src/assets/icons/label_${player}.svg`
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
                <img src="${imageSrc}" alt="" />
            </div>
            <div class="card__face card__face--back">
                <img src="${backSrc}" alt="" />
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

        const isFoods = currentTheme === 'foods'

        const backBtn = document.getElementById('back-to-start')
        if (backBtn) backBtn.textContent = isFoods ? 'home' : 'Back to start'

        if (isDraw) {
            subtitleEl.textContent = "It's a"
            titleEl.textContent    = 'DRAW'
            titleEl.className      = 'result__title result__title--draw'
            iconEl.src             = isFoods
                ? `${base}src/assets/icons/foods_theme/Frame.svg`
                : `${base}src/assets/icons/Scale_Icon.svg`
            confettiEl.classList.remove('is-visible')
        } else {
            subtitleEl.textContent = 'The winner is'
            titleEl.textContent    = winner === 'blue' ? 'BLUE PLAYER' : 'ORANGE PLAYER'
            titleEl.className      = `result__title result__title--${winner}`
            iconEl.src             = isFoods
                ? `${base}src/assets/icons/foods_theme/Frame_${winner}.svg`
                : `${base}src/assets/icons/Player_${winner}.svg`
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

    const images    = themeImages[theme] ?? CODE_VIBES
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
document.getElementById('back-to-start')?.addEventListener('click', () => showScreen('welcome'))

showScreen('welcome')
