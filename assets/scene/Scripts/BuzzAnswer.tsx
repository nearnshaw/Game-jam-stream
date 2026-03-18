
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
  REQUEST_STATE   = 'REQUEST_STATE',
  SHOW_WRONG      = 'SHOW_WRONG',
  RESET_SCORES    = 'RESET_SCORES'
}

const BuzzMessages = {
  [BuzzMessageType.BUZZ_PRESS]:      Schemas.Map({ playerId: Schemas.String, playerName: Schemas.String }),
  [BuzzMessageType.BUZZ_WINNER]:     Schemas.Map({ winnerName: Schemas.String }),
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
  [BuzzMessageType.REQUEST_STATE]:   Schemas.Map({}),
  [BuzzMessageType.SHOW_WRONG]:      Schemas.Map({ playerName: Schemas.String }),
  [BuzzMessageType.RESET_SCORES]:    Schemas.Map({})
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
type LeaderboardEntry = { userId: string; name: string; score: number }
type LeaderboardProfile = { displayName: string; thumbnail: string }
let uiLeaderboard: LeaderboardEntry[] = []
const uiLeaderboardProfilesById: Record<string, LeaderboardProfile> = {}
const pendingLeaderboardProfileFetches = new Set<string>()

function normalizeUserId(userId: string | null | undefined): string {
  return (userId ?? '').trim().toLowerCase()
}

async function fetchUserData(userId: string): Promise<any | null> {
  const url = 'https://peer.decentraland.org/lambdas/profiles'

  //'https://asset-bundle-registry.decentraland.org/profiles'
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ ids: [userId] })
  })

  if (!response.ok) return null

  const parsed = await response.json()
  if (!Array.isArray(parsed) || parsed.length < 1) return null
  return parsed[0]
}

async function fetchAndCacheLeaderboardProfile(userId: string, fallbackName: string): Promise<void> {
  if (!userId || uiLeaderboardProfilesById[userId] || pendingLeaderboardProfileFetches.has(userId)) return
  pendingLeaderboardProfileFetches.add(userId)
  try {
    const userData = await fetchUserData(userId)
    if (!userData) {
      console.log(`[CLIENT] No profile data found for ${userId}`)
      return
    }
    const avatarData = userData?.avatars?.[0]
    const thumbnail = avatarData?.avatar?.snapshots?.face256
    if (typeof thumbnail !== 'string' || thumbnail.length === 0) {
      console.log(`[CLIENT] No thumbnail URL found for ${userId}`)
      return
    }

    const displayName = typeof avatarData?.name === 'string' && avatarData.name.length > 0
      ? avatarData.name
      : fallbackName

    uiLeaderboardProfilesById[userId] = { displayName, thumbnail }
    console.log(`[CLIENT] Cached leaderboard thumbnail for ${userId}: ${thumbnail}`)
  } catch (err) {
    console.log(`[CLIENT] Failed profile fetch for ${userId}: ${String(err)}`)
  } finally {
    pendingLeaderboardProfileFetches.delete(userId)
  }
}

let adminIsRegistered = false
let adminOnEnable:      (() => void) | null = null
let adminOnCorrect:     (() => void) | null = null
let adminOnIncorrect:   (() => void) | null = null
let adminOnReset:       (() => void) | null = null
let adminOnResetScores: (() => void) | null = null
let adminResetScoresConfirming = false

// Callback set by the answering client to send typed text to the server
let onAnswerType: ((text: string) => void) | null = null

