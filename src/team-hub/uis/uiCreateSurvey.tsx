import * as utils from '@dcl-sdk/utils'
import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { ActivityType, setCurrentActivity } from '../activities/activitiesEntity'
import { getScaleFactor } from '../canvas/Canvas'
import { type GameController } from '../controllers/game.controller'
import { pushSyncedMessage } from '../messagebus/messagebus'
import { RatingSelector } from '../surveys/rating'
import { createSurveyEntity } from '../surveys/surveyEntity'
import { SurveyIcon } from '../surveys/surveyIcon'
import { ModalButton } from './components/buttons'
import { HorizontalLabeledControl, VerticalLabeledControl } from './components/labeledControl'
import { LabeledInput } from './components/labeledInput'
import { ModalTitle } from './components/modalTitle'
import { ModalButtonsContainer, ModalWindow } from './components/modalWindow'
import { NumberPicker } from './components/numberPicker'
import { Switch } from './components/switch'
import { primaryTheme } from './themes/themes'

export class CreateSurveyUI {
  private isAnonymous: boolean = false
  private optionsQty: number = 5
  private questionTitle: string = ''
  private uiVersion: number = 0

  public isVisible: boolean = false
  constructor(private readonly gameController: GameController) {}

  createUi(): ReactEcs.JSX.Element | null {
    return (
      <ModalWindow
        visible={this.isVisible}
        onClosePressed={() => {
          this.isVisible = false
        }}
        key={this.uiVersion}
      >
        <ModalTitle value="<b>Create your survey</b>" />
        <Label
          uiTransform={{
            width: '100%',
            height: 20 * getScaleFactor(),
            margin: { bottom: 25 * getScaleFactor() }
          }}
          fontSize={primaryTheme.smallFontSize}
          textAlign="middle-center"
          value="Add a question and pick options"
        />

        <LabeledInput
          labelProps={{ value: '<b>Question Title: </b>' }}
          inputProps={{
            placeholder: 'Question Title',
            onChange: (value) => {
              this.questionTitle = value
            }
          }}
        />

        <VerticalLabeledControl
          containerProps={{
            uiTransform: { margin: { top: 25 * getScaleFactor() } }
          }}
          labelProps={{ value: '<b>Options:</b>' }}
        >
          <UiEntity
            uiTransform={{
              width: '100%',
              height: 'auto',
              flexDirection: 'row',
              justifyContent: 'flex-start',
              alignItems: 'center',
              alignContent: 'center'
            }}
          >
            <NumberPicker
              initialValue={this.optionsQty}
              min={2}
              max={5}
              onChange={(num) => {
                this.optionsQty = num
              }}
            ></NumberPicker>
          </UiEntity>

          <RatingSelector icon={SurveyIcon.STAR} initialRating={1} qty={this.optionsQty}></RatingSelector>

          <HorizontalLabeledControl
            labelProps={{
              value: 'Anonymous',
              fontSize: primaryTheme.smallFontSize,
              color: primaryTheme.fontColor
            }}
            uiTransform={{ justifyContent: 'space-between' }}
          >
            <Switch
              initialValue={this.isAnonymous}
              onChange={(val) => {
                this.isAnonymous = val
              }}
            ></Switch>
          </HorizontalLabeledControl>
        </VerticalLabeledControl>
        <ModalButtonsContainer>
          <ModalButton
            text="Create"
            isDisabled={!this.areInputsValid()}
            onClick={() => {
              this.createSurvey()
            }}
          ></ModalButton>
        </ModalButtonsContainer>
      </ModalWindow>
    )
  }

  clearUI(): void {
    this.questionTitle = ''
    this.uiVersion++
  }

  areInputsValid(): boolean {
    return this.questionTitle !== ''
  }

  createSurvey(): void {
    this.isVisible = false
    const [surveyId] = createSurveyEntity(this.questionTitle, SurveyIcon.STAR, this.optionsQty, this.isAnonymous)
    utils.timers.setTimeout(() => {
      setCurrentActivity(this.gameController.activitiesEntity, surveyId, ActivityType.SURVEY)
    }, 0)
    pushSyncedMessage('createSurvey', {})
    // This is done with a timeout because otherwise an unsynched ui may stay visible because of the changing version. Seems to be a bug.
    utils.timers.setTimeout(() => {
      this.clearUI()
    }, 0)
  }
}
