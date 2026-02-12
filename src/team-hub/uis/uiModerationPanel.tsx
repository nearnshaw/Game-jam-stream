import ReactEcs, { Button, Label, UiEntity } from '@dcl/sdk/react-ecs'
import { Color4 } from '@dcl/sdk/math'
import { type GameController } from '../controllers/game.controller'
import { getScaleFactor } from '../canvas/Canvas'
import { type Player } from '../controllers/player.controller'
import { ModalTitle } from './components/modalTitle'
import { ModalWindow } from './components/modalWindow'
import { engine } from '@dcl/sdk/ecs'
import { withPlayerInfo } from '../utils'

export class ModerationPanel {
  panelVisible = false
  searchText = ''
  players: Player[] = []
  readonly itemsPerPage = 4
  currentPage = 0
  gameController: GameController
  private optionsVisible: Record<string, boolean> = {}
  private optionsHeight: Record<string, number> = {}
  private localUserId: string | null = null
  private chevronAnim: Record<string, number> = {}
  private chevronTarget: Record<string, number> = {}

  constructor(gameController: GameController) {
    this.gameController = gameController
    this.players = this.gameController.playerController.getAllPlayers()
    withPlayerInfo((info) => {
      this.localUserId = info.userId

      this.gameController.playerController.onHostChange((hosts) => {
        const stillHost = this.gameController.playerController.isHost(info.userId)
        if (!stillHost && this.panelVisible) {
          this.panelVisible = false
        }
      })
    })
    engine.addSystem((dt) => {
      this.updateAnimations(dt)
    })
  }

  getFilteredPlayers(): Player[] {
    const allPlayers = this.gameController.playerController.getAllPlayers()
    if (this.searchText.trim() === '') return allPlayers
    return allPlayers.filter((p: { name: string }) => p.name.toLowerCase().includes(this.searchText.toLowerCase()))
  }

  getTotalPages(): number {
    return Math.ceil(this.getFilteredPlayers().length / this.itemsPerPage)
  }

  getCurrentPagePlayers(): Player[] {
    const filtered = this.getFilteredPlayers()
    const start = this.currentPage * this.itemsPerPage
    return filtered.slice(start, start + this.itemsPerPage)
  }

  goToPreviousPage(): void {
    if (this.currentPage > 0) this.currentPage--
  }

  goToNextPage(): void {
    if (this.currentPage < this.getTotalPages() - 1) this.currentPage++
  }

  handleSearchInput = (value: string): void => {
    this.searchText = value
    this.currentPage = 0
  }

  // banPlayer(player: Player): void {
  //   this.gameController.playerController.setBan(player.wallet, true)
  // }

  // unbanPlayer(player: Player): void {
  //   this.gameController.playerController.setBan(player.wallet, false)
  // }

  giveHost(player: Player): void {
    this.gameController.playerController.setHost(player.wallet, true)
    this.gameController.stageUI.addAsHost(player.wallet)
  }

  removeHost(player: Player): void {
    this.gameController.playerController.setHost(player.wallet, false)
  }

  closeUi(): void {
    this.panelVisible = false
    this.searchText = ''
    this.currentPage = 0
  }

  private toggleOptions(wallet: string): void {
    const wasVisible = this.optionsVisible[wallet] ?? false

    if (wasVisible) {
      this.optionsVisible[wallet] = false
      this.optionsHeight[wallet] = this.optionsHeight[wallet] ?? 70

      this.chevronAnim[wallet] = 1
      this.chevronTarget[wallet] = 0
      return
    }

    for (const key in this.optionsVisible) {
      this.optionsVisible[key] = false
      this.optionsHeight[key] = 0
      this.chevronAnim[key] = 1
      this.chevronTarget[key] = 0
    }

    this.optionsVisible[wallet] = true
    this.optionsHeight[wallet] = 0

    this.chevronAnim[wallet] = 0
    this.chevronTarget[wallet] = 1
  }

  updateAnimations(dt: number): void {
    const maxStep = 20
    const speedH = 500
    const speedT = 25

    const wallets = new Set<string>([...Object.keys(this.optionsVisible), ...Object.keys(this.chevronTarget)])

    for (const wallet of wallets) {
      const targetH = (this.optionsVisible[wallet] ?? false) ? 70 : 0
      const currentH = this.optionsHeight[wallet] ?? 0
      const diffH = targetH - currentH
      const stepH = Math.min(Math.abs(diffH), Math.min(speedH * dt, maxStep))
      this.optionsHeight[wallet] = currentH + Math.sign(diffH) * stepH

      const t = this.chevronAnim[wallet] ?? 0
      const tTarget = this.chevronTarget[wallet] ?? ((this.optionsVisible[wallet] ?? false) ? 1 : 0)
      const lerpK = Math.min(1, dt * speedT)
      let nextT = t + (tTarget - t) * lerpK

      if (Math.abs(tTarget - nextT) < 0.01) nextT = tTarget
      this.chevronAnim[wallet] = Math.max(0, Math.min(1, nextT))
    }
  }

