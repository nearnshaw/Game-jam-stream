
import { engine, Entity, Schemas, Billboard, TextShape, Transform, pointerEventsSystem, InputAction, AudioSource, Animator } from '@dcl/sdk/ecs'
import { isServer, registerMessages } from '@dcl/sdk/network'
import { Color4, Vector3 } from '@dcl/sdk/math'
import { getPlayer } from '@dcl/sdk/src/players'
import ReactEcs, { Label, ReactEcsRenderer, UiEntity } from '@dcl/sdk/react-ecs'

enum BuzzMessageType {
  BUZZ_PRESS = 'BUZZ_PRESS',
  BUZZ_WINNER = 'BUZZ_WINNER',
  BUZZ_RESET = 'BUZZ_RESET'
}

const BuzzMessages = {
  [BuzzMessageType.BUZZ_PRESS]: Schemas.Map({
    playerName: Schemas.String
  }),
  [BuzzMessageType.BUZZ_WINNER]: Schemas.Map({
    winnerName: Schemas.String,
    topFour: Schemas.String // JSON stringified array of names
  }),
  [BuzzMessageType.BUZZ_RESET]: Schemas.Map({})
}

const buzzRoom = registerMessages(BuzzMessages)

// --- UI state (module-level so the renderer closure can read it) ---
let uiVisible = false
let uiIsWinner = false
let uiCountdown = 30

function BuzzAnswerUi(): ReactEcs.JSX.Element | null {
  if (!uiVisible) return null

  const VIRTUAL_W = 1280
  const VIRTUAL_H = 720

  const text = uiIsWinner
    ? `You're up!\n\nSo what's the answer?\n\n${Math.ceil(uiCountdown)}s`
    : `Better luck next time!`

  const bgColor = uiIsWinner
    ? Color4.create(0.1, 0.6, 0.2, 0.85)
    : Color4.create(0.15, 0.15, 0.15, 0.85)

  return (
    <UiEntity
      uiTransform={{
        width: VIRTUAL_W,
        height: VIRTUAL_H,
        positionType: 'absolute',
        justifyContent: 'flex-end',
        alignItems: 'center',
        padding: { bottom: 40 }
      }}
    >
      <UiEntity
        uiTransform={{
          width: 420,
          height: 'auto',
          padding: { top: 14, bottom: 14, left: 24, right: 24 },
          justifyContent: 'center',
          alignItems: 'center'
        }}
        uiBackground={{ color: bgColor }}
      >
        <Label
          value={text}
          fontSize={22}
          color={Color4.White()}
          textAlign="middle-center"
        />
      </UiEntity>
    </UiEntity>
  )
}

export class BuzzAnswer {
  private winnerTextEntity: Entity | null = null
  private hasWinner: boolean = false
  private topFourNames: string[] = []
  private localPlayerName: string = ''

  constructor(
    public src: string,
    public entity: Entity
  ) {}

  start() {
    console.log("BuzzAnswer initialized for entity:", this.entity)

    if (isServer()) {
      this.setupServer()
    } else {
      this.setupClient()
    }
  }

  private setupServer() {
    let winner: string | null = null
    let pressOrder: string[] = []
    let resetTimer: number = 0
    let timerActive: boolean = false

    const resetState = () => {
      console.log('[SERVER] Buzz reset')
      winner = null
      pressOrder = []
      timerActive = false
      resetTimer = 0
      buzzRoom.send(BuzzMessageType.BUZZ_RESET, {})
    }

    buzzRoom.onMessage(BuzzMessageType.BUZZ_PRESS, (data) => {
      const playerName = data.playerName
      if (!playerName) return

      // Avoid duplicate entries
      if (pressOrder.includes(playerName)) return

      pressOrder.push(playerName)
      console.log(`[SERVER] Buzz press from: ${playerName} (position #${pressOrder.length})`)

      // First person to press is the winner — start the 30s countdown
      if (winner === null) {
        winner = playerName
        timerActive = true
        resetTimer = 0
        console.log(`[SERVER] Winner: ${winner} — 30s countdown started`)
      }

      // Broadcast winner + top 4 to all clients
      const topFour = pressOrder.slice(0, 4)
      buzzRoom.send(BuzzMessageType.BUZZ_WINNER, {
        winnerName: winner,
        topFour: JSON.stringify(topFour)
      })
    })

    buzzRoom.onMessage(BuzzMessageType.BUZZ_RESET, () => {
      resetState()
    })

    // Server-side countdown system
    engine.addSystem((dt) => {
      if (!timerActive) return
      resetTimer += dt
      if (resetTimer >= 30) {
        resetState()
      }
    })
  }

