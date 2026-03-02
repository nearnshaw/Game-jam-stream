
import { engine, Entity, Schemas, Billboard, TextShape, Transform, pointerEventsSystem, InputAction, AudioSource, Animator, AssetLoad, VisibilityComponent } from '@dcl/sdk/ecs'
import { isServer, registerMessages } from '@dcl/sdk/network'
import { Color4, Vector3 } from '@dcl/sdk/math'
import { getPlayer } from '@dcl/sdk/src/players'
import ReactEcs, { Button, Input, Label, ReactEcsRenderer, UiEntity } from '@dcl/sdk/react-ecs'
import { isAdmin } from '@dcl/asset-packs/dist/admin'
import { getActionEvents } from '@dcl/asset-packs/dist/events'
import type { ActionCallback } from '~sdk/script-utils'

enum BuzzMessageType {
  BUZZ_PRESS      = 'BUZZ_PRESS',
  BUZZ_WINNER     = 'BUZZ_WINNER',
  BUZZ_RESET      = 'BUZZ_RESET',
  SET_ENABLED     = 'SET_ENABLED',
  BUTTON_STATE    = 'BUTTON_STATE',
  ADMIN_CORRECT   = 'ADMIN_CORRECT',
  ADMIN_INCORRECT = 'ADMIN_INCORRECT',
  ANSWER_CORRECT  = 'ANSWER_CORRECT',
  SCORE_UPDATE    = 'SCORE_UPDATE',
  ANSWER_TYPE     = 'ANSWER_TYPE',
  ANSWER_UPDATE   = 'ANSWER_UPDATE',
  INCORRECT_SOUND = 'INCORRECT_SOUND',
  REQUEST_STATE   = 'REQUEST_STATE'
}

const BuzzMessages = {
  [BuzzMessageType.BUZZ_PRESS]:      Schemas.Map({ playerName: Schemas.String }),
  [BuzzMessageType.BUZZ_WINNER]:     Schemas.Map({ winnerName: Schemas.String, topFour: Schemas.String }),
  [BuzzMessageType.BUZZ_RESET]:      Schemas.Map({}),
  [BuzzMessageType.SET_ENABLED]:     Schemas.Map({ enabled: Schemas.Boolean }),
  [BuzzMessageType.BUTTON_STATE]:    Schemas.Map({ enabled: Schemas.Boolean }),
  [BuzzMessageType.ADMIN_CORRECT]:   Schemas.Map({}),
  [BuzzMessageType.ADMIN_INCORRECT]: Schemas.Map({}),
  [BuzzMessageType.ANSWER_CORRECT]:  Schemas.Map({ playerName: Schemas.String }),
  [BuzzMessageType.SCORE_UPDATE]:    Schemas.Map({ leaderboard: Schemas.String }),
  [BuzzMessageType.ANSWER_TYPE]:     Schemas.Map({ text: Schemas.String }),
  [BuzzMessageType.ANSWER_UPDATE]:   Schemas.Map({ text: Schemas.String }),
  [BuzzMessageType.INCORRECT_SOUND]: Schemas.Map({}),
  [BuzzMessageType.REQUEST_STATE]:   Schemas.Map({})
}

const buzzRoom = registerMessages(BuzzMessages)

// ---------------------------------------------------------------------------
// Shared UI state
// ---------------------------------------------------------------------------
const VIRTUAL_W  = 1920
const VIRTUAL_H  = 1080
const PANEL_W    = 480
const PANEL_LEFT = (VIRTUAL_W - PANEL_W) / 2

let buttonEnabled    = false
let uiCurrentAnswerer = ''  // empty = nobody answering
let uiIsAnswerer     = false // is the local player the current answerer?
let uiCountdown      = 30
let uiTypedAnswer    = ''   // answer text synced to all in real time
let uiInputText      = ''   // local input buffer for the active answerer
let clearAnswerInput = false

let adminIsRegistered = false
let adminOnEnable:    (() => void) | null = null
let adminOnCorrect:   (() => void) | null = null
let adminOnIncorrect: (() => void) | null = null
let adminOnReset:     (() => void) | null = null

// Callback set by the answering client to send typed text to the server
let onAnswerType: ((text: string) => void) | null = null

