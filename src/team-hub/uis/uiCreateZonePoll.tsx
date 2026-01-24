import { engine } from '@dcl/sdk/ecs'
import { syncEntity } from '@dcl/sdk/network'
import ReactEcs, { type EntityPropTypes, Input, Label, UiEntity, type UiTransformProps } from '@dcl/sdk/react-ecs'
import { getPlayer } from '@dcl/sdk/src/players'
import { pushSyncedMessage } from '../messagebus/messagebus'
import { generateId } from '../utils'
import { ZonePollState } from '../zonePolls/pollEntity'

import { Color4 } from '@dcl/sdk/math'
import { merge } from 'ts-deepmerge'
import { ActivityType, setCurrentActivity } from '../activities/activitiesEntity'
import { getScaleFactor } from '../canvas/Canvas'
import { type GameController } from '../controllers/game.controller'
import { ModalButton } from './components/buttons'
import { VerticalLabeledControl } from './components/labeledControl'
import { LabeledInput } from './components/labeledInput'
import { ModalTitle } from './components/modalTitle'
import { ModalButtonsContainer, ModalWindow } from './components/modalWindow'
import { primaryTheme } from './themes/themes'
import { zoneIcons } from '../zonePolls/zonePollSystem'
import * as utils from '@dcl-sdk/utils'
type PagedInputsProps = {
  elements: string[]
  elementsPerPage?: number
  minElements?: number
  maxElements?: number
  maxLengthPerInput?: number
} & EntityPropTypes

