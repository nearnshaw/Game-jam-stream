
import { engine, Entity, Schemas, Billboard, TextShape, Transform, pointerEventsSystem, InputAction, AudioSource, Animator } from '@dcl/sdk/ecs'
import { isServer, registerMessages } from '@dcl/sdk/network'
import { Color4, Vector3 } from '@dcl/sdk/math'
import { getPlayer } from '@dcl/sdk/src/players'
import ReactEcs, { Button, Label, ReactEcsRenderer, UiEntity } from '@dcl/sdk/react-ecs'
import { isAdmin } from '@dcl/asset-packs/dist/admin'
import type { ActionCallback } from '~sdk/script-utils'

enum BuzzMessageType {
  BUZZ_PRESS = 'BUZZ_PRESS',
  BUZZ_WINNER = 'BUZZ_WINNER',
  BUZZ_RESET = 'BUZZ_RESET',
  ADMIN_CORRECT = 'ADMIN_CORRECT',
  ADMIN_INCORRECT = 'ADMIN_INCORRECT',
  ANSWER_CORRECT = 'ANSWER_CORRECT',
  SCORE_UPDATE = 'SCORE_UPDATE'
}

const BuzzMessages = {
  [BuzzMessageType.BUZZ_PRESS]: Schemas.Map({
    playerName: Schemas.String
  }),
  [BuzzMessageType.BUZZ_WINNER]: Schemas.Map({
    winnerName: Schemas.String,
    topFour: Schemas.String
  }),
  [BuzzMessageType.BUZZ_RESET]: Schemas.Map({}),
  [BuzzMessageType.ADMIN_CORRECT]: Schemas.Map({}),
  [BuzzMessageType.ADMIN_INCORRECT]: Schemas.Map({}),
  [BuzzMessageType.ANSWER_CORRECT]: Schemas.Map({
    playerName: Schemas.String
  }),
  [BuzzMessageType.SCORE_UPDATE]: Schemas.Map({
    leaderboard: Schemas.String // JSON stringified Record<string, number>
  })
}

const buzzRoom = registerMessages(BuzzMessages)

// --- UI state (module-level so the renderer closure can read it) ---
let uiVisible = false
let uiIsWinner = false
let uiCountdown = 30
let uiCurrentAnswerer = ''

// Admin UI state
let adminUiVisible = false
let adminOnCorrect: (() => void) | null = null
let adminOnIncorrect: (() => void) | null = null
let adminOnReset: (() => void) | null = null

function BuzzAnswerUi(): ReactEcs.JSX.Element | null {
  if (!uiVisible) return null

  const text = uiIsWinner
    ? `You're up!\n\nSo what's the answer?\n\n${Math.ceil(uiCountdown)}s`
    : `Better luck next time!`

  const bgColor = uiIsWinner
    ? Color4.create(0.1, 0.6, 0.2, 0.85)
    : Color4.create(0.15, 0.15, 0.15, 0.85)

  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        height: '100%',
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

function BuzzAdminUi(): ReactEcs.JSX.Element | null {
  if (!adminUiVisible || !uiCurrentAnswerer) return null

  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        height: '100%',
        positionType: 'absolute',
        justifyContent: 'flex-start',
        alignItems: 'center',
        padding: { top: 80 }
      }}
    >
      <UiEntity
        uiTransform={{
          width: 360,
          height: 'auto',
          flexDirection: 'column',
          alignItems: 'center',
          padding: 16
        }}
        uiBackground={{ color: Color4.create(0.1, 0.1, 0.1, 0.9) }}
      >
        <Label
          value={`Answering: ${uiCurrentAnswerer}\n${Math.ceil(uiCountdown)}s`}
          fontSize={18}
          color={Color4.White()}
          textAlign="middle-center"
          uiTransform={{ margin: { bottom: 12 } }}
        />
        <UiEntity
          uiTransform={{
            flexDirection: 'row',
            width: '100%',
            justifyContent: 'center'
          }}
        >
          <Button
            value="Correct"
            variant="primary"
            fontSize={16}
            uiTransform={{ width: 100, height: 40, margin: { right: 8 } }}
            uiBackground={{ color: Color4.create(0.15, 0.65, 0.25, 1) }}
            onMouseDown={() => { adminOnCorrect?.() }}
          />
          <Button
            value="Incorrect"
            variant="primary"
            fontSize={16}
            uiTransform={{ width: 100, height: 40, margin: { right: 8 } }}
            uiBackground={{ color: Color4.create(0.75, 0.2, 0.2, 1) }}
            onMouseDown={() => { adminOnIncorrect?.() }}
          />
          <Button
            value="Reset"
            variant="secondary"
            fontSize={16}
            uiTransform={{ width: 100, height: 40 }}
            onMouseDown={() => { adminOnReset?.() }}
          />
        </UiEntity>
      </UiEntity>
    </UiEntity>
  )
}

export class BuzzAnswer {
  private winnerTextEntity: Entity | null = null
  private hasWinner: boolean = false
  private topFourNames: string[] = []
  private localPlayerName: string = ''
  private localIsAdmin: boolean = false

