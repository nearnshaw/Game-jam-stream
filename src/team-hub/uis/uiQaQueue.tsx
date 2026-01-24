/* eslint-disable @typescript-eslint/no-unused-vars */
import ReactEcs, { Button, Label, UiEntity } from '@dcl/sdk/react-ecs'
import { Color4 } from '@dcl/sdk/math'
import { engine, type Entity } from '@dcl/sdk/ecs'
import { getScaleFactor } from '../canvas/Canvas'
import { ModalWindow } from './components/modalWindow'
import { ModalTitle } from './components/modalTitle'
import { type GameController } from '../controllers/game.controller'
import {
  QAState,
  type QAStateType,
  findFirstOpenQAEntity,
  removeQuestionFromQA,
  setQuestionStateInQA,
  toggleVoteQuestionInQA,
  getVoteCount as getVoteCountFromState,
  getQuestionsForQA,
  hasUserVotedById
} from '../qa/qaEntity'
import { withPlayerInfo } from '../utils'

type QuestionId = string

export enum QuestionState {
  TO_REVIEW = 'toReview',
  NEW = 'new',
  ANSWERED = 'answered'
}

type QuestionItem = {
  id: QuestionId
  text: string
  author: string
  authorId?: string | null
  createdAt: number
  voteCount: number
  state: QuestionState
}

enum TabKey {
  TO_REVIEW = 'to_review',
  NEW = 'new',
  ANSWERED = 'answered'
}

enum SortMode {
  NEWEST = 'newest',
  TOP = 'top'
}

export class QAQueueUI {
  panelVisible = false
  sessionTitle = ''

  private qaEntity: Entity | null = null
  private snapshot: QAStateType | null = null

  private isHost = false
  private player_id = ''

  private activeTab: TabKey = TabKey.NEW

  private sys?: (dt: number) => void
  private acc = 0
  private readonly REFRESH_EVERY = 0.35

  private readonly sortMode: SortMode = SortMode.NEWEST

  private orderSig = ''
  private orderEpoch = 0
  private isRefreshing = false
  private refreshQueued = false

  private readonly itemsPerPage = 3
  private currentPage = 0

  private cachedAll: QuestionItem[] = []
  private cachedFiltered: QuestionItem[] = []
  private cachedVisible: QuestionItem[] = []
  private cachedHasQuestions = false
  private cachedTotalPages = 1
  private cachedCounts = { toReview: 0, newCount: 0, answered: 0 }

  private pendingDelete: QuestionItem | null = null

  private currentQaId: string | null = null
  private isFrozen = false
  private frozenQaId: string | null = null
  private frozenList: QuestionItem[] = []
  private frozenTitle = ''

  private isUILocked(): boolean {
    return this.isFrozen || (this.snapshot != null && this.snapshot.closed)
  }

  private readonly sortByNewest = (a: QuestionItem, b: QuestionItem): number => b.createdAt - a.createdAt

  private readonly sortByTop = (a: QuestionItem, b: QuestionItem): number => {
    if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount
    return b.createdAt - a.createdAt
  }

  private computeOrderSig(list: QuestionItem[]): string {
    return list.map((q) => q.id).join('|')
  }

  private getTotalPages(listLen: number): number {
    const total = Math.ceil(listLen / this.itemsPerPage)
    return total > 0 ? total : 1
  }

