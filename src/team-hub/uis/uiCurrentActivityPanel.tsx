import { Color4 } from '@dcl/sdk/math'
import ReactEcs, { type EntityPropTypes, Label, UiEntity } from '@dcl/sdk/react-ecs'
import {
  type ActivityResult,
  ActivityType,
  closeCurrentActivity,
  getCurrentActivity,
  listenToActivities,
  onCurrentActivityClosed
} from '../activities/activitiesEntity'
import { type GameController } from '../controllers/game.controller'
import { easeOutCubic, withPlayerInfo } from '../utils'
import { pushSyncedMessage } from '../messagebus/messagebus'
import { DCLColors, primaryTheme, type UiTheme } from './themes/themes'
import { scaledSize } from '../canvas/Canvas'
import { Column, Row } from './components/flexOrganizers'
import { PollState } from '../polls/pollEntity'
import { ZonePollState } from '../zonePolls/pollEntity'
import { SurveyState } from '../surveys/surveyEntity'
import { useInteractive } from './hooks/useInteractive'
import { getPlayer } from '@dcl/sdk/players'
import { ModalButtonsContainer, ModalWindow } from './components/modalWindow'
import { ModalTitle } from './components/modalTitle'
import { ModalButton } from './components/buttons'
import { engine } from '@dcl/sdk/ecs'
import { QAState } from '../qa/qaEntity'

const CurrentActivityPanelButton = (
  props: {
    text: string
    onClick: () => void
    theme: UiTheme
    visible: boolean
    animationProgress: number
  } & EntityPropTypes
): ReactEcs.JSX.Element => {
  const [callbacks, isHovering] = useInteractive(props.onClick, props)

  const backgroundColor = isHovering
    ? Color4.fromHexString('#FF2D55') // hover
    : Color4.fromHexString('#303030ff') // default

  return (
    <UiEntity
      uiTransform={{
        ...props.theme.primaryButtonTransform,
        width: '90%',
        height: scaledSize(40 * props.animationProgress),
        margin: {
          right: scaledSize(10 * props.animationProgress),
          left: scaledSize(10 * props.animationProgress),
          top: scaledSize(5 * props.animationProgress),
          bottom: scaledSize(5 * props.animationProgress)
        },
        positionType: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
        display: props.visible ? 'flex' : 'none'
      }}
      uiBackground={{ color: backgroundColor }}
      {...callbacks}
    >
      <UiEntity
        uiTransform={{
          width: '100%',
          height: '100%',
          justifyContent: 'center',
          alignItems: 'center'
        }}
        uiText={{
          value: `<b>${props.text}</b>`,
          fontSize: (props.theme.buttonFontSize / 1.75) * props.animationProgress,
          color: Color4.White(),
          textAlign: 'middle-center'
        }}
      />
    </UiEntity>
  )
}

export class CurrentActivityPanelUI {
  private _isVisible: boolean = true

  public get isVisible(): boolean {
    return this._isVisible
  }

  public set isVisible(value: boolean) {
    const valueChanged = this._isVisible !== value
    this._isVisible = value
    if (valueChanged) {
      this.animationElapsed = 0.0
      this.votingBarProgress = 0.0
    }
  }

  public gameController: GameController

  private playerIsHost: boolean = false
  private hasVoted: boolean = false
  private areResultsOpen: boolean = false
  private activityTitle: string = ''
  public closingActivityModalShown: boolean = false
  private votesCasted: number = 0
  private totalVotesPossible: number = 1
  private votingBarProgress: number = 0.0

  private animationElapsed: number = 0.0
  private readonly ANIMATION_DURATION: number = 0.5

  constructor(gameController: GameController) {
    this.gameController = gameController
    gameController.playerController.onHostChange((_hosts) => {
      this.updateVisibility()
    })
    listenToActivities(this.gameController.activitiesEntity, (_activity) => {
      this.updateVisibility()
      this.animationElapsed = 0.0
      this.votingBarProgress = 0.0
    })
    onCurrentActivityClosed(this.gameController.activitiesEntity, (_activity) => {
      this.updateVisibility()
    })
    engine.addSystem((dt) => {
      if (this.isVisible && this.animationElapsed < this.ANIMATION_DURATION) {
        this.animationElapsed += dt
      }
      const targetProgress = this.votesCasted / this.totalVotesPossible
      if (this.isVisible && Math.abs(this.votingBarProgress - targetProgress) > 0.01) {
        const easeOutValue = easeOutCubic(targetProgress - this.votingBarProgress)
        this.votingBarProgress += easeOutValue * dt
      } else {
        this.votingBarProgress = targetProgress
      }
    })
  }