  constructor(
    public src: string,
    public entity: Entity,
    public ActivateOnSuccess?: ActionCallback
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
    let currentAnswerer: string | null = null
    let currentIndex: number = 0
    let pressOrder: string[] = []
    let resetTimer: number = 0
    let timerActive: boolean = false
    const scores: Record<string, number> = {}

    const broadcastScores = () => {
      buzzRoom.send(BuzzMessageType.SCORE_UPDATE, {
        leaderboard: JSON.stringify(scores)
      })
    }

    const setCurrentAnswerer = (index: number) => {
      if (index >= pressOrder.length) {
        // No more players — full reset
        resetState()
        return
      }
      currentIndex = index
      currentAnswerer = pressOrder[index]
      timerActive = true
      resetTimer = 0
      console.log(`[SERVER] Now answering: ${currentAnswerer} (index ${index})`)

      buzzRoom.send(BuzzMessageType.BUZZ_WINNER, {
        winnerName: currentAnswerer,
        topFour: JSON.stringify(pressOrder.slice(0, 4))
      })
    }

    const resetState = () => {
      console.log('[SERVER] Buzz reset')
      currentAnswerer = null
      currentIndex = 0
      pressOrder = []
      timerActive = false
      resetTimer = 0
      buzzRoom.send(BuzzMessageType.BUZZ_RESET, {})
    }

    buzzRoom.onMessage(BuzzMessageType.BUZZ_PRESS, (data) => {
      const playerName = data.playerName
      if (!playerName) return
      if (pressOrder.includes(playerName)) return

      pressOrder.push(playerName)
      console.log(`[SERVER] Buzz press from: ${playerName} (position #${pressOrder.length})`)

      // First person to press becomes the answerer
      if (currentAnswerer === null) {
        setCurrentAnswerer(0)
      } else {
        // Late press — just update the topFour list for everyone
        buzzRoom.send(BuzzMessageType.BUZZ_WINNER, {
          winnerName: currentAnswerer,
          topFour: JSON.stringify(pressOrder.slice(0, 4))
        })
      }
    })

    buzzRoom.onMessage(BuzzMessageType.ADMIN_CORRECT, () => {
      if (currentAnswerer === null) return
      const player = currentAnswerer
      scores[player] = (scores[player] ?? 0) + 1
      console.log(`[SERVER] Correct answer by ${player}! Score: ${scores[player]}`)

      buzzRoom.send(BuzzMessageType.ANSWER_CORRECT, { playerName: player })
      broadcastScores()
      resetState()
    })

    buzzRoom.onMessage(BuzzMessageType.ADMIN_INCORRECT, () => {
      if (currentAnswerer === null) return
      console.log(`[SERVER] Incorrect answer by ${currentAnswerer}`)
      setCurrentAnswerer(currentIndex + 1)
    })

    buzzRoom.onMessage(BuzzMessageType.BUZZ_RESET, () => {
      resetState()
    })

    // Server-side countdown — move to next player when time runs out
    engine.addSystem((dt) => {
      if (!timerActive) return
      resetTimer += dt
      if (resetTimer >= 30) {
        console.log(`[SERVER] Time's up for ${currentAnswerer}`)
        setCurrentAnswerer(currentIndex + 1)
      }
    })
  }

  private setupClient() {
    // Register UI renderers
    ReactEcsRenderer.addUiRenderer(this.entity, BuzzAnswerUi, { virtualWidth: 1920, virtualHeight: 1080 })

    // Check admin status and set up admin UI
    isAdmin().then((result) => {
      this.localIsAdmin = result
      if (result) {
        adminOnCorrect = () => buzzRoom.send(BuzzMessageType.ADMIN_CORRECT, {})
        adminOnIncorrect = () => buzzRoom.send(BuzzMessageType.ADMIN_INCORRECT, {})
        adminOnReset = () => buzzRoom.send(BuzzMessageType.BUZZ_RESET, {})
        adminUiVisible = true
        ReactEcsRenderer.addUiRenderer(this.entity + 1 as Entity, BuzzAdminUi, { virtualWidth: 1920, virtualHeight: 1080 })
      }
    }).catch((err) => {
      console.error('BuzzAnswer: Error checking admin status', err)
    })

    // Set up button click handler
    pointerEventsSystem.onPointerDown(
      {
        entity: this.entity,
        opts: { button: InputAction.IA_POINTER, hoverText: 'I know!', maxDistance: 25 }
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

    // Listen for winner / current-answerer announcements
    buzzRoom.onMessage(BuzzMessageType.BUZZ_WINNER, (data) => {
      const { winnerName, topFour } = data
      this.hasWinner = true
      this.topFourNames = JSON.parse(topFour)
      uiCurrentAnswerer = winnerName

      console.log(`[CLIENT] Answering: ${winnerName}, Top 4: ${topFour}`)

      // Show player UI banner only if this player buzzed in
      if (this.localPlayerName) {
        uiIsWinner = winnerName === this.localPlayerName
        uiCountdown = 30
        uiVisible = true
      }

      this.showWinnerText(winnerName)
    })

    // Listen for correct answer — fire ActivateOnSuccess callback
    buzzRoom.onMessage(BuzzMessageType.ANSWER_CORRECT, (_data) => {
      console.log(`[CLIENT] Answer was correct!`)
      if (this.ActivateOnSuccess) {
        this.ActivateOnSuccess()
      }
    })

    // Listen for score updates
    buzzRoom.onMessage(BuzzMessageType.SCORE_UPDATE, (data) => {
      const leaderboard = JSON.parse(data.leaderboard) as Record<string, number>
      console.log('[CLIENT] Leaderboard:', leaderboard)
    })

    // Listen for reset
    buzzRoom.onMessage(BuzzMessageType.BUZZ_RESET, () => {
      this.hasWinner = false
      this.topFourNames = []
      this.localPlayerName = ''
      uiVisible = false
      uiCurrentAnswerer = ''
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
