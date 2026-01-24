import * as utils from '@dcl-sdk/utils'
import {
  Animator,
  EasingFunction,
  engine,
  type Entity,
  InputAction,
  PointerEvents,
  pointerEventsSystem,
  Tween
} from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'
import { syncEntity } from '@dcl/sdk/network'
import { type GameController } from '../controllers/game.controller'
import { PollState } from '../polls/pollEntity'
import { PollQuestion } from '../polls/pollQuestionUi'
import { SurveyState } from '../surveys/surveyEntity'
import { SyncEntityEnumId } from '../syncEntities'
import { ActivityType, getCurrentActivity, listenToActivities, onCurrentActivityClosed } from './activitiesEntity'
import { ZonePollState } from '../zonePolls/pollEntity'
import { pushSyncedMessage } from '../messagebus/messagebus'
import { QAState } from '../qa/qaEntity'

export class PopupAttendeePanelAndResultsButton {
  public attendeePanelEntity = engine.getEntityOrNullByName('AttendeePanel')
  public showResultsButtonEntity = engine.getEntityOrNullByName('ShowResultsButton')
  public interactableMonitor: Entity | null = null
  public attendeePanelEntityA: Entity | null = null

  gameController: GameController
  constructor(gameController: GameController) {
    this.gameController = gameController

    listenToActivities(this.gameController.activitiesEntity, (activity) => {
      if (activity !== undefined && activity.type !== ActivityType.ZONEPOLL) {
        this.create()
      }
    })
    onCurrentActivityClosed(this.gameController.activitiesEntity, () => {
      this.remove()
      pushSyncedMessage('showCurrentActivityResults', {})
    })
  }

  popupEntity(entity: Entity | null, endScale: Vector3 = Vector3.One()): void {
    if (entity !== null) {
      Tween.createOrReplace(entity, {
        mode: Tween.Mode.Scale({
          start: Vector3.Zero(),
          end: Vector3.One()
        }),
        duration: 500,
        easingFunction: EasingFunction.EF_EASEINBOUNCE
      })
    }
  }

  create(): void {
    this.interactableMonitor = engine.getEntityOrNullByName('Interactable')
    if (this.interactableMonitor !== null) {
      Animator.playSingleAnimation(this.interactableMonitor, 'attendee_panel_open', false)

      pointerEventsSystem.onPointerDown(
        {
          entity: this.interactableMonitor,
          opts: { button: InputAction.IA_POINTER, hoverText: this.getHoverTextForCurrentActivity() }
        },
        () => {
          this.runCurrentActivityAsAttendee()
        }
      )

      utils.timers.setTimeout(() => {
        if (this.interactableMonitor !== null) {
          Animator.playSingleAnimation(this.interactableMonitor, 'attendee_panel_idle', false)
        }
      }, 800)
    }
    const current = getCurrentActivity(this.gameController.activitiesEntity)
    if (current != null && current.type !== ActivityType.QA) {
      this.runCurrentActivityAsAttendee()
    }
  }

  setupAttendeePanelAndResultsButton(): void {
    this.setAttendeePanelInteractable()
  }

  setAttendeePanelInteractable(): void {
    this.interactableMonitor = engine.getEntityOrNullByName('Interactable')

    if (this.interactableMonitor !== null) {
      syncEntity(
        this.interactableMonitor,
        [Animator.componentId, PointerEvents.componentId],
        SyncEntityEnumId.INTERACTABLE
      )
    }
  }

  runCurrentActivityAsAttendee(): void {
    const currentActivity = getCurrentActivity(this.gameController.activitiesEntity)

    if (currentActivity === undefined) return

    const { entity } = currentActivity

    if (PollState.has(entity)) {
      this.runPollAsAtendee(entity)
    }

    if (SurveyState.has(entity)) {
      this.runSurveyAsAtendee(entity)
    }
    if (QAState.has(entity)) {
      this.runQAAsAttendee(entity)
    }
  }

  runSurveyAsAtendee(surveyEntity: Entity): void {
    this.gameController.uiController.closeAllUis()
    this.gameController.surveyQuestionUI.isVisible = true
  }