  private ensureChevronState(wallet: string): void {
    if (this.chevronAnim[wallet] === undefined) {
      const visible = this.optionsVisible[wallet] ?? false
      this.chevronAnim[wallet] = visible ? 1 : 0
      this.chevronTarget[wallet] = visible ? 1 : 0
    }
  }

  createPlayerCard(player: Player): ReactEcs.JSX.Element {
    const isBanned = this.gameController.playerController.isPlayerBanned(player.wallet)
    const isHost = this.gameController.playerController.isPlayerHost(player.wallet)
    const showOptions = this.optionsVisible[player.wallet] ?? false
    const height = this.optionsHeight[player.wallet] ?? 0
    const isOptionsExpanded = height > 0
    const currentPlayerIsLocal = this.localUserId === player.wallet
    this.ensureChevronState(player.wallet)
    const t = this.chevronAnim[player.wallet]

    return (
      <UiEntity
        key={player.wallet}
        uiTransform={{
          flexDirection: 'column',
          width: 270 * getScaleFactor(),
          height: (60 + height) * getScaleFactor(),
          margin: '5px',
          padding: '5px',
          borderRadius: 10,
          alignItems: 'flex-start'
        }}
        uiBackground={{ color: Color4.fromHexString('#161518') }}
      >
        <UiEntity
          uiTransform={{
            flexDirection: 'row',
            width: '100%',
            justifyContent: 'space-between',
            alignItems: 'center',
            margin: '2px'
          }}
        >
          <UiEntity
            uiTransform={{
              flexDirection: 'row',
              alignItems: 'center',
              margin: '2px'
            }}
          >
            <Label value={`<b>${player.name}</b>`} fontSize={20 * getScaleFactor()} color={Color4.White()} />

            <UiEntity
              uiTransform={{
                width: 17 * getScaleFactor(),
                height: 15 * getScaleFactor(),
                margin: { left: '4px' },
                display: isHost ? 'flex' : 'none'
              }}
              uiBackground={{
                texture: { src: 'assets/scene/Images/team-hub/moderatormenu/Host Icon vector.png' },
                textureMode: 'stretch'
              }}
            />

            <UiEntity
              uiTransform={{
                width: 20.6 * getScaleFactor(),
                height: 20.6 * getScaleFactor(),
                margin: { left: '4px' },
                display: isBanned ? 'flex' : 'none'
              }}
              uiBackground={{
                texture: { src: 'assets/scene/Images/team-hub/moderatormenu/ban svg.png' },
                textureMode: 'stretch'
              }}
            />
          </UiEntity>
          <UiEntity
            uiTransform={{
              justifyContent: 'center',
              alignItems: 'center',
              margin: { top: '8px', right: '5px' },
              width: 18 * getScaleFactor(),
              height: 10 * getScaleFactor(),
              positionType: 'relative'
            }}
            onMouseDown={() => {
              this.toggleOptions(player.wallet)
            }}
          >
            {/* DOWN */}
            <UiEntity
              uiTransform={{
                positionType: 'absolute',
                position: { top: 0, left: 0 },
                width: '100%',
                height: '100%'
              }}
              uiBackground={{
                texture: { src: 'assets/scene/Images/team-hub/moderatormenu/chevron_icon_down.png' },
                textureMode: 'stretch',
                color: Color4.create(1, 1, 1, 1 - t)
              }}
            />
            {/* UP */}
            <UiEntity
              uiTransform={{
                positionType: 'absolute',
                position: { top: 0, left: 0 },
                width: '100%',
                height: '100%'
              }}
              uiBackground={{
                texture: { src: 'assets/scene/Images/team-hub/moderatormenu/chevron_icon_up.png' },
                textureMode: 'stretch',
                color: Color4.create(1, 1, 1, t)
              }}
            />
          </UiEntity>
        </UiEntity>
        {!showOptions && (
          <UiEntity
            uiTransform={{
              width: '100%',
              alignItems: 'flex-start',
              margin: '2px'
            }}
          >
            <Label
              value={`Wallet: #${player.wallet.slice(-4)}`}
              fontSize={13 * getScaleFactor()}
              color={Color4.White()}
              uiTransform={{ margin: '2px' }}
            />
          </UiEntity>
        )}

        {isOptionsExpanded && (
          <UiEntity
            uiTransform={{
              width: '100%',
              height: height * getScaleFactor(),
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-between',
              margin: { bottom: '10px', top: '10px' },
              overflow: 'hidden'
            }}
          >
            <UiEntity
              uiTransform={{
                flexDirection: 'row',
                justifyContent: 'space-around',
                width: '100%'
              }}
            >
              {this.createOptionButton(
                'Make Host',
                'assets/scene/Images/team-hub/moderatormenu/host svg.png',
                () => {
                  this.giveHost(player)
                },
                isHost
              )}
              {this.createOptionButton(
                'Remove Host',
                'assets/scene/Images/team-hub/moderatormenu/Remove host.png',
                () => {
                  this.removeHost(player)
                },
                !isHost
              )}
            </UiEntity>

            <UiEntity
              uiTransform={{
                flexDirection: 'row',
                justifyContent: 'space-around',
                width: '100%'
              }}
            >
              {this.createOptionButton(
                'Ban Player',
                'assets/scene/Images/team-hub/moderatormenu/ban svg.png',
                () => {
                  // this.banPlayer(player)
                },
                isBanned || (isHost && currentPlayerIsLocal)
              )}
              {this.createOptionButton(
                'Unban Player',
                'assets/scene/Images/team-hub/moderatormenu/un ban player svg.png',
                () => {
                  // this.unbanPlayer(player)
                },
                !isBanned
              )}
            </UiEntity>
          </UiEntity>
        )}
      </UiEntity>
    )
  }

