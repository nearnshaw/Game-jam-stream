import { engine, InputAction, Material, pointerEventsSystem, TextShape, VisibilityComponent } from "@dcl/sdk/ecs"
import { openExternalUrl } from '~system/RestrictedActions'


var repoLink = ""

export function codeIconSetup(){

    const icon = engine.getEntityOrNullByName("panelIcon")
 

    if (!icon) {
        console.error('  entities not found')
        return
    }
    
    VisibilityComponent.getMutable(icon).visible = false
}

export function codeIconHide() {
    // Get clap meter entities
    const icon = engine.getEntityOrNullByName("panelIcon")
 

    if (!icon) {
        console.error('  entities not found')
        return
    }
    
    VisibilityComponent.getMutable(icon).visible = false

}


export function codeIconUpdate(codeUse: string) {
    // Get clap meter entities
    const icon = engine.getEntityOrNullByName("panelIcon")
 

    if (!icon) {
        console.error('  entities not found')
        return
    }

    let codeIconTexture = ""

    switch (codeUse) {
        case "Code Only":
            codeIconTexture = "assets/scene/images/code.png"
            break
        case "No Code":
            codeIconTexture =  "assets/scene/images/no-code.png"
            break
        case "Hybrid (Creator Hub UI + Code)":
            codeIconTexture =  "assets/scene/images/hybrid.png"
            break
    }

    VisibilityComponent.getMutable(icon).visible = true

    Material.setPbrMaterial(icon, {
        texture: Material.Texture.Common({
            src: codeIconTexture,
        }),
    })
   

}