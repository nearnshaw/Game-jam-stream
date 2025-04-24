import { engine, InputAction, pointerEventsSystem, TextShape, VisibilityComponent } from "@dcl/sdk/ecs"
import { openExternalUrl } from '~system/RestrictedActions'


export function descriptionHide() {
    // Get clap meter entities
    const infoPanel = engine.getEntityOrNullByName("infoPanel")
    const paneltext = engine.getEntityOrNullByName("paneltext")


    if (!infoPanel || !paneltext) {
        console.error('GitHub entities not found')
        return
    }

    VisibilityComponent.getMutable(infoPanel).visible = false
    VisibilityComponent.getMutable(paneltext).visible = false

}


export function descriptionUpdate(description: string) {
    // Get clap meter entities
    const infoPanel = engine.getEntityOrNullByName("infoPanel")
    const paneltext = engine.getEntityOrNullByName("paneltext")


    if (!infoPanel || !paneltext) {
        console.error('GitHub entities not found')
        return
    }

    VisibilityComponent.getMutable(infoPanel).visible = true
    VisibilityComponent.getMutable(paneltext).visible = true

    TextShape.getMutable(paneltext).text = description

}