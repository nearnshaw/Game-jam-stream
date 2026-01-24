import * as utils from '@dcl-sdk/utils'
import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { getScaleFactor } from '../canvas/Canvas'
import { type GameController } from '../controllers/game.controller'
import { ModalButton } from './components/buttons'
import { ModalTitle } from './components/modalTitle'
import { ModalButtonsContainer, ModalWindow } from './components/modalWindow'
import { primaryTheme } from './themes/themes'
import { Color4 } from '@dcl/sdk/math'
import { getPlayer } from '@dcl/sdk/src/players'
import { addQuestionToQA, findFirstOpenQAEntity, QAState } from '../qa/qaEntity'
import { LabeledInput } from './components/labeledInput'

type BannerInfo = {
  enabled: boolean
  message: string
  iconSrc: string
}

export class AskQuestionUI {
  private uiVersion: number = 100
  public isVisible: boolean = false
  private questionText: string = ''
  private readonly questionMaxLength = 140

  constructor(private readonly gameController: GameController) {
    // Debug
    // this.getModerationInfo = () => ({
    //   enabled: true,
    //     message: `<b>${'Moderated by host:'}</b> ${'Your question will be reviewed before appearing.'}`,
    //     iconSrc: 'assets/scene/Images/team-hub/qaui/warning_icon.png'
    // })
    // this.getAnonymityInfo = () => ({
    //   enabled: true,
    //   message: 'Anonymus - Your identity is hided by host rules',
    //   iconSrc: 'assets/scene/Images/team-hub/qaui/hide_icon.png'
    // })
  }

  private isQuestionValid(): boolean {
    return this.questionText.trim().length > 0 && this.questionText.length <= this.questionMaxLength
  }

  private isLocalHost(): boolean {
    const userId = getPlayer()?.userId ?? 'unknown'
    return this.gameController.playerController.isHost(userId)
  }

  private getModerationInfo(): BannerInfo {
    const qaEntity = findFirstOpenQAEntity()
    if (qaEntity == null) {
      return { enabled: false, message: 'No Q&A session found', iconSrc: 'assets/scene/Images/team-hub/qaui/warning_icon.png' }
    }
    const st = QAState.getOrNull(qaEntity)
    if (st == null) {
      return { enabled: false, message: 'Q&A unavailable', iconSrc: 'assets/scene/Images/team-hub/qaui/warning_icon.png' }
    }

    const moderated =
      (st as any).requiresApprovalForUntrusted === true ||
      (st as any).moderated === true ||
      (st as any).reviewBeforePublish === true

    if (moderated) {
      return {
        enabled: true,
        message: `<b>${'Moderated by host:'}</b> ${'Your question will be reviewed before appearing.'}`,
        iconSrc: 'assets/scene/Images/team-hub/qaui/warning_icon.png'
      }
    }

    return {
      enabled: true,
      message: `<b>${'Instant publishing:'}</b> ${'Your question will appear immediately'}`,
      iconSrc: 'assets/scene/Images/team-hub/qaui/ok_green.png'
    }
  }

  private getAnonymityInfo(): BannerInfo {
    const qaEntity = findFirstOpenQAEntity()
    if (qaEntity == null) return { enabled: false, message: '', iconSrc: 'assets/scene/Images/team-hub/qaui/hide_icon.png' }

    const st = QAState.getOrNull(qaEntity)
    if (st == null) return { enabled: false, message: '', iconSrc: 'assets/scene/Images/team-hub/qaui/hide_icon.png' }

    const anonymousEnabled =
      (st as any).anonymous === true ||
      (st as any).allowAnonymous === true ||
      (st as any).hideIdentity === true ||
      (st as any).anonymousByDefault === true ||
      (st as any).anonymizeUntrusted === true ||
      (st as any).rules?.hideIdentity === true

    if (!anonymousEnabled) return { enabled: false, message: '', iconSrc: 'assets/scene/Images/team-hub/qaui/hide_icon.png' }

    return {
      enabled: true,
      message: `<b>${'Anonymus:'}</b> ${'Your identity is hided by host rules'}`,
      iconSrc: 'assets/scene/Images/team-hub/qaui/hide_icon.png'
    }
  }

