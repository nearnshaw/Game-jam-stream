import { engine, InputAction, pointerEventsSystem, VisibilityComponent } from "@dcl/sdk/ecs"
import { openExternalUrl } from '~system/RestrictedActions'


export function gitHide() {
    // Get clap meter entities
    const ghButton = engine.getEntityOrNullByName("ghButton")
    const ghArrow = engine.getEntityOrNullByName("ghArrow")
    const ghText = engine.getEntityOrNullByName("ghText")

    if (!ghButton || !ghArrow || !ghText) {
        console.error('GitHub entities not found')
        return
    }

    VisibilityComponent.getMutable(ghButton).visible = false
    VisibilityComponent.getMutable(ghArrow).visible = false
    VisibilityComponent.getMutable(ghText).visible = false

}


export function gitUpdate(repo: string) {
    // Get clap meter entities
    const ghButton = engine.getEntityOrNullByName("ghButton")
    const ghArrow = engine.getEntityOrNullByName("ghArrow")
    const ghText = engine.getEntityOrNullByName("ghText")

    if (!ghButton || !ghArrow || !ghText) {
        console.error('GitHub entities not found')
        return
    }

    VisibilityComponent.getMutable(ghButton).visible = true
    VisibilityComponent.getMutable(ghArrow).visible = true
    VisibilityComponent.getMutable(ghText).visible = true

    pointerEventsSystem.onPointerDown({
		entity: ghButton,
		opts: { button: InputAction.IA_POINTER, hoverText: 'Open link' },
	}, () => {
        openExternalUrl({ url: repo })   
    })

}