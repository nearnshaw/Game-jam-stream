import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'

import { getScaleFactor } from '../canvas/Canvas'
import { Color4 } from '@dcl/sdk/math'
import { type GameController } from '../controllers/game.controller'
import { ModalButtonsContainer, ModalWindow } from './components/modalWindow'
import { ModalTitle } from './components/modalTitle'
import { useInteractive } from './hooks/useInteractive'

type ButtonsType = 'none' | 'poll' | 'rating' | 'q&a' | 'quiz'

export class ChooseActivityUI {
  public chooseActivityUiVisibility: boolean = false
  public gameController: GameController
  public buttonSelected: ButtonsType = 'none'
  public hoveredButton: ButtonsType | null = null
  constructor(gameController: GameController) {
    this.gameController = gameController
  }

  openUI(): void {
    this.chooseActivityUiVisibility = true
  }

  createChooseActivityUi(): ReactEcs.JSX.Element | null {
    if (this.gameController.uiController.canvasInfo === null) return null
    const buttonData: Array<{ id: ButtonsType; label: string; icon: string }> = [
      { id: 'poll', label: 'Poll', icon: 'icon_poll.png' },
      { id: 'rating', label: 'Rating', icon: 'icon_rating.png' },
      { id: 'q&a', label: 'Q&A', icon: 'icon_q&a.png' },
      { id: 'quiz', label: 'Quiz Game', icon: 'icon_quiz.png' }
    ]
    return (
      <ModalWindow
        visible={this.chooseActivityUiVisibility}
        onClosePressed={() => {
          this.chooseActivityUiVisibility = false
        }}
        uiBackground={{
          texture: {
            src: 'assets/scene/Images/team-hub/ui/dark_background.png'
          }
        }}
      >
        <ModalTitle value={`<b>Choose your \n activity</b>`}></ModalTitle>
        <ModalButtonsContainer
          uiTransform={{
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            width: '100%',
            position: { top: '28px' },
            positionType: 'absolute'
          }}
        >
          {buttonData.map(({ id, label, icon }) => (
            <ChooseActivityButton
              key={`activity-${id}`}
              id={id}
              label={label}
              icon={icon}
              onClick={() => {
                this.selectButton(id)
              }}
              isDisabled={id === 'quiz'}
            />
          ))}
        </ModalButtonsContainer>
      </ModalWindow>
    )
  }

  selectButton(id: ButtonsType): void {
    this.buttonSelected = id

    this.executeSelectedAction()
  }

  executeSelectedAction(): void {
    switch (this.buttonSelected) {
      case 'poll':
        this.chooseActivityUiVisibility = false
        this.gameController.choosePollUI.choosePollUiVisibility = true
        break
      case 'rating':
        this.chooseActivityUiVisibility = false
        this.gameController.createSurveyUI.isVisible = true
        break
      case 'q&a':
        this.chooseActivityUiVisibility = false
        this.gameController.createQAUI.isVisible = true
        // this.gameController.workInProgressUI.isVisible = true
        break
      case 'quiz':
        this.chooseActivityUiVisibility = false
        // this.gameController.workInProgressUI.isVisible = true
        this.gameController.workInProgressUI.isVisible = true

        break
      default:
        break
    }
  }
}

function ChooseActivityButton(props: {
  key?: string
  id: ButtonsType
  label: string
  icon: string
  onClick: () => void
  isDisabled?: boolean
}): ReactEcs.JSX.Element {
  const [callbacks, isHovering] = useInteractive(props.onClick)

  const backgroundColor =
    (props.isDisabled ?? false)
      ? Color4.fromHexString('#303030ff')
      : isHovering
        ? Color4.fromHexString('#FF2D55') // hover
        : Color4.fromHexString('#303030ff') // default

  return (
    <UiEntity
      {...callbacks}
      uiTransform={{
        flexDirection: 'row',
        alignItems: 'center',
        width: 280 * getScaleFactor(),
        height: 70 * getScaleFactor(),
        margin: { top: 15 },
        borderRadius: 10,
        position: 'relative' as any
      }}
      uiBackground={{ color: backgroundColor }}
    >
      {/* Icono */}
      <UiEntity
        uiTransform={{
          width: 37.73 * getScaleFactor(),
          height: 27.5 * getScaleFactor(),
          position: { left: '5%', top: 0 }
        }}
        uiBackground={{
          textureMode: 'stretch',
          texture: { src: `assets/scene/Images/team-hub/activitiesui/${props.icon}` },
          color: (props.isDisabled ?? false) ? Color4.fromHexString('#aaaaaa') : Color4.White()
        }}
      />

      <Label
        uiTransform={{
          flexGrow: 1,
          height: '100%',
          position: { left: '10%', bottom: '0%' }
        }}
        value={props.label}
        fontSize={25 * getScaleFactor()}
        color={(props.isDisabled ?? false) ? Color4.fromHexString('#cccccc') : Color4.White()}
      />

      <UiEntity
        uiTransform={{
          width: 8.33 * getScaleFactor(),
          height: 15 * getScaleFactor(),
          margin: { right: '7%' }
        }}
        uiBackground={{
          textureMode: 'stretch',
          texture: { src: 'assets/scene/Images/team-hub/activitiesui/arrow_right.png' },
          color: (props.isDisabled ?? false) ? Color4.fromHexString('#aaaaaa') : Color4.White()
        }}
      />

      {(props.isDisabled ?? false) && (
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { top: 0, left: 0 },
            width: '100%',
            height: '100%',
            borderRadius: 10
          }}
          uiBackground={{ color: Color4.create(0, 0, 0, 0.5) }}
        />
      )}
    </UiEntity>
  )
}
