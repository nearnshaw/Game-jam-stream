import { movePlayerTo } from '~system/RestrictedActions'

import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { Color4, Vector3 } from '@dcl/sdk/math'
import { getPlayer } from '@dcl/sdk/src/players'
import { engine } from '@dcl/sdk/ecs'
import { type GameController } from '../controllers/game.controller'
import { PlayerStateComponent } from '../controllers/player.controller'
import { JAIL_CENTER } from '../jail/jail'

export class KickUI {
  public blackScreenVisibility: boolean = false
  public gameController: GameController
  public wasKicked: boolean = false
  constructor(gameController: GameController) {
    this.gameController = gameController
    engine.addSystem(() => {
      this.updateKickStatus()
    })
  }

  updateKickStatus(): void {
    const player = getPlayer()
    if (player == null) return

    const bannedList = PlayerStateComponent.get(this.gameController.playerController.playerState).banList
    const isBanned = bannedList.includes(player.userId.toLowerCase()) || bannedList.includes(player.name.toLowerCase())

    if (isBanned && !this.wasKicked) {
      void movePlayerTo({ newRelativePosition: JAIL_CENTER })
      this.gameController.uiController.closeAllUis()
      this.blackScreenVisibility = true
      this.wasKicked = true
      this.gameController.removeHostUI.removeHostByUserId(player.userId.toLowerCase())
    }

    if (!isBanned && this.wasKicked) {
      void movePlayerTo({ newRelativePosition: Vector3.create(1, 1, 1) })
      this.blackScreenVisibility = false
      this.wasKicked = false
    }
  }

  createBlackScreen(): ReactEcs.JSX.Element | null {
    if (this.gameController.uiController.canvasInfo === null) return null
    return (
      <UiEntity
        uiTransform={{
          flexDirection: 'row',
          width: this.gameController.uiController.canvasInfo.width,
          height: this.gameController.uiController.canvasInfo.height,
          alignItems: 'center',
          justifyContent: 'center',
          positionType: 'relative',
          position: { bottom: '0%', left: '0%' },
          display: this.blackScreenVisibility ? 'flex' : 'none',
          pointerFilter: 'block'
        }}
        uiBackground={{
          color: Color4.Black()
        }}
      >
        <Label
          uiTransform={{
            positionType: 'relative',
            width: this.gameController.uiController.canvasInfo.height * 0.5,
            height: this.gameController.uiController.canvasInfo.height * 0.5,
            position: { bottom: '0%', left: '0%' }
          }}
          value={'YOU HAVE BEEN EXPULSED FROM THE SCENE'}
          fontSize={30}
          font="sans-serif"
          color={Color4.White()}
          textAlign="bottom-center"
        />
      </UiEntity>
    )
  }
}
