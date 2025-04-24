import { engine, InputAction, pointerEventsSystem, TextShape, VisibilityComponent } from "@dcl/sdk/ecs"
import { openExternalUrl } from '~system/RestrictedActions'


export function descriptionPanelSetup(){

    const infoPanel = engine.getEntityOrNullByName("infoPanel")
    const paneltext = engine.getEntityOrNullByName("panelText")
    
    if (!infoPanel || !paneltext) {
        console.error('GitHub entities not found')
        return
    }

    VisibilityComponent.getMutable(infoPanel).visible = false
    //TextShape.getMutable(paneltext).text = ""

    TextShape.getMutable(paneltext).textWrapping = true
    TextShape.getMutable(paneltext).height = 7
    TextShape.getMutable(paneltext).width = 2.9
}   


export function descriptionHide() {
    // Get clap meter entities
    const infoPanel = engine.getEntityOrNullByName("infoPanel")
    const paneltext = engine.getEntityOrNullByName("panelText")


    if (!infoPanel || !paneltext) {
        console.error('GitHub entities not found')
        return
    }

    VisibilityComponent.getMutable(infoPanel).visible = false

    TextShape.getMutable(paneltext).text = ""
   

}


export function descriptionUpdate(description: string) {
    // Get clap meter entities
    const infoPanel = engine.getEntityOrNullByName("infoPanel")
    const paneltext = engine.getEntityOrNullByName("panelText")


    if (!infoPanel || !paneltext) {
        console.error('GitHub entities not found')
        return
    }

    VisibilityComponent.getMutable(infoPanel).visible = true

    //limit the length of description to 400 characters
    if (description.length > 400) {
        description = description.substring(0, 400)
    }
   
    TextShape.getMutable(paneltext).text = description

}