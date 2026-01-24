import { Color4 } from '@dcl/sdk/math'
import ReactEcs, { type Callback, type EntityPropTypes, Label, UiEntity } from '@dcl/sdk/react-ecs'
import { merge } from 'ts-deepmerge'
import { getCurrentActivity } from '../activities/activitiesEntity'
import { getScaleFactor } from '../canvas/Canvas'
import { type GameController } from '../controllers/game.controller'
import { ModalTitle } from './components/modalTitle'
import { ModalWindow } from './components/modalWindow'
import { useInteractive } from './hooks/useInteractive'
import { DCLColors } from './themes/themes'

export class MainMenuUi {
  gameController: GameController
  public isVisible: boolean = false

  constructor(gameController: GameController) {
    this.gameController = gameController
  }

  create(): ReactEcs.JSX.Element {
    return <MainMenu gameController={this.gameController} isVisible={this.isVisible} />
  }
}

type HomeButtonProps = {
  text: string
  icon: string
  small?: boolean
  onClick?: Callback
} & EntityPropTypes

const HomeButton = (props: HomeButtonProps): ReactEcs.JSX.Element => {
  const { text, icon, small, onClick, ...rest } = props
  const [callbacks, isHovering, isPressed] = useInteractive(onClick, rest)

  const isSmall = small ?? false
  const finalProps = merge(
    {
      uiTransform: {
        width: isSmall ? '49%' : '100%',
        height: 75 * getScaleFactor(),
        margin: { bottom: 10 * getScaleFactor() },
        padding: {
          bottom: 10 * getScaleFactor(),
          left: isSmall ? 40 * getScaleFactor() : 0
        },
        justifyContent: 'center',
        alignItems: 'center'
      },
      uiBackground: {
        texture: {
          src: isSmall ? 'assets/scene/Images/team-hub/ui/home_button_background_small.png' : 'assets/scene/Images/team-hub/ui/home_button_background_large.png'
        },
        textureMode: 'nine-slices',
        textureSlices: { bottom: 0, top: 0, left: 0, right: 0 }
      }
    } satisfies EntityPropTypes,
    rest,
    callbacks
  )
  return (
    <UiEntity {...finalProps}>
      <UiEntity
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        uiBackground={{
          color: isPressed ? Color4.multiply(DCLColors.BUTTON, Color4.Gray()) : DCLColors.BUTTON
        }}
        uiTransform={{
          positionType: 'absolute',
          width: '108%',
          height: '108%',
          display: isHovering ? 'flex' : 'none',
          borderRadius: 10 * getScaleFactor(),
          position: { top: '-8%' }
        }}
      ></UiEntity>
      <UiEntity
        uiBackground={{
          texture: { src: `assets/scene/Images/team-hub/ui/${icon}.png` },
          textureMode: 'stretch'
        }}
        uiTransform={{
          width: 35 * getScaleFactor(),
          height: 35 * getScaleFactor(),
          positionType: 'absolute',
          position: {
            top: '50%',
            left: (isSmall ? 10 : 20) * getScaleFactor()
          },
          margin: { top: -20.5 * getScaleFactor() }
        }}
      ></UiEntity>
      <Label value={isSmall ? text : `<b>${text}</b>`} fontSize={(isSmall ? 16 : 20) * getScaleFactor()}></Label>
      {!isSmall && (
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { right: 20 * getScaleFactor(), top: '50%' },
            margin: { top: -11.5 * getScaleFactor() },
            width: 10 * getScaleFactor(),
            height: 15.6 * getScaleFactor()
          }}
          uiBackground={{
            textureMode: 'stretch',
            texture: { src: 'assets/scene/Images/team-hub/ui/arrow_right.png' }
          }}
        />
      )}
    </UiEntity>
  )
}

function startActivity(gameController: GameController, isThereAnActivityOpen: boolean): void {
  gameController.mainMenuUI.isVisible = false
  if (isThereAnActivityOpen) {
    gameController.popupAtendeePanelAndResultbutton.showResultsFromCurrentActivity()
  } else {
    gameController.activitiesUI.chooseActivityUiVisibility = true
  }
}

function startScreenSharing(gameController: GameController): void {
  gameController.mainMenuUI.isVisible = false
  gameController.workInProgressUI.isVisible = true
}

function startCustomizeAuditorium(gameController: GameController): void {
  gameController.mainMenuUI.isVisible = false
  gameController.customizationUI.isVisible = true
}

function startModerationTools(gameController: GameController): void {
  gameController.mainMenuUI.isVisible = false
  gameController.newModerationPanel.panelVisible = true
}

const MainMenu = (props: { gameController: GameController; isVisible: boolean }): ReactEcs.JSX.Element => {
  const isThereAnActivityOpen = getCurrentActivity(props.gameController.activitiesEntity)?.state?.closed === false

  return (
    <ModalWindow
      uiTransform={{
        width: 445 * getScaleFactor(),
        height: 500 * getScaleFactor()
      }}
      visible={props.isVisible}
      uiBackground={{ texture: { src: 'assets/scene/Images/team-hub/ui/home_background.png' } }}
      contentContainerProps={{
        uiTransform: { padding: 65 * getScaleFactor() }
      }}
      onClosePressed={() => {
        props.gameController.mainMenuUI.isVisible = false
      }}
    >
      <ModalTitle
        value="<b>Welcome to TeamHub!</b>"
        fontSize={30 * getScaleFactor()}
        uiTransform={{
          height: 'auto',
          margin: { bottom: 20 * getScaleFactor() }
        }}
      ></ModalTitle>
      <UiEntity uiTransform={{ flexDirection: 'column', width: '100%', height: 'auto' }}>
        <HomeButton
          icon="start_activity_icon"
          text={isThereAnActivityOpen ? 'See Current\nActivity' : 'Start Activity'}
          onClick={() => {
            startActivity(props.gameController, isThereAnActivityOpen)
          }}
        ></HomeButton>
        <HomeButton
          icon="screen_sharing_icon"
          text={'Screen Sharing'}
          onClick={() => {
            startScreenSharing(props.gameController)
          }}
        ></HomeButton>
        <UiEntity
          uiTransform={{
            width: '100%',
            height: 'auto',
            flexDirection: 'row',
            justifyContent: 'space-between'
          }}
        >
          <HomeButton
            icon="moderation_tools_home_icon"
            text="Moderation Tools"
            small
            onClick={() => {
              startModerationTools(props.gameController)
            }}
          ></HomeButton>
          <HomeButton
            icon="customize_auditorium_icon"
            text="Customize Auditorium"
            small
            onClick={() => {
              startCustomizeAuditorium(props.gameController)
            }}
          ></HomeButton>
        </UiEntity>
      </UiEntity>
    </ModalWindow>
  )
}