// ---------------------------------------------------------------------------
// UI 2 — Answering player (lower-center, with input box)
// ---------------------------------------------------------------------------
function BuzzAnsweringUi(): ReactEcs.JSX.Element | null {
  if (!uiCurrentAnswerer || !uiIsAnswerer) return null

  // Keep Input uncontrolled while typing; only set value for one-frame clears.
  const inputValue = clearAnswerInput ? ' ' : ''
  if (clearAnswerInput) clearAnswerInput = false

  return (
    <UiEntity uiTransform={{ width: VIRTUAL_W, height: VIRTUAL_H, positionType: 'absolute' }}>
      <UiEntity
        uiTransform={{
          width: PANEL_W,
          height: 'auto',
          positionType: 'absolute',
          position: { bottom: 60, left: PANEL_LEFT },
          flexDirection: 'column',
          alignItems: 'center',
          padding: { top: 16, bottom: 16, left: 24, right: 24 }
        }}
        uiBackground={{ color: Color4.create(0.1, 0.55, 0.2, 0.9) }}
      >
        <Label
          value={`You're up!  ${Math.ceil(uiCountdown)}s`}
          fontSize={22}
          color={Color4.White()}
          textAlign="middle-center"
          uiTransform={{ margin: { bottom: 12 } }}
        />
        <Input
          value={inputValue}
          placeholder="Type your answer here..."
          placeholderColor={Color4.create(1, 1, 1, 0.5)}
          fontSize={18}
          color={Color4.White()}
          uiTransform={{ width: '100%', height: 44 }}
          uiBackground={{ color: Color4.create(0, 0, 0, 0.4) }}
          onChange={(val) => {
            uiInputText = val
            uiTypedAnswer = uiInputText
            onAnswerType?.(uiInputText)
          }}
        />
      </UiEntity>
    </UiEntity>
  )
}

// ---------------------------------------------------------------------------
// UI 3 — Observer panel (lower-center, shows who's answering + live text)
// ---------------------------------------------------------------------------
function BuzzObserverUi(): ReactEcs.JSX.Element | null {
  if (!uiCurrentAnswerer || uiIsAnswerer) return null

  const answerDisplay = uiTypedAnswer.length > 0 ? uiTypedAnswer : '...'

  return (
    <UiEntity uiTransform={{ width: VIRTUAL_W, height: VIRTUAL_H, positionType: 'absolute' }}>
      <UiEntity
        uiTransform={{
          width: PANEL_W,
          height: 'auto',
          positionType: 'absolute',
          position: { bottom: 60, left: PANEL_LEFT },
          flexDirection: 'column',
          alignItems: 'center',
          padding: { top: 16, bottom: 16, left: 24, right: 24 }
        }}
        uiBackground={{ color: Color4.create(0.12, 0.12, 0.12, 0.88) }}
      >
        <Label
          value={`${uiCurrentAnswerer} is answering...`}
          fontSize={18}
          color={Color4.create(1, 0.85, 0.3, 1)}
          textAlign="middle-center"
          uiTransform={{ margin: { bottom: 6 } }}
        />
        <Label
          value={`${Math.ceil(uiCountdown)}s`}
          fontSize={15}
          color={Color4.create(0.8, 0.8, 0.8, 1)}
          textAlign="middle-center"
          uiTransform={{ margin: { bottom: 10 } }}
        />
        <Label
          value={answerDisplay}
          fontSize={20}
          color={Color4.White()}
          textAlign="middle-center"
        />
      </UiEntity>
    </UiEntity>
  )
}

