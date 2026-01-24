import * as utils from '@dcl-sdk/utils'
import { Color4 } from '@dcl/sdk/math'
import ReactEcs, { type EntityPropTypes, Input, Label, UiEntity, type UiTransformProps } from '@dcl/sdk/react-ecs'
import { merge } from 'ts-deepmerge'
import { ActivityType, setCurrentActivity } from '../activities/activitiesEntity'
import { getScaleFactor } from '../canvas/Canvas'
import { type GameController } from '../controllers/game.controller'
import { createPollEntity, pollRegistry } from '../polls/pollEntity'
import { ModalButton } from './components/buttons'
import { HorizontalLabeledControl, VerticalLabeledControl } from './components/labeledControl'
import { LabeledInput } from './components/labeledInput'
import { ModalTitle } from './components/modalTitle'
import { ModalButtonsContainer, ModalWindow } from './components/modalWindow'
import { Switch } from './components/switch'
import { primaryTheme } from './themes/themes'

type PagedInputsProps = {
  elements: string[]
  onChange: (newValues: string[]) => void
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
  const { elements, elementsPerPage, minElements, maxElements, onChange, maxLengthPerInput, ...rest } = merge(
    { elementsPerPage: 2, uiTransform: defaultTransformProps },
    props
  ) as PagedInputsProps & { elementsPerPage: number }

  const paddedElements = [...elements]
  if (minElements !== undefined && paddedElements.length < minElements) {
    for (let i = paddedElements.length; i < minElements; i++) {
      paddedElements.push('')
    }
  }

  const initialIndex = currentPage * elementsPerPage
  const lastPage = Math.max(Math.ceil(paddedElements.length / elementsPerPage) - 1, 0)

  const inputs: ReactEcs.JSX.Element[] = []

  for (let i = 0; i < paddedElements.length; i++) {
    const valueLen = paddedElements[i]?.length ?? 0
    const limit = maxLengthPerInput ?? 20
    const overLimit = valueLen > limit

    inputs.push(
      <UiEntity
        uiBackground={{
          texture: { src: 'assets/scene/Images/team-hub/ui/dark_input_background.png' },
          textureMode: 'nine-slices',
          textureSlices: { left: 0, right: 0, top: 0, bottom: 0 }
        }}
        uiTransform={{
          display: i >= initialIndex && i < initialIndex + elementsPerPage ? 'flex' : 'none',
          height: 45 * getScaleFactor(),
          width: 'auto',
          flexDirection: 'column',
          margin: { bottom: 5 * getScaleFactor() }
        }}
        key={i}
      >
        <Input
          color={Color4.Black()}
          fontSize={16 * getScaleFactor()}
          uiTransform={{ width: '100%', height: 36 * getScaleFactor() }}
          placeholder={`Option ${i + 1}`}
          onChange={(val) => {
            const updated = [...paddedElements]
            updated[i] = val
            onChange(updated)
          }}
        />
        <Label
          value={`${valueLen} / ${limit}`}
          fontSize={9 * getScaleFactor()}
          textAlign="middle-right"
          color={overLimit ? Color4.Red() : Color4.White()}
          uiTransform={{
            positionType: 'absolute',
            position: { right: 10 * getScaleFactor(), bottom: -5 * getScaleFactor() },
            width: 'auto',
            height: 'auto'
          }}
        />
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: {
              right: 10 * getScaleFactor(),
              top: 8 * getScaleFactor()
            },
            width: 18 * getScaleFactor(),
            height: 19.8 * getScaleFactor(),
            display:
              // Because of a bug, only the last input can be deleted and everything be kept consistent. So we limit the trash can to that one
              minElements === undefined || (i > minElements - 1 && i === paddedElements.length - 1) ? 'flex' : 'none'
          }}
          onMouseDown={() => {
            const updated = [...paddedElements]
            updated.splice(i, 1)
            onChange(updated)
          }}
          uiBackground={{
            texture: { src: 'assets/scene/Images/team-hub/ui/trash_can.png' },
            textureMode: 'stretch'
          }}
        />
      </UiEntity>
    )
  }

  return (
    <UiEntity {...rest}>
      <UiEntity uiTransform={{ flexDirection: 'column', width: '100%', height: 'auto' }}>{...inputs}</UiEntity>

      <UiEntity
        uiTransform={{
          width: '100%',
          height: 45 * getScaleFactor(),
          padding: { left: 8 * getScaleFactor() },
          display: maxElements === undefined || paddedElements.length < maxElements ? 'flex' : 'none'
        }}
        uiBackground={{
          texture: { src: 'assets/scene/Images/team-hub/ui/dark_input_button.png' },
          textureMode: 'nine-slices',
          textureSlices: { left: 0, right: 0, top: 0, bottom: 0 }
        }}
        onMouseDown={() => {
          const updated = [...paddedElements, '']
          onChange(updated)
          setCurrentPage(Math.max(Math.ceil(updated.length / elementsPerPage) - 1, 0))
        }}
        key={'Add answer'}
      >
        <Label
          value="Add answer"
          fontSize={primaryTheme.smallFontSize}
          textAlign="middle-left"
          uiTransform={{ width: '100%', height: 35 * getScaleFactor() }}
        />
      </UiEntity>

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

export class CreatePollUI {
  public createPollUiVisibility: boolean = false
  private isAnonymous: boolean = false
  public questionTitle: string = ''
  public options: string[] = ['', '']
  private uiVersion: number = 0
  public titleMaxLength = 30
  public maxAnswerLength = 20

  constructor(private readonly gameController: GameController) {}

  openUI(): void {
    this.createPollUiVisibility = true
  }

  createUi(): ReactEcs.JSX.Element | null {
    if (this.gameController.uiController.canvasInfo === null) return null

    const titleLen = this.questionTitle.length
    const titleOver = titleLen > this.titleMaxLength

    return (
      <ModalWindow
        visible={this.createPollUiVisibility}
        onClosePressed={() => {
          this.createPollUiVisibility = false
        }}
        key={this.uiVersion}
      >
        <UiEntity
          uiTransform={{
            flexDirection: 'column',
            width: '100%',
            height: 'auto',
            margin: { top: -20 * getScaleFactor() }
          }}
        >
          <ModalTitle value="Create your poll" />

          <Label
            uiTransform={{
              width: '100%',
              height: 20 * getScaleFactor(),
              margin: { bottom: 20 * getScaleFactor() }
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
            }}
          />

          <Label
            value={`${titleLen} / ${this.titleMaxLength} characters`}
            fontSize={12 * getScaleFactor()}
            textAlign="middle-left"
            color={titleOver ? Color4.Red() : Color4.White()}
            uiTransform={{
              width: '100%',
              height: 15 * getScaleFactor(),
              margin: { top: 5 * getScaleFactor(), bottom: 5 * getScaleFactor() }
            }}
          />

          <VerticalLabeledControl
            labelProps={{
              value: '<b>Options:</b>',
              uiTransform: {
                margin: {
                  top: 0,
                  bottom: 8 * getScaleFactor()
                }
              }
            }}
          />

          <PagedInputs
            elements={this.options}
            onChange={(updatedOptions) => {
              this.options = updatedOptions
            }}
            minElements={2}
            maxElements={4}
            maxLengthPerInput={this.maxAnswerLength}
            uiTransform={{ height: 150 * getScaleFactor() }}
          />

          <HorizontalLabeledControl
            labelProps={{
              value: '<b>Anonymous</b>',
              fontSize: primaryTheme.smallFontSize,
              color: primaryTheme.fontColor,
              textAlign: 'middle-left'
            }}
            uiTransform={{
              justifyContent: 'space-between',
              margin: { top: 5 * getScaleFactor() }
            }}
          >
            <Switch
              initialValue={this.isAnonymous}
              onChange={(val) => {
                this.isAnonymous = val
              }}
            />
          </HorizontalLabeledControl>
        </UiEntity>

        <ModalButtonsContainer>
          <ModalButton
            text="Create"
            isDisabled={!this.areInputsValid()}
            onClick={() => {
              this.create()
            }}
          />
        </ModalButtonsContainer>
      </ModalWindow>
    )
  }

  clearUI(): void {
    this.questionTitle = ''
    this.options = ['', '']
    this.isAnonymous = false
    this.uiVersion++
  }

  validAnswers(): string[] {
    return this.options.filter((a) => a.trim() !== '')
  }

  areInputsValid(): boolean {
    const valid = this.validAnswers()
    const allAnswersWithinLimit = valid.every((a) => a.length <= this.maxAnswerLength)
    return (
      this.questionTitle.trim() !== '' &&
      this.questionTitle.length <= this.titleMaxLength &&
      valid.length >= 2 &&
      allAnswersWithinLimit
    )
  }

  create(): void {
    if (!this.areInputsValid()) return

    const { pollId } = createPollEntity(this.questionTitle, this.validAnswers(), this.isAnonymous)

    const pollEntity = pollRegistry.get(pollId)
    if (pollEntity == null) return

    setCurrentActivity(this.gameController.activitiesEntity, pollId, ActivityType.POLL)

    this.createPollUiVisibility = false
    utils.timers.setTimeout(() => {
      this.clearUI()
    }, 0)
  }
}