  private renderBanner(info: BannerInfo): ReactEcs.JSX.Element | null {
    if (!info.enabled) return null
    return (
      <UiEntity
        uiTransform={{
          width: '100%',
          height: 'auto',
          margin: { top: 1 * getScaleFactor(), bottom: 6 * getScaleFactor() },
          padding: {
            top: 8 * getScaleFactor(),
            bottom: 8 * getScaleFactor(),
            left: 10 * getScaleFactor(),
            right: 10 * getScaleFactor()
          },
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-start',
          borderRadius: 12
        }}
        uiBackground={{ color: Color4.fromHexString('#262626') }}
      >
        <UiEntity
          uiTransform={{
            width: 18 * getScaleFactor(),
            height: 18 * getScaleFactor(),
            margin: { right: 8 * getScaleFactor() }
          }}
          uiBackground={{
            texture: { src: info.iconSrc },
            textureMode: 'stretch'
          }}
        />
        <Label
          value={info.message}
          fontSize={12 * getScaleFactor()}
          textAlign="middle-left"
          color={Color4.fromHexString('#FFFFFF')}
          uiTransform={{ width: 'auto', height: 'auto', flexGrow: 1 }}
        />
      </UiEntity>
    )
  }

  createUi(): ReactEcs.JSX.Element | null {
    const isHost = this.isLocalHost()
    const moderation = this.getModerationInfo()
    const anonymity = this.getAnonymityInfo()

    const showModerationBanner = !isHost && moderation.enabled
    const showAnonymityBanner = !isHost && anonymity.enabled

    return (
      <ModalWindow
        visible={this.isVisible}
        onClosePressed={() => {
          this.isVisible = false
        }}
        key={this.uiVersion}
      >
        <ModalTitle value="<b>Ask a question</b>" />

        <Label
          uiTransform={{
            width: '100%',
            height: 20 * getScaleFactor(),
            margin: { bottom: 40 * getScaleFactor(), top: 6 * getScaleFactor() }
          }}
          fontSize={primaryTheme.smallFontSize}
          textAlign="middle-center"
          value="Submit a question to the current open Q&A session"
        />

        <LabeledInput
          labelProps={{ value: 'QA Question' }}
          inputProps={{
            placeholder: 'Type your question...',
            onChange: (val) => {
              this.questionText = val
            }
          }}
        />

        <Label
          value={`${this.questionText.length} / ${this.questionMaxLength} characters`}
          fontSize={primaryTheme.smallFontSize}
          textAlign="middle-left"
          color={this.questionText.length > this.questionMaxLength ? Color4.Red() : Color4.White()}
          uiTransform={{
            width: '100%',
            height: 15 * getScaleFactor(),
            margin: { top: 5 * getScaleFactor(), bottom: 10 * getScaleFactor() }
          }}
        />

        <UiEntity
          uiTransform={{
            width: '100%',
            flexDirection: 'column',
            alignItems: 'stretch',
            margin: { bottom: 18 * getScaleFactor() }
          }}
        />

        <ModalButtonsContainer>
          <ModalButton
            text="Send"
            isDisabled={!this.isQuestionValid()}
            onClick={() => {
              this.sendQuestion()
            }}
          />
        </ModalButtonsContainer>

        {showModerationBanner && this.renderBanner(moderation)}

        {showAnonymityBanner && this.renderBanner(anonymity)}
      </ModalWindow>
    )
  }

  clearUI(): void {
    this.uiVersion++
  }

  private sendQuestion(): void {
    const text = this.questionText.trim().slice(0, this.questionMaxLength)
    if (text.length === 0) return

    const qaEntity = findFirstOpenQAEntity()
    if (qaEntity == null) {
      console.log('[AskQuestionUI] No open Q&A session found.')
      return
    }

    const qaState = QAState.getOrNull(qaEntity)
    if (qaState == null) {
      console.log('[AskQuestionUI] QAState not found on the entity.')
      return
    }
    if (qaState.closed) {
      console.log('[AskQuestionUI] The Q&A session is closed.')
      return
    }

    const player = getPlayer()
    const userId = player?.userId ?? 'unknown'

    const isHostNow = this.gameController.playerController.isHost(userId)
    const isTrusted = isHostNow

    const requiresApproval =
      (qaState as any).requiresApprovalForUntrusted === true ||
      (qaState as any).moderated === true ||
      (qaState as any).reviewBeforePublish === true

    addQuestionToQA(qaEntity, text, userId, isTrusted)

    const willGoToReview = requiresApproval && !isTrusted
    console.log(
      `[AskQuestionUI] Sent. ${willGoToReview ? 'It will remain in TO_REVIEW until approved.' : 'Published instantly.'}`
    )

    this.isVisible = false
    this.questionText = ''
    utils.timers.setTimeout(() => {
      this.clearUI()
      this.gameController.uiQaQueue.panelVisible = true
      // this.gameController.uiQaDebug.show()
    }, 0)
  }
}
