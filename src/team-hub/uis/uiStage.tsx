import { engine, MeshCollider, type Entity } from '@dcl/sdk/ecs'
import { type GameController } from '../controllers/game.controller'
import { withPlayerInfo } from '../utils'

export class StageUI {
  public hostTarget = engine.addEntity()
  public hostTargetText = engine.addEntity()
  public gameController: GameController
  public stageUiVisibility: boolean = false
  playerSelected: string = ''

  private readonly stageWall: Entity | null = null
  private readonly stageWallColliderComponent: ReturnType<typeof MeshCollider.get> | null = null

  constructor(gameController: GameController) {
    this.gameController = gameController
    const foundStageWall = engine.getEntityOrNullByName('StageWall')
    if (foundStageWall != null) {
      this.stageWall = foundStageWall
      try {
        
        this.stageWallColliderComponent = MeshCollider.get(this.stageWall)
      } catch (e) {
        
        console.log('StageWall does not have MeshCollider at start:', e)
        this.stageWallColliderComponent = null
      }
    } else {
      console.log('StageUI: "StageWall" not found)')
    }

    this.gameController.playerController.onHostChange((newHosts) => {
      this.checkPlayerAccess(newHosts)
    })

    this.checkPlayerAccess(this.gameController.playerController.getHosts())
  }

  checkPlayerAccess(hosts: string[] | undefined): void {
    withPlayerInfo((player) => {
      const isHost = this.gameController.playerController.isHost(player.userId, hosts)
      const noHosts = hosts == null || hosts.length === 0

      if (noHosts || isHost) {
        this.unlockAccessToStage()
      } else {
        this.lockAccessToStage()
      }
    })
  }

  lockAccessToStage(): void {
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (!this.stageWall || !this.stageWallColliderComponent) {
      console.log('StageUI.lockAccessToStage: stageWall o collider no definidos, no se bloquea el escenario')
      return
    }
    let i = 0
    engine.addSystem(
      () => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        MeshCollider.createOrReplace(this.stageWall!, this.stageWallColliderComponent!)
        i++
        if (i > 2) {
          engine.removeSystem('hackToEnsureColliderIsAdded')
        }
      },
      0,
      'hackToEnsureColliderIsAdded'
    )
  }

  unlockAccessToStage(): void {
    if (this.stageWall == null) {
      console.log('StageUI.unlockAccessToStage: stageWall no definido, nada que desbloquear')
      return
    }

    MeshCollider.deleteFrom(this.stageWall)
  }

  addAsHost(userID: string): void {
    if (userID === undefined) return
    this.gameController.playerController.setHost(userID, true)
  }
}
