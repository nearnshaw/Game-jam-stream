import { engine, InputAction, pointerEventsSystem, TextShape, VisibilityComponent } from "@dcl/sdk/ecs"
import { openExternalUrl } from '~system/RestrictedActions'


var repoLink = ""

export function gitSetup(){

    const ghButton = engine.getEntityOrNullByName("ghButton")
    const ghArrow = engine.getEntityOrNullByName("ghArrow")
    const ghText = engine.getEntityOrNullByName("ghText")

    if (!ghButton || !ghArrow || !ghText) {
        console.error('GitHub entities not found')
        return
    }
    TextShape.getMutable(ghText).text = ""

    pointerEventsSystem.onPointerDown({
		entity: ghButton,
		opts: { button: InputAction.IA_POINTER, hoverText: 'Open link' },
	}, () => {
        openExternalUrl({ url: repoLink })   
    })
    
}

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
    TextShape.getMutable(ghText).text = ""

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
    TextShape.getMutable(ghText).text = "Check the code"

    repoLink = repo

}