  private setupClient() {
    // Register the UI renderer
    ReactEcsRenderer.addUiRenderer(this.entity, BuzzAnswerUi, {virtualWidth: 1920, virtualHeight: 1080})

    // Set up button click handler
    pointerEventsSystem.onPointerDown(
      {
        entity: this.entity,
        opts: { button: InputAction.IA_POINTER, hoverText: 'I know!' , maxDistance: 25}
      },
      () => {
        if (this.hasWinner) return

        const player = getPlayer()
        const playerName = player?.name ?? 'Unknown'
        this.localPlayerName = playerName

        AudioSource.playSound(this.entity, 'scene/Audio/buzzer.mp3', true)

        Animator.playSingleAnimation(this.entity, 'trigger')

        console.log(`[CLIENT] Buzzing in as: ${playerName}`)
        buzzRoom.send(BuzzMessageType.BUZZ_PRESS, { playerName })
      }
    )

    // Listen for winner announcements
    buzzRoom.onMessage(BuzzMessageType.BUZZ_WINNER, (data) => {
      const { winnerName, topFour } = data
      this.hasWinner = true
      this.topFourNames = JSON.parse(topFour)

      console.log(`[CLIENT] Winner: ${winnerName}, Top 4: ${topFour}`)

      // Show UI banner to local player
      uiIsWinner = winnerName === this.localPlayerName
      uiCountdown = 30
      uiVisible = true

      // Create or update floating text above the button
      this.showWinnerText(winnerName)
    })

    // Listen for reset
    buzzRoom.onMessage(BuzzMessageType.BUZZ_RESET, () => {
      this.hasWinner = false
      this.topFourNames = []
      uiVisible = false
      this.removeWinnerText()
    })

    // Client-side countdown for the UI banner
    engine.addSystem((dt) => {
      if (!uiVisible || !uiIsWinner) return
      uiCountdown -= dt
      if (uiCountdown <= 0) {
        uiCountdown = 0
      }
    })
  }

  private showWinnerText(winnerName: string) {
    if (this.winnerTextEntity === null) {
      this.winnerTextEntity = engine.addEntity()

      Transform.create(this.winnerTextEntity, {
        position: Vector3.create(0, 0.3, 0),
        scale: Vector3.create(0.5, 0.5, 0.5),
        parent: this.entity
      })

      Billboard.create(this.winnerTextEntity)
    }

    const displayText = this.topFourNames.length > 1
      ? `${winnerName}\n\n${this.topFourNames.map((n, i) => `${i + 1}. ${n}`).join('\n')}`
      : winnerName

    const textShape = TextShape.getMutableOrNull(this.winnerTextEntity)
    if (textShape !== null) {
      textShape.text = displayText
    } else {
      TextShape.create(this.winnerTextEntity, {
        text: displayText,
        fontSize: 3,
        textColor: Color4.Yellow(),
        outlineColor: Color4.Black(),
        outlineWidth: 0.15
      })
    }
  }

  private removeWinnerText() {
    if (this.winnerTextEntity !== null) {
      engine.removeEntity(this.winnerTextEntity)
      this.winnerTextEntity = null
    }
  }

  update(dt: number) {
    // Called every frame
  }
}