// ---------------------------------------------------------------------------
// UI 1 — Admin panel (top-right, always visible for admins)
// ---------------------------------------------------------------------------
function BuzzAdminUi(): ReactEcs.JSX.Element | null {
  if (!adminIsRegistered) return null

  const toggleLabel = buttonEnabled ? 'Disable Button' : 'Enable Button'
  const toggleColor = buttonEnabled
    ? Color4.create(0.55, 0.15, 0.15, 1)
    : Color4.create(0.15, 0.5, 0.15, 1)

  const statusLabel = buttonEnabled ? 'Button: OPEN' : 'Button: LOCKED'
  const statusColor = buttonEnabled
    ? Color4.create(0.4, 1, 0.4, 1)
    : Color4.create(1, 0.4, 0.4, 1)

  const hasAnswerer = uiCurrentAnswerer !== ''

  return (
    <UiEntity uiTransform={{ width: VIRTUAL_W, height: VIRTUAL_H, positionType: 'absolute' }}>
      <UiEntity
        uiTransform={{
          width: 280,
          height: 'auto',
          positionType: 'absolute',
          position: { top: 200, right: 20 },
          flexDirection: 'column',
          alignItems: 'center',
          padding: 14
        }}
        uiBackground={{ color: Color4.create(0.08, 0.08, 0.08, 0.92) }}
      >
        <Label
          value={statusLabel}
          fontSize={14}
          color={statusColor}
          textAlign="middle-center"
          uiTransform={{ margin: { bottom: 10 } }}
        />
        <Button
          value={toggleLabel}
          variant="primary"
          fontSize={15}
          uiTransform={{ width: 220, height: 38, margin: { bottom: hasAnswerer ? 14 : 0 } }}
          uiBackground={{ color: toggleColor }}
          onMouseDown={() => { adminOnEnable?.() }}
        />

        {hasAnswerer && (
          <UiEntity
            uiTransform={{ flexDirection: 'column', width: '100%', alignItems: 'center' }}
          >
            <Label
              value={`Answering: ${uiCurrentAnswerer}\n${Math.ceil(uiCountdown)}s`}
              fontSize={15}
              color={Color4.White()}
              textAlign="middle-center"
              uiTransform={{ margin: { bottom: 8 } }}
            />
            {uiTypedAnswer.length > 0 && (
              <Label
                value={uiTypedAnswer}
                fontSize={14}
                color={Color4.create(0.9, 0.9, 0.5, 1)}
                textAlign="middle-center"
                uiTransform={{ margin: { bottom: 10 } }}
              />
            )}
            <UiEntity
              uiTransform={{ flexDirection: 'row', width: '100%', justifyContent: 'center' }}
            >
              <Button
                value="Correct"
                variant="primary"
                fontSize={14}
                uiTransform={{ width: 80, height: 36, margin: { right: 6 } }}
                uiBackground={{ color: Color4.create(0.15, 0.65, 0.25, 1) }}
                onMouseDown={() => { adminOnCorrect?.() }}
              />
              <Button
                value="Incorrect"
                variant="primary"
                fontSize={14}
                uiTransform={{ width: 80, height: 36, margin: { right: 6 } }}
                uiBackground={{ color: Color4.create(0.75, 0.2, 0.2, 1) }}
                onMouseDown={() => { adminOnIncorrect?.() }}
              />
              <Button
                value="Reset"
                variant="secondary"
                fontSize={14}
                uiTransform={{ width: 60, height: 36 }}
                onMouseDown={() => { adminOnReset?.() }}
              />
            </UiEntity>
          </UiEntity>
        )}
      </UiEntity>
    </UiEntity>
  )
}

// ---------------------------------------------------------------------------
// Main class
// ---------------------------------------------------------------------------
export class BuzzAnswer {
  private winnerTextEntity: Entity | null = null
  private hasWinner: boolean = false
  private topFourNames: string[] = []
  private localPlayerName: string = ''

  constructor(
    public src: string,
    public entity: Entity,
    public ActivateOnSuccess?: ActionCallback
  ) {}

  start() {
    console.log('BuzzAnswer initialized for entity:', this.entity)
    if (isServer()) {
      this.setupServer()
    } else {
      this.setupClient()
    }
  }