  private createOptionButton(
    label: string,
    iconSrc: string,
    onClick: () => void,
    disabled = false
  ): ReactEcs.JSX.Element {
    const buttonColor = disabled ? Color4.fromHexString('#888888') : Color4.White()

    return (
      <UiEntity
        uiTransform={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-start',
          padding: '2px',
          margin: '2px',
          width: 120 * getScaleFactor()
        }}
        onMouseDown={() => {
          if (!disabled) onClick()
        }}
      >
        <UiEntity
          uiTransform={{
            width: 18 * getScaleFactor(),
            height: 18 * getScaleFactor(),
            margin: { right: '5px' }
          }}
          uiBackground={{
            texture: { src: iconSrc },
            textureMode: 'stretch',
            color: buttonColor
          }}
        />
        <Label value={label} fontSize={12 * getScaleFactor()} color={buttonColor} />
      </UiEntity>
    )
  }

  create(): ReactEcs.JSX.Element | null {
    if (!this.panelVisible) return null
    if (this.gameController.uiController.canvasInfo === null) return null
    const totalPages = this.getTotalPages()
    if (this.gameController.uiController.canvasInfo === null) return null
    return (
      <ModalWindow
        visible={this.panelVisible}
        onClosePressed={() => {
          this.panelVisible = false
        }}
      >
        <ModalTitle value="Moderation Panel"></ModalTitle>
        <UiEntity
          key="players-list"
          uiTransform={{
            flexDirection: 'column',
            alignItems: 'center',
            padding: '5px',
            margin: '5px'
          }}
        >
          {this.getCurrentPagePlayers().map((player) => this.createPlayerCard(player))}
        </UiEntity>
        {/* Pagination Controls */}
        <UiEntity
          uiTransform={{
            flexDirection: 'row',
            width: 250 * getScaleFactor(),
            justifyContent: 'space-between',
            alignItems: 'center',
            position: { bottom: '10%' },
            positionType: 'absolute'
          }}
        >
          {/* Left Arrow */}
          <Button
            variant="secondary"
            uiTransform={{
              width: 10.6 * getScaleFactor(),
              height: 17.3 * getScaleFactor(),
              margin: { left: '10px' }
            }}
            uiBackground={{
              textureMode: 'stretch',
              texture: { src: 'assets/scene/Images/team-hub/ui/arrow_left.png' }
            }}
            onMouseDown={() => {
              if (this.currentPage > 0) this.goToPreviousPage()
            }}
            value={''}
          />

          {/* Dots */}
          <UiEntity
            uiTransform={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              width: 'auto',
              height: 20 * getScaleFactor(),
              margin: '0px'
            }}
          >
            {Array.from({ length: totalPages }).map((_, index) => (
              <UiEntity
                key={`pagination-dot-${index}`}
                uiTransform={{
                  width: 8 * getScaleFactor(),
                  height: 8 * getScaleFactor(),
                  margin: { left: '4px', right: '4px' }
                }}
                uiBackground={{
                  texture: {
                    src:
                      index === this.currentPage
                        ? 'assets/scene/Images/team-hub/moderatormenu/dot_active.png'
                        : 'assets/scene/Images/team-hub/moderatormenu/dot_inactive.png'
                  },
                  textureMode: 'stretch'
                }}
              />
            ))}
          </UiEntity>

          {/* Right Arrow */}
          <Button
            variant="secondary"
            uiTransform={{
              width: 10.6 * getScaleFactor(),
              height: 17.3 * getScaleFactor(),
              margin: { right: '10px' }
            }}
            uiBackground={{
              textureMode: 'stretch',
              texture: { src: 'assets/scene/Images/team-hub/ui/arrow_right.png' }
            }}
            onMouseDown={() => {
              if (this.currentPage < totalPages - 1) this.goToNextPage()
            }}
            value={''}
          />
        </UiEntity>
      </ModalWindow>
    )
  }
}