// ---------------------------------------------------------------------------
// UI 2 — Answering player (lower-center, with input box)
// ---------------------------------------------------------------------------
function BuzzAnsweringUi(): ReactEcs.JSX.Element | null {
  const showAnswerPanel = !!uiCurrentAnswerer && uiIsAnswerer

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
          display: showAnswerPanel ? 'flex' : 'none',
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
// UI 4 — Global ranking panel (bottom-right, offset left to leave right-side admin space)
// ---------------------------------------------------------------------------
function BuzzRankingUi(): ReactEcs.JSX.Element | null {
  if (uiLeaderboard.length === 0) return null

  return (
    <UiEntity uiTransform={{ width: VIRTUAL_W, height: VIRTUAL_H, positionType: 'absolute' }}>
      <UiEntity
        uiTransform={{
          width: 360,
          height: 'auto',
          positionType: 'absolute',
          // Raise the leaderboard so the first entry is fully visible
          position: { bottom: 140, right: '5%' },
          flexDirection: 'column',
          padding: { top: 12, bottom: 12, left: 12, right: 12 }
        }}
        uiBackground={{ color: Color4.create(0.08, 0.08, 0.08, 0.86) }}
      >
        <Label
          value="Top Players"
          fontSize={18}
          color={Color4.White()}
          textAlign="middle-center"
          uiTransform={{ margin: { bottom: 10 } }}
        />
        {uiLeaderboard.map((entry, index) => (
          <UiEntity
            uiTransform={{
              width: '100%',
              height: 54,
              flexDirection: 'row',
              alignItems: 'center',
              margin: { bottom: index < uiLeaderboard.length - 1 ? 8 : 0 }
            }}
          >
            {(() => {
              const profile = uiLeaderboardProfilesById[entry.userId]
              if (profile?.thumbnail) {
                return (
                  <UiEntity
                    uiTransform={{ width: 42, height: 42, margin: { right: 10 } }}
                    uiBackground={{
                      texture: { src: profile.thumbnail },
                      textureMode: 'stretch'
                    }}
                  />
                )
              }

              return (
                <UiEntity
                  uiTransform={{ width: 42, height: 42, margin: { right: 10 } }}
                  uiBackground={{ color: Color4.create(0.2, 0.2, 0.2, 1) }}
                />
              )
            })()}
            <Label
              value={`${index + 1}. ${uiLeaderboardProfilesById[entry.userId]?.displayName ?? entry.name}`}
              fontSize={15}
              color={Color4.White()}
              textAlign="middle-left"
              uiTransform={{ width: 220, margin: { right: 8 } }}
            />
            <Label
              value={`${entry.score}`}
              fontSize={18}
              color={Color4.create(1, 0.88, 0.35, 1)}
              textAlign="middle-right"
              uiTransform={{ width: 50 }}
            />
          </UiEntity>
        ))}
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
          uiTransform={{ width: 220, height: 38, margin: { bottom: 8 } }}
          uiBackground={{ color: toggleColor }}
          onMouseDown={() => { adminOnEnable?.() }}
        />
        {adminResetScoresConfirming ? (
          <UiEntity
            uiTransform={{ flexDirection: 'row', width: 220, justifyContent: 'center', margin: { bottom: hasAnswerer ? 14 : 0 } }}
          >
            <Label
              value="Reset scores?"
              fontSize={13}
              color={Color4.White()}
              textAlign="middle-center"
              uiTransform={{ margin: { right: 8 } }}
            />
            <Button
              value="Yes"
              variant="primary"
              fontSize={13}
              uiTransform={{ width: 50, height: 32, margin: { right: 6 } }}
              uiBackground={{ color: Color4.create(0.15, 0.65, 0.25, 1) }}
              onMouseDown={() => { adminResetScoresConfirming = false; adminOnResetScores?.() }}
            />
            <Button
              value="No"
              variant="secondary"
              fontSize={13}
              uiTransform={{ width: 50, height: 32 }}
              onMouseDown={() => { adminResetScoresConfirming = false }}
            />
          </UiEntity>
        ) : (
          <Button
            value="Reset Score"
            variant="secondary"
            fontSize={13}
            uiTransform={{ width: 220, height: 32, margin: { bottom: hasAnswerer ? 14 : 0 } }}
            uiBackground={{ color: Color4.create(0.3, 0.2, 0.05, 1) }}
            onMouseDown={() => { adminResetScoresConfirming = true }}
          />
        )}

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
  private localPlayerName: string = ''
  private wrongDisplayTimer: number = 0
  private pendingWinnerName: string | null = null

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
    let currentAnswererId: string | null = null
    let resetTimer = 0
    let timerActive = false
    const scores: Record<string, number> = {}
    const namesById: Record<string, string> = {}

    const broadcastScores = () => {
      const ranking = Object.entries(scores)
        .map(([userId, score]) => ({ userId, name: namesById[userId] ?? 'Unknown', score }))
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)

      console.log(
        '[SERVER] Broadcast leaderboard IDs:',
        ranking.map((entry) => ({ name: entry.name, userId: entry.userId }))
      )
      buzzRoom.send(BuzzMessageType.SCORE_UPDATE, { leaderboard: JSON.stringify(ranking) })
    }
    const penalizeCurrentAnswerer = () => {
      if (currentAnswererId === null) return
      const playerId = currentAnswererId
      const playerName = namesById[playerId] ?? 'Unknown'
      scores[playerId] = Math.max(0, (scores[playerId] ?? 0) - 1)
      console.log(`[SERVER] Penalty: ${playerName} loses 1 point. Total: ${scores[playerId]}`)
      broadcastScores()
    }

    const setCurrentAnswerer = (playerId: string) => {
      currentAnswererId = playerId
      timerActive = true
      resetTimer = 0
      buzzRoom.send(BuzzMessageType.ANSWER_UPDATE, { text: '' })
      const winnerName = namesById[playerId] ?? 'Unknown'
      console.log(`[SERVER] Now answering: ${winnerName}`)
      buzzRoom.send(BuzzMessageType.BUZZ_WINNER, { winnerName })
    }

    const resetState = () => {
      console.log('[SERVER] Buzz reset')
      currentAnswererId = null
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
      const rawPlayerId = data.playerId
      const playerId = normalizeUserId(rawPlayerId)
      const playerName = data.playerName
      if (!playerId || !playerName || currentAnswererId !== null) return

      namesById[playerId] = playerName
      console.log(`[SERVER] Buzz press from: ${playerName} rawId=${rawPlayerId} normalizedId=${playerId}`)
      setCurrentAnswerer(playerId)
    })

    // Forward typed text to all clients as-is
    buzzRoom.onMessage(BuzzMessageType.ANSWER_TYPE, (data) => {
      buzzRoom.send(BuzzMessageType.ANSWER_UPDATE, { text: data.text })
    })

    buzzRoom.onMessage(BuzzMessageType.ADMIN_CORRECT, () => {
      if (currentAnswererId === null) return
      const playerId = currentAnswererId
      const playerName = namesById[playerId] ?? 'Unknown'
      scores[playerId] = (scores[playerId] ?? 0) + 2
      console.log(`[SERVER] Correct! ${playerName} scores. Total: ${scores[playerId]}`)
      buzzRoom.send(BuzzMessageType.ANSWER_CORRECT, { playerName: playerName })
      broadcastScores()
      // Lock the buzzer after a correct answer until admins re-open it.
      enabled = false
      buzzRoom.send(BuzzMessageType.BUTTON_STATE, { enabled })
      resetState()
    })

    buzzRoom.onMessage(BuzzMessageType.ADMIN_INCORRECT, () => {
      if (currentAnswererId === null) return
      const wrongPlayerName = namesById[currentAnswererId] ?? 'Unknown'
      console.log(`[SERVER] Incorrect by ${wrongPlayerName}`)
      penalizeCurrentAnswerer()
      buzzRoom.send(BuzzMessageType.INCORRECT_SOUND, {})
      buzzRoom.send(BuzzMessageType.SHOW_WRONG, { playerName: wrongPlayerName })
      resetState()
    })

    buzzRoom.onMessage(BuzzMessageType.BUZZ_RESET, () => {
      resetState()
    })

    buzzRoom.onMessage(BuzzMessageType.RESET_SCORES, () => {
      for (const playerId of Object.keys(scores)) {
        scores[playerId] = 0
      }
      console.log('[SERVER] Scores reset')
      broadcastScores()
    })

    // A late-joining client requests the current state so it sees the right button appearance
    buzzRoom.onMessage(BuzzMessageType.REQUEST_STATE, () => {
      buzzRoom.send(BuzzMessageType.BUTTON_STATE, { enabled })
      if (currentAnswererId !== null) {
        buzzRoom.send(BuzzMessageType.BUZZ_WINNER, { winnerName: namesById[currentAnswererId] ?? 'Unknown' })
      }
      broadcastScores()
    })

    engine.addSystem((dt) => {
      if (!timerActive) return
      resetTimer += dt
      if (resetTimer >= 30) {
        console.log(`[SERVER] Time's up for ${currentAnswererId ? namesById[currentAnswererId] ?? 'Unknown' : 'Unknown'}`)
        penalizeCurrentAnswerer()
        resetState()
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
    ReactEcsRenderer.addUiRenderer(this.entity + 3 as Entity, BuzzRankingUi,   { virtualWidth: VIRTUAL_W, virtualHeight: VIRTUAL_H })

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
        adminOnReset       = () => buzzRoom.send(BuzzMessageType.BUZZ_RESET, {})
        adminOnResetScores = () => buzzRoom.send(BuzzMessageType.RESET_SCORES, {})
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
          const rawPlayerId = player?.userId ?? ''
          const playerId = normalizeUserId(rawPlayerId)
          const playerName = player?.name ?? 'Unknown'
          if (!playerId) return
          this.localPlayerName = playerName
          AudioSource.playSound(this.entity, 'assets/scene/Audio/buzzer.mp3', true)
          Animator.playSingleAnimation(this.entity, 'trigger')
          console.log(`[CLIENT] Buzzing in as: ${playerName} rawId=${rawPlayerId} normalizedId=${playerId}`)
          buzzRoom.send(BuzzMessageType.BUZZ_PRESS, { playerId, playerName })
        }
      )
    }

    let hasReceivedAuthoritativeButtonState = false
    buzzRoom.onMessage(BuzzMessageType.BUTTON_STATE, (data) => {
      const previousEnabled = buttonEnabled
      const isInitialSync = !hasReceivedAuthoritativeButtonState
      hasReceivedAuthoritativeButtonState = true

      buttonEnabled = data.enabled
      // Play lever sound only for intentional runtime state changes.
      // Initial server sync (including late join bootstrap) must stay silent.
      if (!isInitialSync && previousEnabled !== buttonEnabled) {
        playGlobalSound('assets/asset-packs/pirate_lever/sound.mp3')
      }
      if (buttonEnabled) {
        registerButtonHandler()
        setButtonVisibility(true)
      } else {
        pointerEventsSystem.removeOnPointerDown(this.entity)
        setButtonVisibility(false)
      }
    })

    buzzRoom.onMessage(BuzzMessageType.BUZZ_WINNER, (data) => {
      const { winnerName } = data
      this.hasWinner = true
      uiCurrentAnswerer = winnerName
      uiIsAnswerer = winnerName === this.localPlayerName
      uiCountdown = 30
      uiTypedAnswer = ''
      uiInputText = ''
      clearAnswerInput = true
      console.log(`[CLIENT] Answering: ${winnerName}`)
      if (this.wrongDisplayTimer > 0) {
        this.pendingWinnerName = winnerName
      } else {
        this.showWinnerText(winnerName)
      }
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

    buzzRoom.onMessage(BuzzMessageType.SHOW_WRONG, () => {
      this.wrongDisplayTimer = 2
      this.pendingWinnerName = null
      this.showWrongText()
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
      const leaderboard = JSON.parse(data.leaderboard) as LeaderboardEntry[]
      uiLeaderboard = leaderboard
        .map((entry) => ({ ...entry, userId: normalizeUserId(entry.userId) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
      for (const entry of uiLeaderboard) {
        void fetchAndCacheLeaderboardProfile(entry.userId, entry.name)
      }
      console.log(
        '[CLIENT] Leaderboard (raw -> normalized IDs):',
        leaderboard.map((entry, index) => ({
          rank: index + 1,
          name: entry.name,
          rawUserId: entry.userId,
          normalizedUserId: normalizeUserId(entry.userId)
        }))
      )
    })

    buzzRoom.onMessage(BuzzMessageType.BUZZ_RESET, () => {
      this.hasWinner = false
      this.localPlayerName = ''
      uiCurrentAnswerer = ''
      uiIsAnswerer = false
      uiTypedAnswer = ''
      uiInputText = ''
      clearAnswerInput = true
      this.pendingWinnerName = null
      if (this.wrongDisplayTimer <= 0) {
        this.removeWinnerText()
      }
    })

    // Ask the server for the current state so late-joiners see the right button appearance
    buzzRoom.send(BuzzMessageType.REQUEST_STATE, {})

    engine.addSystem((dt) => {
      if (!uiCurrentAnswerer) return
      uiCountdown -= dt
      if (uiCountdown <= 0) uiCountdown = 0
    })

    engine.addSystem((dt) => {
      if (this.wrongDisplayTimer <= 0) return
      this.wrongDisplayTimer -= dt
      if (this.wrongDisplayTimer <= 0) {
        this.wrongDisplayTimer = 0
        if (this.pendingWinnerName !== null) {
          this.showWinnerText(this.pendingWinnerName)
          this.pendingWinnerName = null
        } else {
          this.removeWinnerText()
        }
      }
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

    const displayText = winnerName

    const textShape = TextShape.getMutableOrNull(this.winnerTextEntity)
    if (textShape !== null) {
      textShape.text = displayText
      textShape.textColor = Color4.Yellow()
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

  private showWrongText() {
    if (this.winnerTextEntity === null) {
      this.winnerTextEntity = engine.addEntity()
      Transform.create(this.winnerTextEntity, {
        position: Vector3.create(0, 0.3, 0),
        scale: Vector3.create(0.5, 0.5, 0.5),
        parent: this.entity
      })
      Billboard.create(this.winnerTextEntity)
    }

    const textShape = TextShape.getMutableOrNull(this.winnerTextEntity)
    if (textShape !== null) {
      textShape.text = 'WRONG'
      textShape.textColor = Color4.Red()
    } else {
      TextShape.create(this.winnerTextEntity, {
        text: 'WRONG',
        fontSize: 3,
        textColor: Color4.Red(),
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
