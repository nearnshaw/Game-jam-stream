import { engine, UiCanvasInformation } from '@dcl/sdk/ecs'
import ReactEcs, { UiEntity } from '@dcl/sdk/react-ecs'
import * as ui from 'dcl-ui-toolkit'
import Canvas from '../canvas/Canvas'
import { type GameController } from './game.controller'
import { registerMount, unregisterMount } from '../uis/ui.registry'

type LayerProps = {
  k: string
  children?: ReactEcs.JSX.Element | ReactEcs.JSX.Element[] | null
}

const Layer = (props: LayerProps): ReactEcs.JSX.Element => (
  <UiEntity
    key={props.k}
    uiTransform={{
      positionType: 'absolute',
      width: '100%',
      height: '100%',
      position: { top: 0, left: 0 }
    }}
  >
    {props.children ?? null}
  </UiEntity>
)

export class UIController {
  public canvasInfo = UiCanvasInformation.getOrNull(engine.RootEntity)
  public gameController: GameController
  private readonly mountId: string
  private readonly priority: number

  constructor(gameController: GameController, opts?: { id?: string; priority?: number }) {
    this.gameController = gameController
    this.mountId = opts?.id ?? 'coding-cave:ui' // give it a unique namespace
    this.priority = opts?.priority ?? 100 // lower = further back (rendered behind others)

    // Plug your UI into the registry (auto-mount)
    registerMount(this.mountId, this.render.bind(this), this.priority)
  }

  dispose(): void {
    unregisterMount(this.mountId)
  }

  start(): void {}

  render(): ReactEcs.JSX.Element | null {
    if (this.canvasInfo === null) return null
    return (
      <UiEntity>
        <Canvas>
          <Layer k="choose-activity">{this.gameController.activitiesUI.createChooseActivityUi()}</Layer>
          <Layer k="create-poll">{this.gameController.createPollUI.createUi()}</Layer>
          <Layer k="create-option">{this.gameController.createOptionUI.createUi()}</Layer>
          <Layer k="create-survey">{this.gameController.createSurveyUI.createUi()}</Layer>
          <Layer k="poll-results">{this.gameController.pollResultsUI.createUi()}</Layer>
          <Layer k="choose-poll">{this.gameController.choosePollUI.createChoosePollUi()}</Layer>
          <Layer k="zone-poll-create">{this.gameController.createZonePollUI.createUi()}</Layer>
          <Layer k="zone-poll-question">{this.gameController.zonePollQuestionUI.createUi()}</Layer>
          <Layer k="main-menu">{this.gameController.mainMenuUI.create()}</Layer>
          <Layer k="wip">{this.gameController.workInProgressUI.create()}</Layer>
          <Layer k="moderation">{this.gameController.newModerationPanel.create()}</Layer>
          <Layer k="survey-question">{this.gameController.surveyQuestionUI.createUi()}</Layer>
          <Layer k="survey-results">{this.gameController.surveyResultsUI.createUi()}</Layer>
          <Layer k="hosts-toolbar">{this.gameController.hostsToolbar.createUi()}</Layer>
          <Layer k="ask-question">{this.gameController.uiAskQuestion.createUi()}</Layer>
          <Layer k="create-qa">{this.gameController.createQAUI.createUi()}</Layer>
          <Layer k="uiQueues">{this.gameController.uiQaQueue.createUI()}</Layer>
          <Layer k="current-activity">{this.gameController.currentActivityPanelUI.createUi()}</Layer>
          <Layer k="dcl-ui">{ui.render()}</Layer>
          <Layer k="customization">{this.gameController.customizationUI.create()}</Layer>
          <Layer k="black-screen">{this.gameController.kickUI.createBlackScreen()}</Layer>
        </Canvas>
      </UiEntity>
    )
  }

  closeAllUis(): void {
    this.gameController.activitiesUI.chooseActivityUiVisibility = false
    this.gameController.createPollUI.createPollUiVisibility = false
    this.gameController.createOptionUI.optionsUiVisibility = false
    this.gameController.createSurveyUI.isVisible = false
    this.gameController.pollResultsUI.resultsUiVisibility = false
    this.gameController.timerUI.visible = false
    this.gameController.choosePollUI.choosePollUiVisibility = false
    this.gameController.createZonePollUI.createZonePollUiVisibility = false
    this.gameController.zonePollQuestionUI.visible = false
    this.gameController.customizationUI.isVisible = false
    this.gameController.mainMenuUI.isVisible = false
    this.gameController.workInProgressUI.isVisible = false
    this.gameController.newModerationPanel.closeUi()
    this.gameController.kickUI.blackScreenVisibility = false
    this.gameController.surveyQuestionUI.isVisible = false
    this.gameController.surveyResultsUI.isVisible = false
    this.gameController.currentActivityPanelUI.closingActivityModalShown = false
    this.gameController.uiAskQuestion.isVisible = false
    this.gameController.uiQaQueue.panelVisible = false
    this.gameController.createQAUI.isVisible = false
  }
}