// Temporary UI to show when a feature is not implemented

import ReactEcs, { UiEntity, Label, type EntityPropTypes, Button } from '@dcl/sdk/react-ecs'
import { primaryTheme } from './themes/themes'
import { type GameController } from '../controllers/game.controller'

export class WorkInProgressUI {
  public isVisible: boolean = false
  public gameController: GameController

  constructor(gameController: GameController) {
    this.gameController = gameController
  }

  create(): ReactEcs.JSX.Element {
    return (
      <WorkInProgress
        gameController={this.gameController}
        uiTransform={{ display: this.isVisible ? 'flex' : 'none' }}
      />
    )
  }
}

const WorkInProgress = (props: EntityPropTypes & { gameController: GameController }): ReactEcs.JSX.Element => {
  return (
    <UiEntity
      uiTransform={{
        ...primaryTheme.uiTransform,
        width: '25%',
        height: '25%',
        alignSelf: 'center',
        position: { left: '37.5%' },
        flexDirection: 'column',
        ...props.uiTransform
      }}
      uiBackground={primaryTheme.uiBackground}
    >
      <Label
        uiTransform={{ width: '100%', height: '50%' }}
        value="Work In Progress"
        fontSize={primaryTheme.fontSize}
        textAlign="middle-center"
      />
      <Button
        uiTransform={{
          ...primaryTheme.primaryButtonTransform,
          alignSelf: 'center',
          width: 'auto',
          height: 'auto'
        }}
        value="Okay"
        fontSize={primaryTheme.fontSize}
        uiBackground={primaryTheme.primaryButtonBackground}
        textAlign="middle-center"
        onMouseDown={() => {
          props.gameController.workInProgressUI.isVisible = false
        }}
      />
    </UiEntity>
  )
}
