import { engine } from '@dcl/sdk/ecs'
import ReactEcs, { Label } from '@dcl/sdk/react-ecs'
import { Color4 } from '@dcl/sdk/math'
import { type GameController } from '../controllers/game.controller'
import { getScaleFactor } from '../canvas/Canvas'

export class TimerUI {
  public visible: boolean = false
  public remainingSeconds: number = 0
  private lastUpdateTime: number = Date.now()
  public gameController: GameController

  constructor(gameController: GameController) {
    this.gameController = gameController
    engine.addSystem(this.updateSystem.bind(this))
  }

  public show(minutes: number): void {
    this.remainingSeconds = minutes * 60
    this.lastUpdateTime = Date.now()
    this.visible = true
  }

  public hide(): void {
    this.visible = false
    this.remainingSeconds = 0
  }

  private updateSystem(): void {
    if (!this.visible) return

    const now = Date.now()
    if (now - this.lastUpdateTime >= 1000) {
      this.remainingSeconds--
      this.lastUpdateTime = now

      if (this.remainingSeconds <= 0) {
        this.hide()
      }
    }
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  public createUi(): ReactEcs.JSX.Element | null {
    if (this.gameController.uiController.canvasInfo === null) return null
    if (!this.visible) return null

    return (
      <Label value={this.formatTime(this.remainingSeconds)} fontSize={25 * getScaleFactor()} color={Color4.White()} />
    )
  }
}