function PagedInputs(props: PagedInputsProps): ReactEcs.JSX.Element {
  const [currentPage, setCurrentPage] = ReactEcs.useState(0)
  const defaultTransformProps: UiTransformProps = {
    width: '100%',
    height: 'auto',
    flexDirection: 'column'
  }
  const { elements, elementsPerPage, minElements, maxElements, ...rest } = merge(
    { elementsPerPage: 2, uiTransform: defaultTransformProps },
    props
  ) as PagedInputsProps & { elementsPerPage: number }

  if (minElements !== undefined && elements.length < minElements) {
    elements.fill('', 0, minElements)
  }

  const inputs: ReactEcs.JSX.Element[] = []

  const initialIndex = currentPage * elementsPerPage
  const lastPage = Math.max(Math.ceil(elements.length / elementsPerPage) - 1, 0)

  for (let i = 0; i < elements.length; i++) {
    inputs.push(
      <UiEntity
        uiBackground={{
          texture: { src: 'assets/scene/Images/team-hub/ui/dark_input_background.png' },
          textureMode: 'nine-slices',
          textureSlices: { left: 0.06, right: 0.06, top: 0.3, bottom: 0.55 }
        }}
        uiTransform={{
          display: i >= initialIndex && i < initialIndex + elementsPerPage ? 'flex' : 'none',
          height: 'auto',
          width: 'auto',
          padding: { bottom: 6 * getScaleFactor() },
          margin: { bottom: 10 * getScaleFactor() }
        }}
      >
        <UiEntity
          uiTransform={{
            width: 18 * getScaleFactor(),
            height: 16 * getScaleFactor(),
            margin: {
              right: 6 * getScaleFactor(),
              top: 6 * getScaleFactor(),
              left: 8 * getScaleFactor()
            }
          }}
          uiBackground={{
            texture: { src: zoneIcons[i % zoneIcons.length] },
            textureMode: 'stretch'
          }}
        />
        <Input
          color={Color4.Black()}
          fontSize={16 * getScaleFactor()}
          uiTransform={{ width: '100%', height: 30 * getScaleFactor() }}
          onChange={(val) => {
            elements[i] = val
          }}
        ></Input>
        <Label
          value={`${elements[i]?.length ?? 0} / ${props.maxLengthPerInput ?? 20}`}
          fontSize={9 * getScaleFactor()}
          textAlign="middle-right"
          color={elements[i]?.length > (props.maxLengthPerInput ?? 20) ? Color4.Red() : Color4.White()}
          uiTransform={{
            positionType: 'absolute',
            position: {
              right: 10 * getScaleFactor(),
              bottom: -8 * getScaleFactor()
            },
            width: 'auto',
            height: 'auto'
          }}
        />

        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: {
              right: 10 * getScaleFactor(),
              top: 5 * getScaleFactor()
            },
            width: 18 * getScaleFactor(),
            height: 19.8 * getScaleFactor(),
            display: minElements === undefined || i > minElements - 1 ? 'flex' : 'none'
          }}
          onMouseDown={() => {
            elements.splice(i, 1)
          }}
          uiBackground={{
            texture: { src: 'assets/scene/Images/team-hub/ui/trash_can.png' },
            textureMode: 'stretch'
          }}
        ></UiEntity>
      </UiEntity>
    )
  }

  return (
    <UiEntity {...rest}>
      <UiEntity uiTransform={{ flexDirection: 'column', width: '100%', height: 'auto' }}>{...inputs}</UiEntity>
      {(maxElements === undefined || elements.length < maxElements) && (
        <UiEntity
          uiTransform={{
            width: '100%',
            height: 'auto',
            padding: {
              left: 6 * getScaleFactor(),
              bottom: 6 * getScaleFactor()
            }
          }}
          uiBackground={{
            texture: { src: 'assets/scene/Images/team-hub/ui/dark_input_button.png' },
            textureMode: 'nine-slices',
            textureSlices: { left: 0.06, right: 0.06, top: 0.3, bottom: 0.55 }
          }}
          onMouseDown={() => {
            elements.push('')
            setCurrentPage(Math.max(Math.ceil(elements.length / elementsPerPage) - 1, 0))
          }}
        >
          <Label
            value="Add answer"
            fontSize={primaryTheme.smallFontSize}
            textAlign="middle-left"
            uiTransform={{
              width: '100%',
              height: 30 * getScaleFactor(),
              margin: { left: 6, bottom: 3 }
            }}
          ></Label>
        </UiEntity>
      )}

      {currentPage > 0 && (
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { left: -21.5 * getScaleFactor(), top: '33%' },
            margin: { top: -13 * getScaleFactor() },
            width: 16.5 * getScaleFactor(),
            height: 26 * getScaleFactor()
          }}
          uiBackground={{
            textureMode: 'stretch',
            texture: { src: 'assets/scene/Images/team-hub/ui/arrow_left.png' }
          }}
          onMouseDown={() => {
            setCurrentPage(Math.max(currentPage - 1, 0))
          }}
        />
      )}

      {currentPage < lastPage && (
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { right: -21.5 * getScaleFactor(), top: '33%' },
            margin: { top: -13 * getScaleFactor() },
            width: 16.5 * getScaleFactor(),
            height: 26 * getScaleFactor()
          }}
          uiBackground={{
            textureMode: 'stretch',
            texture: { src: 'assets/scene/Images/team-hub/ui/arrow_right.png' }
          }}
          onMouseDown={() => {
            setCurrentPage(Math.min(currentPage + 1, lastPage))
          }}
        />
      )}
    </UiEntity>
  )
}
export class ZonePollUI {
  public createZonePollUiVisibility: boolean = false
  public switchOn: boolean = false
  public switchOnTexture: string = 'assets/scene/Images/team-hub/createpollui/switchOn.png'
  public switchOffTexture: string = 'assets/scene/Images/team-hub/createpollui/switchOff.png'
  public switchTexture: string = this.switchOffTexture
  public questionTitle: string = ''
  public answers: string[] = ['', '']
  public gameController: GameController
  public answerScrollIndex: number = 0
  public maxAnswers: number = 4
  public addAnswerButtonDisabled: Color4 | undefined = undefined
  public options: string[] = ['', '']
  public uiVersion = 0
  public titleMaxLength = 30
  public maxAnswerLength = 20

  constructor(gameController: GameController) {
    this.gameController = gameController
  }

  openUI(): void {
    this.createZonePollUiVisibility = true
  }

