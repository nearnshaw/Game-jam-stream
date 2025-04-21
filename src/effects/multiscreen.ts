import { MeshRenderer, Transform } from "@dcl/sdk/ecs"

import { engine } from "@dcl/sdk/ecs"

import { Material } from "@dcl/sdk/ecs"


export function createMultiScreens() {

    // fetch screen from your scene
    const screenEntity = engine.getEntityOrNullByName("screen")

    if (!screenEntity) {
        console.error("Screen entity not found")
        return
    }

    // create new screen
    const screen = engine.addEntity()
    MeshRenderer.setPlane(screen)
    Transform.create(screen, { position: { x: 4, y: 1, z: 4 } })

    // set the texture to point to the one from CH
    const videoTexture = Material.Texture.Video({ videoPlayerEntity: screenEntity })

    // Use that in a material on the new screen
    Material.setBasicMaterial(screen, {
        texture: videoTexture,
    })
}