import { Billboard, engine, GltfContainer, PlayerIdentityData, TextShape, Transform, type Entity } from '@dcl/sdk/ecs'
import { Color4, Vector3 } from '@dcl/sdk/math'
import { onEnterScene, onLeaveScene } from '@dcl/sdk/players'
import { withPlayerInfo } from '../utils'
import { type PlayerController } from '../controllers/player.controller'

export class HostIndicators {
  private readonly indicatorEntities = new Map<
    string,
    { hostEntity: Entity; indicatorEntity: Entity; isLocal: boolean }
  >()

  constructor(private readonly playerController: PlayerController) {
    playerController.onHostChange((_newHosts) => {
      this.updateIndicators()
    })

    engine.addSystem(() => {
      this.updateIndicatorPositions()
    })

    this.updateIndicators()

    onEnterScene(() => {
      this.updateIndicators()
    })

    onLeaveScene((userId) => {
      this.deleteIndicatorIfExists(userId)
    })
  }

  updateIndicatorPositions(): void {
    // We should use parenting, but it seems to be buggy when dealing with avatars
    for (const entities of this.indicatorEntities.values()) {
      if (!entities.isLocal) {
        const parentTransform = Transform.getOrNull(entities.hostEntity)
        if (parentTransform != null) {
          Transform.createOrReplace(entities.indicatorEntity, parentTransform)
        }
      }
    }
  }

  updateIndicators(): void {
    const missingPlayers = new Set(Object.keys(this.indicatorEntities))
    for (const [entity, data] of engine.getEntitiesWith(PlayerIdentityData)) {
      missingPlayers.delete(data.address)
      if (this.playerController.isHost(data.address)) {
        this.createIndicatorIfNotExists(entity, data.address)
      } else {
        this.deleteIndicatorIfExists(data.address)
      }
    }

    for (const id of missingPlayers) {
      this.indicatorEntities.delete(id)
    }
  }

  deleteIndicatorIfExists(address: string): void {
    const entities = this.indicatorEntities.get(address)
    if (entities !== undefined) {
      this.indicatorEntities.delete(address)
      engine.removeEntityWithChildren(entities.indicatorEntity)
    }
  }

  createIndicatorIfNotExists(entity: Entity, address: string): void {
    withPlayerInfo((player) => {
      const isLocal = player.userId === address
      if (!this.indicatorEntities.has(address)) {
        this.indicatorEntities.set(address, {
          hostEntity: entity,
          indicatorEntity: createHostTarget(entity, isLocal),
          isLocal
        })
      }
    })
  }
}

function createHostTarget(parent: Entity, isLocal: boolean): Entity {
  const container = engine.addEntity()
  const hostTarget = engine.addEntity()
  const hostTargetText = engine.addEntity()

  Transform.create(container, isLocal ? { parent } : {})

  Transform.create(hostTarget, {
    scale: Vector3.create(34, 34, 34),
    parent: container
  })
  Transform.create(hostTargetText, {
    position: Vector3.create(0, 2.3, 0),
    parent: container
  })
  TextShape.create(hostTargetText, {
    text: 'HOST',
    fontSize: 1,
    textColor: Color4.create(1, 0.84, 0, 1)
  })
  Billboard.create(hostTargetText)
  GltfContainer.create(hostTarget, { src: 'assets/models/target_position.glb' })

  return container
}
