import { Transform, MeshRenderer, MeshCollider, AvatarModifierArea, AvatarModifierType, engine } from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'
import { type GameController } from '../controllers/game.controller'

export const JAIL_CENTER = Vector3.create(10.07, 10, 10.58)

// Change to true to make jail visible for debug purposes
const IS_JAIL_VISIBLE: boolean = false

export class Jail {
  public collidersJailStructureN = engine.addEntity()
  public collidersJailStructureW = engine.addEntity()
  public collidersJailStructureE = engine.addEntity()
  public collidersJailStructureS = engine.addEntity()
  public collidersJailStructureFloor = engine.addEntity()
  public hideAvatarsArea = engine.addEntity()
  public gameController: GameController

  constructor(gameController: GameController) {
    this.gameController = gameController
    this.createCollidersJail()
    AvatarModifierArea.create(this.hideAvatarsArea, {
      area: Vector3.create(1, 1, 1),
      modifiers: [AvatarModifierType.AMT_HIDE_AVATARS],
      excludeIds: []
    })
  }

  createCollidersJail(): void {
    // Size
    const boxWidth = 2
    const boxLength = 2
    const wallHeight = 5
    const wallThickness = 0.2

    const center = JAIL_CENTER

    // North
    Transform.create(this.collidersJailStructureN, {
      position: Vector3.create(center.x, center.y + wallHeight / 2, center.z - boxLength / 2),
      scale: Vector3.create(boxWidth, wallHeight, wallThickness)
    })

    // South
    Transform.create(this.collidersJailStructureS, {
      position: Vector3.create(center.x, center.y + wallHeight / 2, center.z + boxLength / 2),
      scale: Vector3.create(boxWidth, wallHeight, wallThickness)
    })

    // East
    Transform.create(this.collidersJailStructureE, {
      position: Vector3.create(center.x + boxWidth / 2, center.y + wallHeight / 2, center.z),
      scale: Vector3.create(wallThickness, wallHeight, boxLength)
    })

    // West
    Transform.create(this.collidersJailStructureW, {
      position: Vector3.create(center.x - boxWidth / 2, center.y + wallHeight / 2, center.z),
      scale: Vector3.create(wallThickness, wallHeight, boxLength)
    })

    // Floor
    const floorHeight = 0.01
    Transform.create(this.collidersJailStructureFloor, {
      position: Vector3.create(center.x, center.y - floorHeight / 2, center.z),
      scale: Vector3.create(boxWidth, floorHeight, boxLength)
    })

    // Hide Players Area
    Transform.create(this.hideAvatarsArea, {
      position: Vector3.create(center.x, center.y, center.z)
    })

    if (IS_JAIL_VISIBLE) {
      MeshRenderer.setBox(this.collidersJailStructureN)
      MeshRenderer.setBox(this.collidersJailStructureS)
      MeshRenderer.setBox(this.collidersJailStructureW)
      MeshRenderer.setBox(this.collidersJailStructureE)
      MeshRenderer.setBox(this.collidersJailStructureFloor)
    }
    MeshCollider.setBox(this.collidersJailStructureN)
    MeshCollider.setBox(this.collidersJailStructureS)
    MeshCollider.setBox(this.collidersJailStructureW)
    MeshCollider.setBox(this.collidersJailStructureE)
    MeshCollider.setBox(this.collidersJailStructureFloor)
  }
}
