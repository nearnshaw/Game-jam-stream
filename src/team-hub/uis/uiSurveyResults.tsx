import { engine } from '@dcl/sdk/ecs'
import ReactEcs, { Label, type PositionUnit, UiEntity } from '@dcl/sdk/react-ecs'
import { getScaleFactor } from '../canvas/Canvas'
import { type GameController } from '../controllers/game.controller'
import { getSurveyState, type SurveyStateType } from '../surveys/surveyEntity'
import { ModalButton } from './components/buttons'
import { ModalTitle } from './components/modalTitle'
import { ModalWindow } from './components/modalWindow'
import { SurveyResultColors } from './themes/themes'
import { Color4 } from '@dcl/sdk/math'

function SurveyResultOption(props: {
  optionsQty: number
  option: number
  percentage: number
  maxPercentage: number | undefined
  votes: number
  onHover: (hovering: boolean, option: number) => void
  showTooltip: boolean
}): ReactEcs.JSX.Element {
  const { option, optionsQty, percentage, maxPercentage } = props
  const color = SurveyResultColors[Math.min(option, SurveyResultColors.length) - 1]

  return (
    <UiEntity
      uiTransform={{
        width: `${(100 / (optionsQty * 1.5)).toString()}%` as PositionUnit,
        height: '100%',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}
    >
      <Label
        value={`<b>${Math.round(percentage * 100)}%</b>`}
        uiTransform={{
          width: '120%',
          height: 48 * getScaleFactor(),
          justifyContent: 'center',
          alignSelf: 'center'
        }}
        textAlign="middle-center"
        fontSize={12 * getScaleFactor()}
        color={color}
      />
      <UiEntity
        uiTransform={{
          width: '100%',
          height: '100%',
          justifyContent: 'flex-end',
          flexDirection: 'column'
        }}
      >
        <UiEntity
          uiTransform={{
            width: '100%',
            height: `${(100 * percentage) / (maxPercentage ?? 1)}%`
          }}
          uiBackground={{ color }}
          onMouseEnter={() => {
            props.onHover(true, option)
          }}
          onMouseLeave={() => {
            props.onHover(false, option)
          }}
        />
        {props.showTooltip && (
          <Label
            value={`${props.votes} vote${props.votes === 1 ? '' : 's'}`}
            uiTransform={{
              positionType: 'absolute',
              position: { top: '-35%' },
              alignSelf: 'center',
              width: 'auto',
              height: 22 * getScaleFactor(),
              padding: { left: 6, right: 6 },
              justifyContent: 'center',
              borderRadius: 6
            }}
            uiBackground={{
              color: Color4.fromHexString('#000000cc')
            }}
            fontSize={12 * getScaleFactor()}
            font="sans-serif"
            color={Color4.White()}
            textAlign="middle-center"
          />
        )}
      </UiEntity>

      <Label
        value={option.toString()}
        uiTransform={{
          width: '100%',
          height: 36 * getScaleFactor()
        }}
        fontSize={12 * getScaleFactor()}
        textAlign="middle-center"
      />
    </UiEntity>
  )
}

export class SurveyResultsUI {
  public isVisible: boolean = false
  private readonly animatedPercentages = new Map<number, number>()
  private readonly lastPercentages = new Map<number, number>()
  private hoveredOption: number | null = null
  constructor(private readonly gameController: GameController) {
    engine.addSystem((dt) => {
      this.update(dt)
    })
  }

  update(dt: number): void {
    if (!this.isVisible) return

    const state = getSurveyState(this.gameController.activitiesEntity)
    if (state == null) return

    const { percentages } = this.calculatePercentages(state)

    const animationSpeed = 1.2

    for (let i = 1; i <= state.optionsQty; i++) {
      const target = percentages.get(i)?.percentage ?? 0
      const current = this.animatedPercentages.get(i) ?? 0

      if (current < target) {
        const newVal = Math.min(current + animationSpeed * dt, target)
        this.animatedPercentages.set(i, newVal)
      } else if (current > target) {
        const newVal = Math.max(current - animationSpeed * dt, target)
        this.animatedPercentages.set(i, newVal)
      }
    }
  }

  createUi(): ReactEcs.JSX.Element | null {
    if (!this.isVisible) return null
    const state = getSurveyState(this.gameController.activitiesEntity)
    if (state === null) return null

    const { percentages, maxPercentage } = this.calculatePercentages(state)

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
            justifyContent: 'space-around',
            alignItems: 'center',
            flexDirection: 'column'
          }}
        >
          <UiEntity
            uiTransform={{
              width: '100%',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: { top: 4, bottom: 4 }
            }}
          >
            <ModalTitle value={state.question} uiTransform={{ height: 'auto' }} />
          </UiEntity>

          <UiEntity
            uiTransform={{
              height: '60%',
              width: '100%',
              flexDirection: 'row',
              justifyContent: 'space-between'
            }}
          >
            {Array.from({ length: state.optionsQty }, (_, i) => {
              const option = i + 1
              const animatedPercentage = this.animatedPercentages.get(option) ?? 0
              const { votes } = percentages.get(option) ?? { votes: 0 }
              return (
                <SurveyResultOption
                  option={option}
                  optionsQty={state.optionsQty}
                  percentage={animatedPercentage}
                  maxPercentage={maxPercentage}
                  votes={votes}
                  onHover={(hovering, opt) => {
                    this.hoveredOption = hovering ? opt : null
                  }}
                  showTooltip={this.hoveredOption === option}
                />
              )
            })}
          </UiEntity>
        </UiEntity>

        <ModalButton
          text="Close"
          onClick={() => {
            this.isVisible = false
          }}
        />
      </ModalWindow>
    )
  }

  calculatePercentages(state: SurveyStateType): {
    percentages: Map<number, { votes: number; percentage: number }>
    maxPercentage: number | undefined
  } {
    const totalVotes = state.votes.length
    const votesPerOption = state.votes.reduce<Map<number, number>>(
      (currentVotes, vote) => currentVotes.set(vote.option, (currentVotes.get(vote.option) ?? 0) + 1),
      new Map()
    )

    const result = new Map<number, { votes: number; percentage: number }>()
    let maxPercentage: number | undefined
    for (let i = 1; i <= state.optionsQty; i++) {
      const votes = votesPerOption.get(i) ?? 0
      const percentage = totalVotes > 0 ? votes / totalVotes : 0

      result.set(i, { votes, percentage })

      if (maxPercentage === undefined || percentage > maxPercentage) {
        maxPercentage = percentage
      }
    }

    return { percentages: result, maxPercentage }
  }
}
