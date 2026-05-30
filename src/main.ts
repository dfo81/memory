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

document.getElementById('start-game')?.addEventListener('click', () => {
    showScreen('game')
})

document.getElementById('field')?.addEventListener('click', e => {
    const card = (e.target as HTMLElement).closest('.card') as HTMLButtonElement
    if (card) card.classList.toggle('is-flipped')
})

showScreen('welcome')
