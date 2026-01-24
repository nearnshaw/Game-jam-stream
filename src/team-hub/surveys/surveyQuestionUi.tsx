import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { getCurrentActivity } from '../activities/activitiesEntity'
import { getScaleFactor } from '../canvas/Canvas'
import { type GameController } from '../controllers/game.controller'
import { ModalButton } from '../uis/components/buttons'
import { ModalTitle } from '../uis/components/modalTitle'
import { ModalButtonsContainer, ModalWindow } from '../uis/components/modalWindow'
import { primaryTheme } from '../uis/themes/themes'
import { withPlayerInfo } from '../utils'
import { RatingSelector, type RatingNumber } from './rating'
import { getSurveyState, SurveyState } from './surveyEntity'

export class SurveyQuestionUI {
  public isVisible: boolean = false
  private currentRating: RatingNumber = 1

  private lastVotedOption?: { rating: RatingNumber; surveyId: string }

  constructor(private readonly gameController: GameController) {}

  createUi(): ReactEcs.JSX.Element | null {
    if (!this.isVisible) return null
    const surveyState = getSurveyState(this.gameController.activitiesEntity)
    if (surveyState === null) return null

    if (surveyState.closed)
      return (
        <ModalWindow
          visible={this.isVisible}
          onClosePressed={() => {
            this.isVisible = false
          }}
          uiTransform={{
            justifyContent: 'center',
            width: '30%',
            height: '40%'
          }}
        >
          <ModalTitle value="Survey Closed"></ModalTitle>
          <ModalButton text="OK" onClick={() => (this.isVisible = false)}></ModalButton>
        </ModalWindow>
      )

    return (
      <ModalWindow
        visible={this.isVisible}
        onClosePressed={() => {
          this.isVisible = false
        }}
        uiTransform={{ justifyContent: 'space-between' }}
      >
        <UiEntity
          uiTransform={{
            width: '100%',
            height: '85%',
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'column'
          }}
        >
          <ModalTitle value={surveyState.question} uiTransform={{ height: 'auto' }} />
          <Label
            uiTransform={{
              width: '100%',
              height: 35 * getScaleFactor(),
              margin: {
                bottom: 25 * getScaleFactor(),
                top: 12 * getScaleFactor()
              }
            }}
            fontSize={primaryTheme.smallFontSize}
            textAlign="middle-center"
            value={`Rate from 1 to ${surveyState.optionsQty}`}
          />
          <RatingSelector
            icon={surveyState.icon}
            qty={surveyState.optionsQty}
            initialRating={this.currentRating}
            onChange={(newRating) => {
              this.currentRating = newRating
            }}
          ></RatingSelector>
        </UiEntity>

        <ModalButtonsContainer uiTransform={{ positionType: 'relative' }} removeAbsolutePosition={true}>
          <ModalButton
            text="Vote"
            onClick={() => {
              this.createOrUpdateVote()
            }}
          ></ModalButton>
        </ModalButtonsContainer>
      </ModalWindow>
    )
  }

  createOrUpdateVote(): void {
    withPlayerInfo((player) => {
      const currentActivity = getCurrentActivity(this.gameController.activitiesEntity)

      if (currentActivity === undefined) {
        return
      }

      const mutableSurvey = SurveyState.getMutable(currentActivity.entity)

      const existingVote = mutableSurvey.votes.find(
        (vote) =>
          (mutableSurvey.anonymous && vote.option === this.lastVotedOption?.rating) || vote.userId === player.userId
      )

      if (existingVote !== undefined) {
        existingVote.option = this.currentRating

        this.lastVotedOption = {
          rating: this.currentRating,
          surveyId: mutableSurvey.id
        }
      } else {
        // If vote was casted in an anonymous poll in a different session (like closing and opening explorer)
        // -> cannot change the vote and cannot vote again
        if (mutableSurvey.userIdsThatVoted.includes(player.userId)) {
          return
        }

        mutableSurvey.userIdsThatVoted.push(player.userId)
        mutableSurvey.votes.push({
          userId: player.userId,
          option: this.currentRating
        })

        this.lastVotedOption = {
          rating: this.currentRating,
          surveyId: mutableSurvey.id
        }
      }
    })
    this.isVisible = false
  }
}
