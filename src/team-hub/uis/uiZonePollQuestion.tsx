import ReactEcs, { UiEntity, Label } from '@dcl/sdk/react-ecs'
import { Color4 } from '@dcl/sdk/math'
import { getScaleFactor } from '../canvas/Canvas'
import { type GameController } from '../controllers/game.controller'
import { Row } from './components/flexOrganizers'
import { zoneIcons } from '../zonePolls/zonePollSystem'

export class ZonePollQuestionUI {
  public visible: boolean = false
  public questionText: string = ''
  public options: string[] = []
  public zoneCounts: number[] = []
  public gameController: GameController

  constructor(gameController: GameController) {
    this.gameController = gameController
  }

  public show(question: string, options: string[]): void {
    this.questionText = question
    this.options = options
    this.zoneCounts = new Array(options.length).fill(0)
    this.visible = true
  }

  public hide(): void {
    this.visible = false
    this.questionText = ''
    this.options = []
  }

  public updateCounts(counts: number[]): void {
    this.zoneCounts = counts
  }

  public createUi(): ReactEcs.JSX.Element | null {
    if (!this.visible) return null

    const scale = getScaleFactor()

    return (
      <UiEntity
        uiTransform={{
          width: 740 * scale,
          height: 130 * scale,
          positionType: 'absolute',
          position: { top: 30, left: '50%' },
          margin: { left: -300 * scale },
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          pointerFilter: 'block',
          borderRadius: 25 * scale,
          padding: 10 * scale
        }}
        uiBackground={{ color: Color4.fromInts(0, 0, 0, 230) }}
      >
        <Row uiTransform={{ justifyContent: 'center' }}>
          <Label
            value={this.questionText}
            fontSize={24 * scale}
            color={Color4.White()}
            uiTransform={{
              width: '85%'
            }}
          />

          {this.gameController.timerUI.createUi()}
        </Row>

        <Row uiTransform={{}}>
          {this.options.map((option, index) => {
            const image = zoneIcons[index] ?? ''
            const count = this.zoneCounts[index] ?? 0
            return (
              <UiEntity
                key={`option-${index}`}
                uiTransform={{
                  width: 500 * scale,
                  height: 30 * scale,
                  margin: { top: 4 * scale },
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <UiEntity
                  uiTransform={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center'
                  }}
                >
                  <UiEntity
                    uiTransform={{
                      width: 20 * scale,
                      height: 20 * scale,
                      margin: { right: 4 * scale }
                    }}
                    uiBackground={{
                      texture: { src: image },
                      textureMode: 'stretch'
                    }}
                  />
                  <Label
                    value={breakLine(option, 10)}
                    fontSize={15 * scale}
                    color={Color4.White()}
                    uiTransform={{
                      width: 120 * scale,
                      margin: { bottom: '10px' }
                    }}
                  />

                  <Label
                    value={` ${count}`}
                    fontSize={16 * scale}
                    color={Color4.Gray()}
                    uiTransform={{
                      margin: { left: 2 * scale }
                    }}
                  />
                </UiEntity>
              </UiEntity>
            )
          })}
        </Row>
      </UiEntity>
    )
  }
}

function breakLine(text: string, maxCharsPerLine: number): string {
  if (text.length === 0) return ''

  const words = text.split(' ')
  let line = ''
  let result = ''

  for (const word of words) {
    if ((line + word).length > maxCharsPerLine) {
      result += line.trimEnd() + '\n'
      line = word + ' '
    } else {
      line += word + ' '
    }
  }

  result += line.trimEnd()
  return result
}
