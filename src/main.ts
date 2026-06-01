import './styles/style.scss'

type Screen = 'welcome' | 'settings' | 'game'

const SCREEN_IDS: Record<Screen, string> = {
    welcome: 'welcome',
    settings: 'settings',
    game: 'field'
}

function showScreen(screen: Screen) {
    document.querySelectorAll<HTMLElement>('.screen').forEach(el => {
        el.classList.remove('is-active')
    })
    document.getElementById(SCREEN_IDS[screen])?.classList.add('is-active')
}

document.getElementById('play-button')?.addEventListener('click', () => {
    showScreen('settings')
})

const base = import.meta.env.BASE_URL

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

document.getElementById('start-game')?.addEventListener('click', () => {
    showScreen('game')
})

document.getElementById('field')?.addEventListener('click', e => {
    const card = (e.target as HTMLElement).closest('.card') as HTMLButtonElement
    if (card) card.classList.toggle('is-flipped')
})

showScreen('welcome')