  createUi(): ReactEcs.JSX.Element | null {
    if (this.gameController.uiController.canvasInfo === null) return null
    return (
      <ModalWindow
        visible={this.createZonePollUiVisibility}
        onClosePressed={() => {
          this.createZonePollUiVisibility = false
        }}
        key={this.uiVersion}
      >
        <ModalTitle value="Zone Poll"></ModalTitle>
        <Label
          uiTransform={{
            width: '100%',
            height: 20 * getScaleFactor(),
            margin: { bottom: 25 * getScaleFactor() }
          }}
          fontSize={primaryTheme.smallFontSize}
          textAlign="middle-center"
          value="Add a question and at least 2 options."
        />
        <LabeledInput
          labelProps={{ value: '<b>Question Title: </b>' }}
          inputProps={{
            onChange: (value) => {
              this.questionTitle = value
            },
            placeholder: 'Write here'
            // value: this.questionTitle
          }}
        />

        <Label
          value={`${this.questionTitle.length} / ${this.titleMaxLength} characters`}
          fontSize={primaryTheme.smallFontSize}
          textAlign="middle-left"
          color={this.questionTitle.length > this.titleMaxLength ? Color4.Red() : Color4.White()}
          uiTransform={{
            width: '100%',
            height: 15 * getScaleFactor(),
            margin: { top: 6 * getScaleFactor(), bottom: 10 * getScaleFactor() }
          }}
        />

        <VerticalLabeledControl
          labelProps={{
            value: '<b>Options:</b>',
            uiTransform: {
              margin: {
                top: 10 * getScaleFactor(),
                bottom: 10 * getScaleFactor()
              }
            }
          }}
        ></VerticalLabeledControl>

        <PagedInputs
          elements={this.options}
          minElements={2}
          maxElements={4}
          uiTransform={{ height: 140 * getScaleFactor() }}
        ></PagedInputs>
        <ModalButtonsContainer>
          <ModalButton
            text="Create"
            isDisabled={!this.areInputsValid()}
            onClick={() => {
              this.create()
              pushSyncedMessage('createZonePollUi', {})
            }}
          ></ModalButton>
        </ModalButtonsContainer>
      </ModalWindow>
    )
  }

  validAnswers(): string[] {
    return this.options.filter((a) => a.trim() !== '')
  }

  areInputsValid(): boolean {
    const valid = this.validAnswers()
    const allAnswersWithinLimit = valid.every((answer) => answer.length <= this.maxAnswerLength)

    return (
      this.questionTitle.trim() !== '' &&
      this.questionTitle.length <= this.titleMaxLength &&
      valid.length >= 2 &&
      allAnswersWithinLimit
    )
  }

  addAnswer(): void {
    if (this.answers.length < this.maxAnswers) {
      this.answers.push('')
      if (this.answers.length > 2) {
        this.answerScrollIndex = 1
      }
    }
    this.updateAddAnswerButtonColor()
  }

  updateAddAnswerButtonColor(): void {
    if (this.answers.length >= this.maxAnswers) {
      this.addAnswerButtonDisabled = Color4.Gray()
    } else {
      this.addAnswerButtonDisabled = undefined
    }
  }

  scrollRight(): void {
    if (this.answers.length > 2) {
      this.answerScrollIndex = 1
    }
  }

  scrollLeft(): void {
    this.answerScrollIndex = 0
  }

  canScrollLeft(): boolean {
    return this.answers.length > 2 && this.answerScrollIndex > 0
  }

  canScrollRight(): boolean {
    return this.answers.length > 2 && this.answerScrollIndex < Math.floor((this.answers.length - 1) / 2)
  }

  clearUI(): void {
    this.questionTitle = ''
    this.options = ['', '']
    this.uiVersion++
  }

  create(): void {
    this.createZonePollUiVisibility = false

    const question = this.questionTitle
    const options = this.options
    const player = getPlayer()
    const creatorId = player?.userId

    const dataEntity = engine.addEntity()
    const idPoll = generateId('ZonePoll')
    ZonePollState.create(dataEntity, {
      id: idPoll,
      pollId: idPoll,
      question,
      options,
      zoneCounts: Array(options.length).fill(0),
      creatorId,
      closed: false,
      startTime: Date.now()
    })

    syncEntity(dataEntity, [ZonePollState.componentId])
    if (creatorId !== undefined) {
      setCurrentActivity(this.gameController.activitiesEntity, idPoll, ActivityType.ZONEPOLL)
    }
    utils.timers.setTimeout(() => {
      this.clearUI()
    }, 0)
  }
}