  updateVisibility(): void {
    withPlayerInfo((player) => {
      this.playerIsHost = this.gameController.playerController.isHost(player.userId)
    })
    this.isVisible = this.canShow(getCurrentActivity(this.gameController.activitiesEntity))
  }

  private canShow(activity?: ActivityResult): activity is ActivityResult {
    if (activity === undefined) {
      return false
    }

    return true
  }

  private openQueueForCurrentQA(): void {
    const activity = getCurrentActivity(this.gameController.activitiesEntity)
    if (activity == null || activity.type !== ActivityType.QA) return
    const qa = QAState.getOrNull(activity.entity)
    this.gameController.uiController.closeAllUis()
    this.gameController.uiQaQueue.open(qa?.title ?? '', qa ?? undefined)
    // this.gameController.uiQaDebug.show()
  }

  showCurrentResults(): void {
    const activity = getCurrentActivity(this.gameController.activitiesEntity)
    if (this.canShow(activity)) {
      pushSyncedMessage('showCurrentActivityResults', {})
    }
  }

  createUi(): ReactEcs.JSX.Element | null {
    if (!this.isVisible) return null

    const activity = getCurrentActivity(this.gameController.activitiesEntity)
    const activityIsClosed = activity?.state.closed ?? false
    const playerId = getPlayer()?.userId

    switch (activity?.type) {
      case ActivityType.ZONEPOLL:
        this.activityTitle = ZonePollState.get(activity.entity).question
        this.hasVoted = false
        this.votesCasted = ZonePollState.get(activity.entity).zoneCounts.reduce((a, b) => a + b, 0)
        break
      case ActivityType.POLL:
        this.activityTitle = PollState.get(activity.entity).question
        this.hasVoted =
          playerId != null && PollState.get(activity.entity).votes.some((vote) => vote.userId === playerId)
        this.votesCasted = PollState.get(activity.entity).votes.length
        break
      case ActivityType.SURVEY:
        this.activityTitle = SurveyState.get(activity.entity).question
        this.hasVoted = playerId != null && SurveyState.get(activity.entity).userIdsThatVoted.includes(playerId)
        this.votesCasted = SurveyState.get(activity.entity).userIdsThatVoted.length
        break

      case ActivityType.QA: {
        const qa = QAState.get(activity.entity)
        this.activityTitle = qa.title
        // REVIEW BECAUSE WE DONT CARE IF ALREADY PARTICIPATED
        // this.hasVoted = !!(playerId != null && !qa.anonymous && qa.questions.some((q) => q.userId === playerId))
        // this.votesCasted = qa.questions.length
        break
      }
    }

    this.totalVotesPossible = this.gameController.playerController.getAllPlayers().length
    this.areResultsOpen = this.gameController.popupAtendeePanelAndResultbutton.areResultsFromCurrentActivityOpen()
    const activityIsAnOpenZonePoll = activity?.type === ActivityType.ZONEPOLL && !activityIsClosed

    if (activity === undefined) return null

    const theme = primaryTheme

    const animationProgress = easeOutCubic(Math.max(Math.min(this.animationElapsed / this.ANIMATION_DURATION, 1.0), 0))
    const primaryActionText = (() => {
      switch (activity?.type) {
        case ActivityType.QA:
          return 'Ask'
        case ActivityType.POLL:
        case ActivityType.SURVEY:
          return this.hasVoted ? 'Change Vote' : 'Vote'
        case ActivityType.ZONEPOLL:
          return 'Vote'
        default:
          return 'Open'
      }
    })()

    const secondaryActionText = (() => {
      if (activity?.type === ActivityType.QA) {
        return this.areResultsOpen ? 'Hide Questions' : 'See Questions'
      }
      return this.areResultsOpen ? 'Hide Results' : 'See Results'
    })()

    const showSecondaryForThisActivity =
      activity?.type === ActivityType.QA
        ? activityIsClosed
        : activityIsClosed || (this.playerIsHost && !activityIsAnOpenZonePoll)

    return (
      <UiEntity
        uiTransform={{
          positionType: 'absolute',
          width: '100%',
          height: '100%'
        }}
      >
        <ModalWindow
          visible={this.closingActivityModalShown}
          onClosePressed={() => {
            this.closingActivityModalShown = false
          }}
        >
          <Column>
            <ModalTitle value="<b>Close Activity</b>" />
            <Label
              uiTransform={{
                width: '100%',
                height: scaledSize(20),
                margin: { bottom: scaledSize(25) },
                position: { top: '25%' }
              }}
              fontSize={primaryTheme.smallFontSize}
              textAlign="middle-center"
              value="Are you sure you want to close this activity? Other users won't be able to participate anymore."
            />
            <ModalButtonsContainer uiTransform={{ justifyContent: 'space-between' }}>
              <ModalButton
                text="Close"
                onClick={() => {
                  console.log('close ui')
                  this.gameController.uiController.closeAllUis()
                  closeCurrentActivity(this.gameController.activitiesEntity)
                }}
              />
              <ModalButton
                text="Cancel"
                onClick={() => {
                  this.closingActivityModalShown = false
                }}
              />
            </ModalButtonsContainer>
          </Column>
        </ModalWindow>
        <UiEntity
          uiTransform={{
            width: scaledSize(180),
            height: 'auto',
            positionType: 'absolute',
            position: { top: 180, right: 0 },
            margin: { right: scaledSize(3) },
            display: 'flex',
            pointerFilter: 'block'
          }}
          uiBackground={{
            texture: { src: 'assets/scene/Images/team-hub/activityPanelUi/background.png' },
            textureMode: 'stretch'
          }}
        >
          <Column
            uiTransform={{
              justifyContent: 'space-around',
              alignItems: 'center'
            }}
          >
            <Label
              uiTransform={{
                width: 'auto',
                height: scaledSize(30 * animationProgress),
                margin: scaledSize(30 * animationProgress),
                positionType: 'relative',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}
              fontSize={theme.titleFontSize / 2.0}
              value={this.activityTitle.length > 50 ? this.activityTitle.slice(0, 50) + '...' : this.activityTitle}
            />
            {activity?.type !== ActivityType.QA && (
              <Row
                uiTransform={{
                  width: '90%',
                  height: scaledSize(18 * animationProgress),
                  margin: { left: scaledSize(15 * animationProgress) }
                }}
              >
                <UiEntity
                  uiTransform={{
                    width: '100%',
                    height: '100%',
                    borderRadius: scaledSize(5 * animationProgress)
                  }}
                  uiBackground={{ color: DCLColors.SILVER }}
                >
                  <UiEntity
                    uiTransform={{
                      width: `${this.votingBarProgress * 100}%`,
                      height: '100%',
                      borderRadius: scaledSize(5 * animationProgress)
                    }}
                    uiBackground={{ color: DCLColors.RUBY }}
                  />
                </UiEntity>
                <Label
                  uiTransform={{
                    width: scaledSize(45 * animationProgress),
                    height: '100%',
                    positionType: 'relative',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}
                  textAlign="middle-center"
                  fontSize={(theme.smallFontSize / 1.5) * animationProgress}
                  color={Color4.Gray()}
                  value={`${this.votesCasted}/${this.totalVotesPossible}`}
                />
              </Row>
            )}
            <Column
              uiTransform={{
                justifyContent: 'space-around',
                alignItems: 'center'
              }}
            >
              <CurrentActivityPanelButton
                text={primaryActionText}
                onClick={() => {
                  if (activity?.type === ActivityType.QA) {
                    this.openQueueForCurrentQA()
                    return
                  }
                  this.gameController.popupAtendeePanelAndResultbutton.runCurrentActivityAsAttendee()
                }}
                theme={theme}
                visible={!activityIsClosed && !activityIsAnOpenZonePoll}
                animationProgress={animationProgress}
              />
              <Row uiTransform={{ height: 'auto' }}>
                <CurrentActivityPanelButton
                  text={secondaryActionText}
                  onClick={() => {
                    this.gameController.uiController.closeAllUis()
                    if (this.areResultsOpen) {
                      this.gameController.popupAtendeePanelAndResultbutton.hideResultsFromCurrentActivity()
                    } else {
                      this.gameController.popupAtendeePanelAndResultbutton.showResultsFromCurrentActivity()
                    }
                  }}
                  theme={theme}
                  visible={showSecondaryForThisActivity}
                  animationProgress={animationProgress}
                />
                <CurrentActivityPanelButton
                  text={activityIsClosed ? 'Closed' : 'Close'}
                  onClick={() => {
                    this.gameController.uiController.closeAllUis()
                    this.gameController.zonePollQuestionUI.visible = activityIsAnOpenZonePoll
                    this.gameController.timerUI.visible = activityIsAnOpenZonePoll
                    this.closingActivityModalShown = true
                  }}
                  theme={theme}
                  visible={this.playerIsHost && !activityIsClosed}
                  animationProgress={animationProgress}
                />
              </Row>
            </Column>
          </Column>
        </UiEntity>
      </UiEntity>
    )
  }
}