  // -------------------------------------------------------------------------
  // Server
  // -------------------------------------------------------------------------
  private setupServer() {
    let enabled = false
    let currentAnswerer: string | null = null
    let currentIndex = 0
    let pressOrder: string[] = []
    let resetTimer = 0
    let timerActive = false
    const scores: Record<string, number> = {}

    const broadcastScores = () => {
      buzzRoom.send(BuzzMessageType.SCORE_UPDATE, { leaderboard: JSON.stringify(scores) })
    }

    const setCurrentAnswerer = (index: number) => {
      if (index >= pressOrder.length) {
        resetState()
        return
      }
      currentIndex = index
      currentAnswerer = pressOrder[index]
      timerActive = true
      resetTimer = 0
      // Clear the typed answer when a new player starts answering
      buzzRoom.send(BuzzMessageType.ANSWER_UPDATE, { text: '' })
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
      buzzRoom.send(BuzzMessageType.ANSWER_UPDATE, { text: '' })
      buzzRoom.send(BuzzMessageType.BUZZ_RESET, {})
    }

    buzzRoom.onMessage(BuzzMessageType.SET_ENABLED, (data) => {
      enabled = data.enabled
      console.log(`[SERVER] Button ${enabled ? 'enabled' : 'disabled'}`)
      buzzRoom.send(BuzzMessageType.BUTTON_STATE, { enabled })
      if (!enabled) resetState()
    })

    buzzRoom.onMessage(BuzzMessageType.BUZZ_PRESS, (data) => {
      if (!enabled) return
      const playerName = data.playerName
      if (!playerName || pressOrder.includes(playerName)) return

      pressOrder.push(playerName)
      console.log(`[SERVER] Buzz press from: ${playerName} (#${pressOrder.length})`)

      if (currentAnswerer === null) {
        setCurrentAnswerer(0)
      } else {
        buzzRoom.send(BuzzMessageType.BUZZ_WINNER, {
          winnerName: currentAnswerer,
          topFour: JSON.stringify(pressOrder.slice(0, 4))
        })
      }
    })

    // Forward typed text to all clients as-is
    buzzRoom.onMessage(BuzzMessageType.ANSWER_TYPE, (data) => {
      buzzRoom.send(BuzzMessageType.ANSWER_UPDATE, { text: data.text })
    })

    buzzRoom.onMessage(BuzzMessageType.ADMIN_CORRECT, () => {
      if (currentAnswerer === null) return
      const player = currentAnswerer
      scores[player] = (scores[player] ?? 0) + 1
      console.log(`[SERVER] Correct! ${player} scores. Total: ${scores[player]}`)
      buzzRoom.send(BuzzMessageType.ANSWER_CORRECT, { playerName: player })
      broadcastScores()
      // Lock the buzzer after a correct answer until admins re-open it.
      enabled = false
      buzzRoom.send(BuzzMessageType.BUTTON_STATE, { enabled })
      resetState()
    })

    buzzRoom.onMessage(BuzzMessageType.ADMIN_INCORRECT, () => {
      if (currentAnswerer === null) return
      console.log(`[SERVER] Incorrect by ${currentAnswerer}`)
      buzzRoom.send(BuzzMessageType.INCORRECT_SOUND, {})
      setCurrentAnswerer(currentIndex + 1)
    })

    buzzRoom.onMessage(BuzzMessageType.BUZZ_RESET, () => {
      resetState()
    })

    // A late-joining client requests the current state so it sees the right button appearance
    buzzRoom.onMessage(BuzzMessageType.REQUEST_STATE, () => {
      buzzRoom.send(BuzzMessageType.BUTTON_STATE, { enabled })
      if (currentAnswerer !== null) {
        buzzRoom.send(BuzzMessageType.BUZZ_WINNER, {
          winnerName: currentAnswerer,
          topFour: JSON.stringify(pressOrder.slice(0, 4))
        })
      }
    })

    engine.addSystem((dt) => {
      if (!timerActive) return
      resetTimer += dt
      if (resetTimer >= 30) {
        console.log(`[SERVER] Time's up for ${currentAnswerer}`)
        setCurrentAnswerer(currentIndex + 1)
      }
    })
  }