  private goToPreviousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage -= 1
      this.refresh()
    }
  }

  private goToNextPage(totalPages: number): void {
    if (this.currentPage < totalPages - 1) {
      this.currentPage += 1
      this.refresh()
    }
  }

  constructor(private readonly gameController: GameController) {
    withPlayerInfo((player) => {
      this.player_id = player.userId
      this.isHost = this.gameController.playerController.isHost(player.userId)
    })
    this.gameController.playerController.onHostChange((_hosts) => {
      withPlayerInfo((player) => {
        this.isHost = this.gameController.playerController.isHost(player.userId)
        if (!this.isHost && this.activeTab === TabKey.TO_REVIEW) this.setActiveTab(TabKey.NEW)
      })
    })
  }

  open(title: string, qaState?: QAStateType): void {
    this.sessionTitle = title
    this.panelVisible = true
    this.activeTab = qaState?.closed === true ? TabKey.ANSWERED : TabKey.NEW

    if (qaState != null) {
      this.qaEntity = findFirstOpenQAEntity()
      this.snapshot = qaState
    }

    this.refresh()
    this.ensureSystem()
  }

  close(): void {
    this.panelVisible = false
  }

  private ensureSystem(): void {
    if (this.sys != null) return
    this.sys = (dt: number) => {
      if (!this.panelVisible) return
      this.acc += dt
      if (this.acc < this.REFRESH_EVERY) return
      this.acc = 0
      this.refresh()
    }
    engine.addSystem(this.sys)
  }

  private refresh(): void {
    if (this.isRefreshing) {
      this.refreshQueued = true
      return
    }
    this.isRefreshing = true

    try {
      this.qaEntity = findFirstOpenQAEntity()
      this.snapshot = this.qaEntity != null ? QAState.getOrNull(this.qaEntity) : null

      const incomingId = this.snapshot?.id ?? null

      if (incomingId != null && incomingId !== this.currentQaId) {
        this.currentQaId = incomingId
        this.isFrozen = false
        this.frozenQaId = null
        this.frozenList = []
        this.frozenTitle = ''
        this.currentPage = 0
      }

      if (this.snapshot == null && this.currentQaId != null && !this.isFrozen) {
        if (this.currentQaId != null && this.currentQaId !== '') {
          this.isFrozen = true
          this.frozenQaId = this.currentQaId
          this.frozenList = this.cachedAll.slice()
          this.frozenTitle = this.sessionTitle
        }
      }

      if (this.snapshot != null && (typeof this.sessionTitle !== 'string' || this.sessionTitle === '')) {
        this.sessionTitle =
          typeof this.snapshot.title === 'string' && this.snapshot.title !== '' ? this.snapshot.title : ''
      }

      let all: QuestionItem[]
      if (this.isFrozen && this.frozenQaId === this.currentQaId) {
        all = this.frozenList.slice()
      } else {
        const live = this.getQuestions()
        if (this.snapshot?.closed === true) {
          this.isFrozen = true
          this.frozenQaId = (this.snapshot as any)?.id ?? this.currentQaId
          this.frozenList = live
          this.frozenTitle = this.sessionTitle
          all = this.frozenList.slice()
        } else {
          all = live
        }
      }
      this.cachedAll = all

      let toReview = 0
      let newCount = 0
      let answered = 0
      for (const q of all) {
        if (q.state === QuestionState.TO_REVIEW) toReview++
        else if (q.state === QuestionState.NEW) newCount++
        else if (q.state === QuestionState.ANSWERED) answered++
      }
      this.cachedCounts = { toReview, newCount, answered }

      const filtered: QuestionItem[] = this.getFilteredQuestions(all)
      this.cachedFiltered = filtered

      const totalPages = this.getTotalPages(filtered.length)
      if (this.currentPage > totalPages - 1) this.currentPage = totalPages - 1
      if (this.currentPage < 0) this.currentPage = 0
      this.cachedTotalPages = totalPages

      const start = this.currentPage * this.itemsPerPage
      const end = Math.min(start + this.itemsPerPage, filtered.length)
      const visible = filtered.slice(start, end)
      this.cachedVisible = visible
      this.cachedHasQuestions = visible.length > 0

      const newSig = this.computeOrderSig(filtered) + `#p${this.currentPage}`
      if (newSig !== this.orderSig) {
        this.orderSig = newSig
        this.orderEpoch = (this.orderEpoch + 1) % 1_000_000
      }
    } finally {
      this.isRefreshing = false
      if (this.refreshQueued) {
        this.refreshQueued = false
        this.refresh()
      }
    }
  }

  // ---------- helpers ----------
  private setActiveTab(tab: TabKey): void {
    const next = !this.isHost && tab === TabKey.TO_REVIEW ? TabKey.NEW : tab
    if (this.activeTab !== next) {
      this.activeTab = next
      this.currentPage = 0
      this.refresh()
    }
  }

  private isCurrentQaClosed(): boolean {
    return this.snapshot != null && this.snapshot.closed
  }

  private getCardBgForActiveTab(): Color4 {
    switch (this.activeTab) {
      case TabKey.TO_REVIEW:
        return Color4.fromHexString('#F15A24')
      case TabKey.NEW:
        return Color4.fromHexString('#161518')
      case TabKey.ANSWERED:
        return Color4.fromHexString('#2B2B2F')
      default:
        return Color4.fromHexString('#161518')
    }
  }

  private formatAuthorFromUserId(userId: string | null | undefined, anonymous?: boolean): string {
    const isAnon = anonymous === true
    if (isAnon) return 'Anonymous'
    if (!this.hasNonEmptyString(userId)) {
      return 'User #????'
    }
    const player = this.gameController.playerController.getPlayer(userId)
    const name = player?.name ?? 'User'
    const last4 = userId.slice(-4)
    return `${name} #${last4}`
  }

  private hasNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.length > 0
  }

  private getQuestions(): QuestionItem[] {
    const qaId = this.snapshot?.id ?? this.currentQaId
    if (typeof qaId !== 'string' || qaId === '') return []

    const rows = getQuestionsForQA(qaId)
    const anonymous = this.snapshot?.anonymous === true

    const list: QuestionItem[] = rows.map(({ data }) => {
      const userId = typeof data.userId === 'string' && data.userId.length > 0 ? data.userId : null
      return {
        id: data.id,
        text: data.text,
        author: this.formatAuthorFromUserId(userId ?? undefined, anonymous),
        authorId: userId,
        createdAt: Number(data.createdAt),
        voteCount: getVoteCountFromState(data),
        state: data.state as QuestionState
      }
    })

    return list
  }

  private getFilteredQuestions(allIn?: QuestionItem[]): QuestionItem[] {
    const all = allIn ?? this.getQuestions()
    let list: QuestionItem[]
    switch (this.activeTab) {
      case TabKey.TO_REVIEW:
        list = all.filter((q) => q.state === QuestionState.TO_REVIEW)
        break
      case TabKey.NEW:
        list = all.filter((q) => q.state === QuestionState.NEW)
        break
      case TabKey.ANSWERED:
        list = all.filter((q) => q.state === QuestionState.ANSWERED)
        break
      default:
        list = all
    }
    const sorter = this.activeTab === TabKey.NEW ? this.sortByTop : this.sortByNewest
    return list.sort(sorter)
  }

  private canVote(q: QuestionItem): boolean {
    return !this.isUILocked() && this.activeTab !== TabKey.ANSWERED && q.state === QuestionState.NEW
  }

  // ---------- actions ----------
  private approveQuestion(q: QuestionItem): void {
    if (this.isUILocked() || this.qaEntity == null) return
    const next = q.state === QuestionState.TO_REVIEW ? QuestionState.NEW : QuestionState.ANSWERED
    setQuestionStateInQA(this.qaEntity, q.id, next)
    this.refresh()
  }

  private markAsNew(q: QuestionItem): void {
    if (this.isUILocked() || this.qaEntity == null) return
    setQuestionStateInQA(this.qaEntity, q.id, QuestionState.NEW)
    this.refresh()
  }

  private removeQuestion(qid: QuestionId): void {
    if (this.isUILocked() || this.qaEntity == null) return
    removeQuestionFromQA(this.qaEntity, qid)
    this.refresh()
  }

  private toggleVote(q: QuestionItem): void {
    if (this.isUILocked() || this.qaEntity == null || !this.canVote(q)) return
    if (typeof this.player_id !== 'string' || this.player_id === '') return
    toggleVoteQuestionInQA(this.qaEntity, q.id, this.player_id)
    this.refresh()
  }

  private truncate(text: string, max = 140): string {
    if (typeof text !== 'string') return ''
    return text.length > max ? text.slice(0, max - 1) + '…' : text
  }

  private openDeleteConfirm(q: QuestionItem): void {
    this.pendingDelete = q
  }

  private closeDeleteConfirm(): void {
    this.pendingDelete = null
  }

  private renderDeleteConfirm(): ReactEcs.JSX.Element {
    if (this.pendingDelete == null) return <UiEntity />
    const s = getScaleFactor()
    const k = 0.8
    return (
      <UiEntity
        uiTransform={{
          positionType: 'absolute',
          position: { left: '0%', top: '0%' },
          width: '100%',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { left: '0%', top: '0%' },
            width: '100%',
            height: '100%'
          }}
          uiBackground={{ color: Color4.create(0, 0, 0, 0) }}
          onMouseDown={() => {
            this.closeDeleteConfirm()
          }}
        />
        <UiEntity
          uiTransform={{
            width: 360 * k * s,
            height: 180 * k * s,
            padding: `${12 * k}px`,
            borderRadius: 10 * k * s,
            flexDirection: 'column',
            justifyContent: 'space-between',
            positionType: 'relative'
          }}
          uiBackground={{ color: Color4.fromHexString('#2B2B2F') }}
        >
          <Label
            value="<b>Delete question?</b>"
            fontSize={16 * k * s}
            color={Color4.White()}
            textAlign="middle-center"
            uiTransform={{
              width: '100%',
              margin: { top: 15 * s, bottom: 6 * k * s }
            }}
          />

          <Label
            value={`"${this.truncate(this.pendingDelete.text, 140)}"`}
            fontSize={12 * k * s}
            color={Color4.fromHexString('#C7C7C7')}
            textAlign="middle-center"
            uiTransform={{
              width: '100%',
              margin: { top: 4 * k * s, bottom: 12 * k * s }
            }}
          />

          <UiEntity
            uiTransform={{
              width: '100%',
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              margin: { top: 8 * k * s, bottom: 8 * k * s }
            }}
          >
            <Button
              variant="primary"
              value="Cancel"
              fontSize={13 * k * s}
              uiTransform={{
                width: 120 * k * s,
                height: 32 * k * s,
                borderRadius: 6 * k * s,
                margin: { right: 8 * k * s, bottom: 6 * k * s }
              }}
              onMouseDown={() => {
                this.closeDeleteConfirm()
              }}
            />
            <Button
              variant="primary"
              value="Delete"
              fontSize={13 * k * s}
              uiTransform={{
                width: 120 * k * s,
                height: 32 * k * s,
                borderRadius: 6 * k * s,
                margin: { bottom: 6 * k * s }
              }}
              onMouseDown={() => {
                if (this.pendingDelete !== null) this.removeQuestion(this.pendingDelete.id)
                this.closeDeleteConfirm()
              }}
            />
          </UiEntity>
        </UiEntity>
      </UiEntity>
    )
  }

  // ---------- UI bits ----------
  private TabButton(props: { label: string; active: boolean; onClick: () => void }): ReactEcs.JSX.Element {
    const s = getScaleFactor()
    return (
      <UiEntity
        uiTransform={{
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: `33.3%`,
          padding: '4px',
          margin: { left: '0px', right: '0px' }
        }}
        onMouseDown={props.onClick}
      >
        <Label
          value={props.label}
          fontSize={14 * s}
          color={props.active ? Color4.White() : Color4.fromHexString('#B8B8B8')}
        />
        {props.active && (
          <UiEntity
            uiTransform={{ width: 60 * s, height: 2 * s, margin: { top: '4px' } }}
            uiBackground={{ color: Color4.White() }}
          />
        )}
      </UiEntity>
    )
  }

  private IconButton(src: string, onClick: () => void, size = 18, marginTop = 0): ReactEcs.JSX.Element {
    const s = getScaleFactor()
    return (
      <UiEntity
        uiTransform={{ width: size * s, height: size * s, margin: { left: 6 * s, top: marginTop } }}
        uiBackground={{ textureMode: 'stretch', texture: { src } }}
        onMouseDown={onClick}
      />
    )
  }

  private createQuestionCard(q: QuestionItem, epoch: number): ReactEcs.JSX.Element {
    const s = getScaleFactor()
    const uiLocked = this.isUILocked()
    const inAnsweredTab = this.activeTab === TabKey.ANSWERED

    const isMine =
      typeof q.authorId === 'string' &&
      typeof this.player_id === 'string' &&
      q.authorId !== '' &&
      this.player_id !== '' &&
      q.authorId.toLowerCase() === this.player_id.toLowerCase()

    const canDelete = !uiLocked && (this.isHost || (isMine && !inAnsweredTab))

    // 🔁 NUEVO: nada de snapshot.questions — consultamos por id
    const votedByMe =
      typeof this.player_id === 'string' && this.player_id.length > 0 && hasUserVotedById(q.id, this.player_id)

    const voteIcon = votedByMe ? 'assets/scene/Images/team-hub/qaui/arrow_on.png' : 'assets/scene/Images/team-hub/qaui/arrow_off.png'
    const voteCount = q.voteCount

    const isVoteDisabled = !this.canVote(q)
    const voteIconTint = Color4.create(1, 1, 1, isVoteDisabled ? 0.35 : 1)
    const voteCountColor = Color4.create(1, 1, 1, isVoteDisabled ? 0.55 : 1)

    return (
      <UiEntity
        key={`q-${epoch}-${this.currentPage}-${q.id}`}
        uiTransform={{
          flexDirection: 'row',
          width: '100%',
          height: 82 * s,
          margin: { top: 5 * s, bottom: 5 * s },
          padding: 8 * s,
          borderRadius: 10,
          alignItems: 'stretch',
          justifyContent: 'space-between',
          borderColor: isMine ? Color4.Red() : undefined,
          borderWidth: isMine ? 2 : 0,
          flexShrink: 0
        }}
        uiBackground={{ color: this.getCardBgForActiveTab() }}
      >
        <UiEntity
          uiTransform={{
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            width: '78%',
            height: '100%',
            padding: { top: 8 * s },
            flexShrink: 0
          }}
        >
          <Label
            value={q.text}
            fontSize={11 * s}
            color={Color4.White()}
            textAlign="middle-left"
            uiTransform={{ margin: { left: 10 * s, bottom: 6 * s } }}
          />
          <Label
            value={q.author}
            fontSize={10 * s}
            color={q.state === QuestionState.TO_REVIEW ? Color4.Black() : Color4.fromHexString('#979696ff')}
            uiTransform={{ margin: { left: 10 * s, top: 10 * s } }}
          />
        </UiEntity>

        <UiEntity
          uiTransform={{
            flexDirection: 'column',
            alignItems: 'flex-end',
            justifyContent: 'center',
            width: '20%',
            flexShrink: 0
          }}
        >
          <UiEntity uiTransform={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
            <Label
              value={String(voteCount)}
              fontSize={12 * s}
              color={voteCountColor}
              uiTransform={{ margin: { right: '4px' } }}
            />

            {isVoteDisabled ? (
              <UiEntity
                uiTransform={{ width: 18 * s, height: 18 * s }}
                uiBackground={{ textureMode: 'stretch', texture: { src: voteIcon }, color: voteIconTint }}
              />
            ) : (
              this.IconButton(
                voteIcon,
                () => {
                  this.toggleVote(q)
                },
                18
              )
            )}
          </UiEntity>

          {!uiLocked &&
            this.isHost &&
            q.state !== QuestionState.ANSWERED &&
            this.IconButton(
              'assets/scene/Images/team-hub/qaui/ok_off.png',
              () => {
                this.approveQuestion(q)
              },
              18,
              2 * s
            )}
          {!uiLocked &&
            this.isHost &&
            inAnsweredTab &&
            q.state === QuestionState.ANSWERED &&
            this.IconButton(
              'assets/scene/Images/team-hub/qaui/back_arrow.png',
              () => {
                this.markAsNew(q)
              },
              18,
              3 * s
            )}

          {canDelete &&
            this.IconButton(
              'assets/scene/Images/team-hub/qaui/trash_can.png',
              () => {
                this.openDeleteConfirm(q)
              },
              18,
              4 * s
            )}
        </UiEntity>
      </UiEntity>
    )
  }

  // ---------- render ----------
  createUI(): ReactEcs.JSX.Element | null {
    if (!this.panelVisible) return null

    const s = getScaleFactor()
    const hasTitle = typeof this.sessionTitle === 'string' && this.sessionTitle.length > 0
    const titleText = hasTitle ? this.sessionTitle : 'Q&A Session'

    const { toReview, newCount, answered } = this.cachedCounts
    const totalPages = this.cachedTotalPages
    const visible = this.cachedVisible
    const visibleSafe = visible.length > this.itemsPerPage ? visible.slice(0, this.itemsPerPage) : visible

    const hasQuestions = this.cachedHasQuestions
    const uiLocked = this.isUILocked()
    return (
      <ModalWindow
        visible={this.panelVisible}
        onClosePressed={() => {
          this.close()
        }}
        uiTransform={{ width: 445 * s, height: 500 * s }}
      >
        <ModalTitle value={`<b>${titleText}</b>`} fontSize={20 * s} uiTransform={{ margin: { bottom: '5%' } }} />

        <UiEntity
          uiTransform={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            width: '100%',
            margin: { top: '6px', bottom: '6px' },
            padding: { left: 8 * s, right: 8 * s }
          }}
        >
          {this.isHost &&
            this.TabButton({
              label: toReview > 0 ? `To review (${toReview})` : 'To review',
              active: this.activeTab === TabKey.TO_REVIEW,
              onClick: () => {
                this.setActiveTab(TabKey.TO_REVIEW)
              }
            })}
          {this.isHost && <Label value="|" fontSize={14 * s} color={Color4.fromHexString('#6F6F6F')} />}
          {this.TabButton({
            label: newCount > 0 ? `New (${newCount})` : 'New',
            active: this.activeTab === TabKey.NEW,
            onClick: () => {
              this.setActiveTab(TabKey.NEW)
            }
          })}
          <Label value="|" fontSize={14 * s} color={Color4.fromHexString('#6F6F6F')} />
          {this.TabButton({
            label: answered > 0 ? `Answered (${answered})` : 'Answered',
            active: this.activeTab === TabKey.ANSWERED,
            onClick: () => {
              this.setActiveTab(TabKey.ANSWERED)
            }
          })}
        </UiEntity>

        {totalPages > 1 && (
          <UiEntity
            uiTransform={{
              positionType: 'absolute',
              position: { right: '4%', top: '48%' },
              alignSelf: 'flex-end',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28 * s,
              height: 'auto'
            }}
          >
            <Button
              variant="secondary"
              uiTransform={{ width: 20 * s, height: 22 * s, margin: { bottom: '6px' } }}
              uiBackground={{ textureMode: 'stretch', texture: { src: 'assets/scene/Images/team-hub/qaui/arrow_up.png' } }}
              onMouseDown={() => {
                this.goToPreviousPage()
              }}
              value={''}
            />
            <Label
              value={`${this.currentPage + 1}/${totalPages}`}
              fontSize={12 * s}
              color={Color4.fromHexString('#C7C7C7')}
            />
            <Button
              variant="secondary"
              uiTransform={{ width: 20 * s, height: 22 * s, margin: { top: '6px' } }}
              uiBackground={{ textureMode: 'stretch', texture: { src: 'assets/scene/Images/team-hub/qaui/arrow_down.png' } }}
              onMouseDown={() => {
                this.goToNextPage(totalPages)
              }}
              value={''}
            />
          </UiEntity>
        )}

        <UiEntity
          uiTransform={{
            positionType: 'relative',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            padding: 5 * s,
            margin: { top: 5 * s, left: 5 * s, right: 5 * s, bottom: 40 * s },
            width: '100%',
            height: 380 * s
          }}
        >
          {!hasQuestions && (
            <Label
              value="No questions yet — when participants ask, they'll appear here."
              fontSize={14 * s}
              color={Color4.fromHexString('#C7C7C7')}
              uiTransform={{ margin: '6px' }}
            />
          )}
          {hasQuestions && visibleSafe.map((q) => this.createQuestionCard(q, this.orderEpoch))}
        </UiEntity>

        <UiEntity
          uiTransform={{
            flexDirection: 'row',
            justifyContent: 'center',
            width: '100%',
            margin: { top: '10px', bottom: '5px' }
          }}
        >
          {(() => {
            const qaClosed = this.isCurrentQaClosed()
            return (
              <Button
                variant="primary"
                uiTransform={{ width: 150 * s, height: 30 * s, borderRadius: 5 * s }}
                uiBackground={uiLocked ? { color: Color4.fromHexString('#6F6F6F') } : undefined}
                onMouseDown={() => {
                  if (uiLocked) return
                  this.panelVisible = false
                  this.gameController.uiAskQuestion.isVisible = true
                }}
                value={uiLocked ? 'Questions Closed' : 'Ask Question'}
                fontSize={13 * s}
              />
            )
          })()}
        </UiEntity>
        {this.pendingDelete !== null && this.renderDeleteConfirm()}
      </ModalWindow>
    )
  }
}
