import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'

import { getScaleFactor } from '../canvas/Canvas'
import { Color4 } from '@dcl/sdk/math'
import { type GameController } from '../controllers/game.controller'
import { ModalButtonsContainer, ModalWindow } from './components/modalWindow'
import { ModalTitle } from './components/modalTitle'
import { useInteractive } from './hooks/useInteractive'

type ButtonsType = 'none' | 'multiple_choice' | 'zone_poll' | 'open_text' | 'emote_poll'

export class ChoosePollUI {
  public choosePollUiVisibility: boolean = false
  public gameController: GameController

  public buttonSelected: ButtonsType = 'none'
  constructor(gameController: GameController) {
    this.gameController = gameController
  }

  openUI(): void {
    this.choosePollUiVisibility = true
  }

  createChoosePollUi(): ReactEcs.JSX.Element | null {
    if (this.gameController.uiController.canvasInfo === null) return null
    const buttonData: Array<{ id: ButtonsType; label: string; icon: string }> = [
      {
        id: 'multiple_choice',
        label: 'Multiple Choice',
        icon: 'icon_multiple_choice.png'
      },
      { id: 'zone_poll', label: 'Zone Poll', icon: 'icon_zone_poll.png' },
      { id: 'open_text', label: 'Open Text', icon: 'icon_open_text.png' },
      { id: 'emote_poll', label: 'Emote Poll', icon: 'icon_emote_poll.png' }
    ]

    return (
      <ModalWindow
        visible={this.choosePollUiVisibility}
        onClosePressed={() => {
          this.choosePollUiVisibility = false
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
            <ChoosePollActivityButton
              key={`choose-poll-${id}`}
              id={id}
              label={label}
              icon={icon}
              onClick={() => {
                this.selectButton(id)
              }}
              isDisabled={id === 'open_text' || id === 'emote_poll'}
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
      case 'multiple_choice':
        this.choosePollUiVisibility = false
        this.gameController.createPollUI.createPollUiVisibility = true

        break
      case 'zone_poll':
        this.choosePollUiVisibility = false
        this.gameController.createZonePollUI.createZonePollUiVisibility = true
        break
      case 'open_text':
        this.choosePollUiVisibility = false
        this.gameController.workInProgressUI.isVisible = true
        break
      case 'emote_poll':
        this.choosePollUiVisibility = false
        this.gameController.workInProgressUI.isVisible = true
        break
      default:
        break
    }
  }
}

function ChoosePollActivityButton(props: {
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
        ? Color4.fromHexString('#FF2D55')
        : Color4.fromHexString('#303030ff')

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
      <UiEntity
        uiTransform={{
          width: 37.73 * getScaleFactor(),
          height: 27.5 * getScaleFactor(),
          position: { left: '5%', top: 0 }
        }}
        uiBackground={{
          textureMode: 'stretch',
          texture: { src: `assets/scene/Images/team-hub/choosepollui/${props.icon}` },
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
        fontSize={22 * getScaleFactor()}
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
