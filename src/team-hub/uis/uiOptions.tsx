import ReactEcs, { type Callback, Label, UiEntity } from '@dcl/sdk/react-ecs'

import { getScaleFactor } from '../canvas/Canvas'
import { type GameController } from '../controllers/game.controller'
import { ModalButton } from './components/buttons'
import { ModalTitle } from './components/modalTitle'
import { ModalButtonsContainer, ModalWindow } from './components/modalWindow'
import { useInteractive } from './hooks/useInteractive'
import { DCLColors } from './themes/themes'

function OptionButton(props: {
  index: number
  text: string
  selected: boolean
  onClick: Callback
}): ReactEcs.JSX.Element {
  const [callbacks, isHovering, isPressed] = useInteractive(props.onClick)
  return (
    <UiEntity
      key={props.index}
      uiTransform={{
        width: 160 * getScaleFactor(),
        height: 62.5 * getScaleFactor(),
        justifyContent: 'center',
        padding: { bottom: 10 * getScaleFactor() },
        margin: { bottom: 10 * getScaleFactor() }
      }}
      uiBackground={{
        texture: { src: 'assets/scene/Images/team-hub/ui/poll_option_background.png' },
        textureMode: 'nine-slices',
        textureSlices: { bottom: 0, top: 0, left: 0, right: 0 }
      }}
      {...callbacks}
    >
      <UiEntity
        uiBackground={{
          texture: { src: 'assets/scene/Images/team-hub/ui/poll_option_selected_background.png' },
          textureMode: 'nine-slices',
          textureSlices: { bottom: 0, top: 0, left: 0, right: 0 }
        }}
        uiTransform={{
          width: '108%',
          height: '108%',
          positionType: 'absolute',
          display: props.selected || isPressed ? 'flex' : 'none',
          margin: { top: -1 * getScaleFactor() }
        }}
      ></UiEntity>
      <UiEntity
        uiBackground={{ color: DCLColors.BUTTON }}
        uiTransform={{
          width: '105%',
          height: 60 * getScaleFactor(),
          positionType: 'absolute',
          borderRadius: 25 * getScaleFactor(),
          position: { top: -3 * getScaleFactor() },
          display: isHovering && !isPressed && !props.selected ? 'flex' : 'none'
        }}
      ></UiEntity>

      <Label value={`<b>${props.text}</b>`} fontSize={16 * getScaleFactor()}></Label>
    </UiEntity>
  )
}

export class OptionsUI {
  public optionsUiVisibility: boolean = false
  public pollQuestion = ''
  private options: string[] = []
  private onOption: ((option: string) => void) | null = null

  private selectedIndex: number | null = null

  public gameController: GameController
  constructor(gameController: GameController) {
    this.gameController = gameController
  }

  openUI(question: string, options: string[], onOption: (option: string) => void): void {
    this.gameController.uiController.closeAllUis()
    this.optionsUiVisibility = true
    this.pollQuestion = question
    this.options = options
    this.onOption = onOption
  }

  createUi(): ReactEcs.JSX.Element | null {
    if (this.gameController.uiController.canvasInfo === null) return null

    return (
      <ModalWindow visible={this.optionsUiVisibility} onClosePressed={() => (this.optionsUiVisibility = false)}>
        <ModalTitle value={`<b>${this.pollQuestion}</b>`}></ModalTitle>
        <UiEntity
          uiTransform={{
            flexDirection: 'column',
            width: '100%',
            height: 320 * getScaleFactor(),
            alignItems: 'center',
            margin: { top: 30 * getScaleFactor() }
          }}
        >
          {this.options.map((option, i) => (
            <OptionButton
              key={`poll-option-${i}-${option}`}
              text={option}
              index={i}
              selected={this.selectedIndex === i}
              onClick={() => (this.selectedIndex = i)}
            ></OptionButton>
          ))}
        </UiEntity>
        <ModalButtonsContainer>
          <ModalButton
            text="Vote"
            onClick={() => {
              if (this.selectedIndex !== null && this.onOption != null) {
                const selectedOption = this.options[this.selectedIndex]
                this.onOption(selectedOption)
                this.optionsUiVisibility = false
              }
            }}
            isDisabled={this.selectedIndex === null}
          ></ModalButton>
        </ModalButtonsContainer>
      </ModalWindow>
    )
  }
}
