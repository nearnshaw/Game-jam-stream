import { Color4 } from '@dcl/sdk/math'
import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { engine } from '@dcl/sdk/ecs'
import { getScaleFactor } from '../canvas/Canvas'
import { type GameController } from '../controllers/game.controller'
import { easeOutCubic } from '../utils'
import { ModalTitle } from './components/modalTitle'
import { ModalWindow } from './components/modalWindow'

type Result = { option: string; percentage: number }

function PollResultView(props: {
  result: Result
  index: number
  animationProgress: number
  votesForOption: number
  showTooltip: boolean
  onMouseEnter: () => void
  onMouseLeave: () => void
}): ReactEcs.JSX.Element {
  const animatedPercentage = (props.result.percentage * props.animationProgress).toFixed(1)

  return (
    <UiEntity
      key={props.index}
      onMouseEnter={props.onMouseEnter}
      onMouseLeave={props.onMouseLeave}
      uiTransform={{
        width: '100%',
        height: 54 * getScaleFactor(),
        margin: { bottom: 18 * getScaleFactor() },
        justifyContent: 'space-between',
        padding: {
          bottom: 12 * getScaleFactor(),
          left: 10 * getScaleFactor(),
          right: 10 * getScaleFactor()
        }
      }}
      uiBackground={{
        texture: {
          src: `assets/scene/Images/team-hub/resultsui/poll_result_background_${props.index + 1}.png`
        },
        textureMode: 'nine-slices',
        textureSlices: { bottom: 0, top: 0, left: 0, right: 0 }
      }}
    >
      {props.showTooltip && (
        <Label
          value={`${props.votesForOption} vote${props.votesForOption === 1 ? '' : 's'}`}
          fontSize={12 * getScaleFactor()}
          uiTransform={{
            positionType: 'absolute',
            position: { top: -24 * getScaleFactor() },
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
          color={Color4.White()}
          textAlign="middle-center"
        />
      )}

      <UiEntity
        uiTransform={{
          positionType: 'absolute',
          width: '98.2%',
          height: 46 * getScaleFactor(),
          position: { left: 0, top: 0 },
          margin: { left: '1%', right: '0.8%' }
        }}
        uiBackground={{
          color: Color4.create(0, 0, 0, 1 - props.animationProgress)
        }}
      />
      <Label value={`<b>${props.result.option}</b>`} fontSize={16 * getScaleFactor()} />
      <Label value={`<b>${animatedPercentage}%</b>`} fontSize={16 * getScaleFactor()} />
    </UiEntity>
  )
}
export class ResultsUI {
  public resultsUiVisibility: boolean = false
  private pollQuestion: string = ''
  private results: Array<{ option: string; percentage: number }> = []

  private isAnonymous: boolean = true
  public gameController: GameController
  private animationElapsed: number = 0.0
  private readonly ANIMATION_DURATION: number = 3.0

  private votes: Array<{ option: string; userId?: string }> = []
  private hoveredVotesOption: string | null = null

  constructor(gameController: GameController) {
    this.gameController = gameController
    engine.addSystem((dt) => {
      this.update(dt)
    })
  }

  showResults(data: {
    question: string
    anonymous: boolean
    results: Array<{ option: string; percentage: number }>
    votes: Array<{ option: string; userId?: string }>
  }): void {
    this.setData(data)
    this.openUI()
  }

  setData(data: {
    question: string
    anonymous: boolean
    results: Array<{ option: string; percentage: number }>
    votes: Array<{ option: string; userId?: string }>
  }): void {
    this.pollQuestion = data.question
    this.results = [...data.results].sort((resultA, resultB) => resultB.percentage - resultA.percentage)
    this.isAnonymous = data.anonymous
    this.resultsUiVisibility = true
    this.votes = data.votes
  }

  openUI(): void {
    this.gameController.uiController.closeAllUis()
    this.resultsUiVisibility = true
    this.animationElapsed = 0
  }

  closeUI(): void {
    this.resultsUiVisibility = false
  }

  createUi(): ReactEcs.JSX.Element | null {
    if (this.gameController.uiController.canvasInfo === null) return null

    const animationProgress = easeOutCubic(Math.max(Math.min(this.animationElapsed / this.ANIMATION_DURATION, 1.0), 0))

    return (
      <ModalWindow
        visible={this.resultsUiVisibility}
        onClosePressed={() => {
          this.closeUI()
        }}
      >
        <ModalTitle
          value={`<b>Results for:\n${this.pollQuestion}</b>`}
          uiTransform={{
            height: 'auto',
            margin: { bottom: 28 * getScaleFactor() }
          }}
          fontSize={22 * getScaleFactor()}
        />

        <UiEntity
          uiTransform={{
            width: '100%',
            height: 'auto',
            flexDirection: 'column'
          }}
        >
          {this.results.map((result, index) => {
            const votesForOption = this.votes.filter((v) => v.option === result.option).length
            const showTooltip = this.hoveredVotesOption === result.option

            return (
              <PollResultView
                result={result}
                index={index}
                animationProgress={animationProgress}
                votesForOption={votesForOption}
                showTooltip={showTooltip}
                onMouseEnter={() => {
                  this.hoveredVotesOption = result.option
                }}
                onMouseLeave={() => {
                  this.hoveredVotesOption = null
                }}
              />
            )
          })}
        </UiEntity>

        {this.isAnonymous && (
          <Label
            value={`<b>This poll is anonymous, voter \n identities are hidden.</b>`}
            fontSize={14 * getScaleFactor()}
            uiTransform={{
              width: '100%',
              positionType: 'absolute',
              position: { left: 0, bottom: 60 * getScaleFactor(), right: 0 }
            }}
          />
        )}
      </ModalWindow>
    )
  }

  update(dt: number): void {
    if (this.animationElapsed >= this.ANIMATION_DURATION) return
    this.animationElapsed += dt
  }
}