  runPollAsAtendee(pollEntity: Entity): void {
    const pollState = PollState.get(pollEntity)

    if (pollState.closed) {
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const triggerPollQuestion = new PollQuestion(this.gameController, pollEntity)
  }

  private runQAAsAttendee(_qaEntity: Entity): void {
    this.gameController.uiController.closeAllUis()
    const qa = QAState.getOrNull(_qaEntity)
    if (qa !== null) {
      this.gameController.uiQaQueue.open(qa.title, qa)
      // this.gameController.uiQaDebug.show()
    } else {
      this.gameController.uiQaQueue.open('', undefined)
      // this.gameController.uiQaDebug.show()
    }
  }

  showResultsFromCurrentActivity(): void {
    console.log('hehe')
    const currentActivity = getCurrentActivity(this.gameController.activitiesEntity)
    if (currentActivity !== undefined) {
      switch (currentActivity.type) {
        case ActivityType.POLL:
          this.showPollResults(currentActivity.entity)
          break
        case ActivityType.SURVEY:
          this.showSurveyResults(currentActivity.entity)
          break
        case ActivityType.ZONEPOLL:
          this.showZonePollResults(currentActivity.entity)
          break

        case ActivityType.QA:
          this.gameController.uiController.closeAllUis()
          this.runQAAsAttendee(currentActivity.entity)
          break
      }
    }
  }

  areResultsFromCurrentActivityOpen(): boolean {
    const currentActivity = getCurrentActivity(this.gameController.activitiesEntity)
    if (currentActivity !== undefined) {
      switch (currentActivity.type) {
        case ActivityType.POLL:
          return this.gameController.pollResultsUI.resultsUiVisibility
        case ActivityType.SURVEY:
          return this.gameController.surveyResultsUI.isVisible
        case ActivityType.ZONEPOLL:
          return this.gameController.pollResultsUI.resultsUiVisibility
        case ActivityType.QA:
          return this.gameController.uiQaQueue.panelVisible
      }
    }
    return false
  }

  hideResultsFromCurrentActivity(): void {
    const currentActivity = getCurrentActivity(this.gameController.activitiesEntity)
    if (currentActivity !== undefined) {
      switch (currentActivity.type) {
        case ActivityType.POLL:
          this.gameController.pollResultsUI.closeUI()
          break
        case ActivityType.SURVEY:
          this.gameController.surveyResultsUI.isVisible = false
          break
        case ActivityType.ZONEPOLL:
          this.gameController.pollResultsUI.closeUI()
          break
        case ActivityType.QA:
          this.gameController.uiQaQueue.panelVisible = false
          // this.gameController.uiQaDebug.hide()
          break
      }
    }
  }

  showZonePollResults(entity: Entity): void {
    const pollState = ZonePollState.getOrNull(entity)
    if (pollState === null) return

    const counts = pollState.zoneCounts
    const totalVotes = counts.reduce((sum, c) => sum + c, 0)

    if (pollState.closed) {
      this.gameController.uiController.closeAllUis()
    }

    const results = pollState.options.map((option, index) => {
      const count = counts[index] ?? 0
      const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0
      return { option, percentage }
    })

    // HOTFIX: Tooltip shows the correct vote count right now (we are not using wallet userIds, only counts)
    const votes: Array<{ option: string; userId?: string }> = pollState.options.flatMap((option, index) =>
      Array.from({ length: counts[index] ?? 0 }, () => ({ option }))
    )

    this.gameController.pollResultsUI.showResults({
      question: pollState.question,
      anonymous: false,
      results,
      votes
    })
  }

  showSurveyResults(entity: Entity): void {
    this.gameController.uiController.closeAllUis()
    this.gameController.surveyResultsUI.isVisible = true
  }

  showPollResults(pollEntity: Entity): void {
    const pollState = PollState.getOrNull(pollEntity)

    if (pollState == null) {
      return
    }

    const counts = new Map<string, number>()
    for (const opt of pollState.options) counts.set(opt, 0)
    for (const vote of pollState.votes) {
      counts.set(vote.option, (counts.get(vote.option) ?? 0) + 1)
    }

    const totalVotes = pollState.votes.length
    const results = pollState.options.map((option) => {
      const count = counts.get(option) ?? 0
      const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0
      return { option, count, percentage }
    })

    this.gameController.pollResultsUI.showResults({
      question: pollState.question,
      anonymous: pollState.anonymous,
      results,
      votes: pollState.votes.map((vote) => ({ option: vote.option, userId: vote.userId }))
    })
  }

  remove(): void {
    if (this.interactableMonitor !== null) {
      pointerEventsSystem.removeOnPointerDown(this.interactableMonitor)
      Animator.playSingleAnimation(this.interactableMonitor, 'attendee_panel_close', false)
    }
  }

  private getHoverTextForCurrentActivity(): string {
    const currentActivity = getCurrentActivity(this.gameController.activitiesEntity)
    if (currentActivity == null) return 'Open'
    switch (currentActivity.type) {
      case ActivityType.POLL:
        return 'Vote'
      case ActivityType.SURVEY:
        return 'Rate'
      case ActivityType.ZONEPOLL:
        return 'Vote'
      case ActivityType.QA:
        return 'Ask'
      default:
        return 'Open'
    }
  }
}
