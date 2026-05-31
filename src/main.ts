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

document.getElementById('start-game')?.addEventListener('click', () => {
    showScreen('game')
})

document.getElementById('field')?.addEventListener('click', e => {
    const card = (e.target as HTMLElement).closest('.card') as HTMLButtonElement
    if (card) card.classList.toggle('is-flipped')
})

showScreen('welcome')