  // -------------------------------------------------------------------------
  // Client
  // -------------------------------------------------------------------------
  private setupClient() {
    // Pre-load audio assets so they're ready to play instantly
    AssetLoad.create(engine.RootEntity, {
      assets: [
        'assets/scene/Audio/claps.mp3',
        'assets/scene/Audio/buzzer.mp3',
        'assets/scene/Audio/game-over.mp3',
        'assets/scene/Audio/slide-sound.mp3',
        'assets/asset-packs/pirate_lever/sound.mp3'
      ]
    })

    // Spawn a fresh entity per sound so DCL always treats it as a new play command.
    // global: true = full volume for the local player regardless of position.
    // The entity self-destructs after 10 s so it doesn't accumulate.
    const playGlobalSound = (url: string) => {
      const e = engine.addEntity()
      AudioSource.create(e, { audioClipUrl: url, loop: false, playing: true, volume: 1, global: true })
      Transform.create(e, { position: Vector3.create(200, 0, 200) })
      setTimeout(() => {
        engine.removeEntity(e)
      }, 10000)
    }

    // Register all three UI renderers upfront (they self-gate via state)
    ReactEcsRenderer.addUiRenderer(this.entity,     BuzzAnsweringUi, { virtualWidth: VIRTUAL_W, virtualHeight: VIRTUAL_H })
    ReactEcsRenderer.addUiRenderer(this.entity + 1 as Entity, BuzzObserverUi,  { virtualWidth: VIRTUAL_W, virtualHeight: VIRTUAL_H })

    // Wire up the typing callback (only used when this player is the answerer)
    onAnswerType = (text) => {
      buzzRoom.send(BuzzMessageType.ANSWER_TYPE, { text })
    }

    isAdmin().then((result) => {
      if (result) {
        adminIsRegistered = true
        adminOnEnable    = () => buzzRoom.send(BuzzMessageType.SET_ENABLED, { enabled: !buttonEnabled })
        adminOnCorrect   = () => buzzRoom.send(BuzzMessageType.ADMIN_CORRECT, {})
        adminOnIncorrect = () => buzzRoom.send(BuzzMessageType.ADMIN_INCORRECT, {})
        adminOnReset     = () => buzzRoom.send(BuzzMessageType.BUZZ_RESET, {})
        ReactEcsRenderer.addUiRenderer(this.entity + 2 as Entity, BuzzAdminUi, { virtualWidth: VIRTUAL_W, virtualHeight: VIRTUAL_H })
      }
    }).catch((err) => {
      console.error('BuzzAnswer: Error checking admin status', err)
    })

    // Helper — show button only when enabled.
    const setButtonVisibility = (enabled: boolean) => {
      if (VisibilityComponent.has(this.entity)) {
        VisibilityComponent.getMutable(this.entity).visible = enabled
      } else {
        VisibilityComponent.create(this.entity, { visible: enabled })
      }
    }

    // Default to hidden until authoritative state arrives.
    setButtonVisibility(false)

    // Button starts disabled — pointer events added when server enables it
    const registerButtonHandler = () => {
      pointerEventsSystem.onPointerDown(
        { entity: this.entity, opts: { button: InputAction.IA_POINTER, hoverText: 'I know!', maxDistance: 25 } },
        () => {
          if (this.hasWinner) return
          const player = getPlayer()
          const playerName = player?.name ?? 'Unknown'
          this.localPlayerName = playerName
          AudioSource.playSound(this.entity, 'assets/scene/Audio/buzzer.mp3', true)
          Animator.playSingleAnimation(this.entity, 'trigger')
          console.log(`[CLIENT] Buzzing in as: ${playerName}`)
          buzzRoom.send(BuzzMessageType.BUZZ_PRESS, { playerName })
        }
      )
    }

    buzzRoom.onMessage(BuzzMessageType.BUTTON_STATE, (data) => {
      buttonEnabled = data.enabled
      playGlobalSound('assets/asset-packs/pirate_lever/sound.mp3')
      if (buttonEnabled) {
        registerButtonHandler()
        setButtonVisibility(true)
      } else {
        pointerEventsSystem.removeOnPointerDown(this.entity)
        setButtonVisibility(false)
      }
    })

    buzzRoom.onMessage(BuzzMessageType.BUZZ_WINNER, (data) => {
      const { winnerName, topFour } = data
      this.hasWinner = true
      this.topFourNames = JSON.parse(topFour)
      uiCurrentAnswerer = winnerName
      uiIsAnswerer = winnerName === this.localPlayerName
      uiCountdown = 30
      uiTypedAnswer = ''
      uiInputText = ''
      clearAnswerInput = true
      console.log(`[CLIENT] Answering: ${winnerName}, Top 4: ${topFour}`)
      this.showWinnerText(winnerName)
    })

    // Live answer text from the answering player
    buzzRoom.onMessage(BuzzMessageType.ANSWER_UPDATE, (data) => {
      // Only update for observers — the answerer drives their own local state
      if (!uiIsAnswerer) {
        uiTypedAnswer = data.text
      }
    })

    // Play game-over sound globally for all players on incorrect answer
    buzzRoom.onMessage(BuzzMessageType.INCORRECT_SOUND, () => {
      playGlobalSound('assets/scene/Audio/game-over.mp3')
    })

    buzzRoom.onMessage(BuzzMessageType.ANSWER_CORRECT, (_data) => {
      console.log('[CLIENT] Answer was correct!')

      // Play claps globally
      playGlobalSound('assets/scene/Audio/claps.mp3')

      // Trigger balloons
      const balloonsEntity = engine.getEntityOrNullByName('Balloons')
      if (balloonsEntity !== null) {
        getActionEvents(balloonsEntity).emit('Balloons', {})
      }

      this.ActivateOnSuccess?.()
    })

    buzzRoom.onMessage(BuzzMessageType.SCORE_UPDATE, (data) => {
      const leaderboard = JSON.parse(data.leaderboard) as Record<string, number>
      console.log('[CLIENT] Leaderboard:', leaderboard)
    })

    buzzRoom.onMessage(BuzzMessageType.BUZZ_RESET, () => {
      this.hasWinner = false
      this.topFourNames = []
      this.localPlayerName = ''
      uiCurrentAnswerer = ''
      uiIsAnswerer = false
      uiTypedAnswer = ''
      uiInputText = ''
      clearAnswerInput = true
      this.removeWinnerText()
    })

    // Ask the server for the current state so late-joiners see the right button appearance
    buzzRoom.send(BuzzMessageType.REQUEST_STATE, {})

    engine.addSystem((dt) => {
      if (!uiCurrentAnswerer) return
      uiCountdown -= dt
      if (uiCountdown <= 0) uiCountdown = 0
    })
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------
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

  update(_dt: number) {}
}
