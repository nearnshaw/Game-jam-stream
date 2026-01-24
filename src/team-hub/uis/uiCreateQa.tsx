import * as utils from '@dcl-sdk/utils'
import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { ActivityType, setCurrentActivity } from '../activities/activitiesEntity'
import { getScaleFactor } from '../canvas/Canvas'
import { type GameController } from '../controllers/game.controller'
import { pushSyncedMessage } from '../messagebus/messagebus'
import { QAState, createQAEntity } from '../qa/qaEntity'
import { ModalButton } from './components/buttons'
import { HorizontalLabeledControl } from './components/labeledControl'
import { ModalTitle } from './components/modalTitle'
import { ModalButtonsContainer, ModalWindow } from './components/modalWindow'
import { Switch } from './components/switch'
import { primaryTheme } from './themes/themes'
import { LabeledInput } from './components/labeledInput'
import { Color4 } from '@dcl/sdk/math'

export class CreateQAUI {
  private isAnonymous: boolean = false
  private isModerated: boolean = false
  private uiVersion: number = 999
  private qaTitle: string = ''
  public isVisible: boolean = false
  private readonly titleMaxLength: number = 50

  constructor(private readonly gameController: GameController) {}

  private areInputsValid(): boolean {
    const title = this.qaTitle.trim()
    return title !== '' && title.length <= this.titleMaxLength
  }

  private resetForm(): void {
    this.qaTitle = ''
    this.isAnonymous = false
    this.isModerated = false
  }

  createUi(): ReactEcs.JSX.Element | null {
    return (
      <ModalWindow
        visible={this.isVisible}
        onClosePressed={() => {
          this.isVisible = false
          this.resetForm()
          utils.timers.setTimeout(() => {
            this.clearUI()
          }, 0)
        }}
        key={this.uiVersion}
      >
        <ModalTitle value="<b>Create Q&A Session</b>" />

        <Label
          uiTransform={{
            width: '100%',
            height: 20 * getScaleFactor(),
            margin: {
              bottom: 40 * getScaleFactor(),
              top: 25 * getScaleFactor()
            }
          }}
          fontSize={primaryTheme.smallFontSize}
          textAlign="middle-center"
          value="Start a session where players can ask questions and receive answers"
        />

        <LabeledInput
          labelProps={{ value: '<b>QA Title: </b>' }}
          inputProps={{
            placeholder: 'QA Title',
            onChange: (val) => {
              this.qaTitle = val
            }
          }}
        />

        <Label
          key={`title-counter-${this.uiVersion}`}
          value={`${this.qaTitle.length} / ${this.titleMaxLength} characters`}
          fontSize={primaryTheme.smallFontSize}
          textAlign="middle-left"
          color={this.qaTitle.length > this.titleMaxLength ? Color4.Red() : Color4.White()}
          uiTransform={{
            width: '100%',
            height: 15 * getScaleFactor(),
            margin: { top: 5 * getScaleFactor(), bottom: 3 * getScaleFactor() }
          }}
        />

        <UiEntity
          uiTransform={{
            width: '100%',
            flexDirection: 'column',
            alignItems: 'stretch',
            margin: {
              bottom: 30 * getScaleFactor(),
              top: 30 * getScaleFactor()
            }
          }}
        >
          {/* Moderation Toggle */}
          <UiEntity
            uiTransform={{
              flexDirection: 'column',
              alignItems: 'stretch',
              margin: { bottom: 20 * getScaleFactor() }
            }}
          >
            <HorizontalLabeledControl
              labelProps={{
                value: '<b>Moderation</b>',
                fontSize: 15 * getScaleFactor(),
                color: primaryTheme.fontColor
              }}
              uiTransform={{ justifyContent: 'space-between' }}
            >
              <Switch
                initialValue={this.isModerated}
                onChange={(val) => {
                  this.isModerated = val
                }}
              />
            </HorizontalLabeledControl>

            <Label
              uiTransform={{
                width: '100%',
                height: 14 * getScaleFactor(),
                margin: {
                  left: 1 * getScaleFactor(),
                  top: 4 * getScaleFactor()
                }
              }}
              fontSize={primaryTheme.smallFontSize}
              color={Color4.Gray()}
              textAlign="middle-left"
              value="Review Incoming questions"
            />
          </UiEntity>

          {/* Anonymous Toggle */}
          <UiEntity uiTransform={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <HorizontalLabeledControl
              labelProps={{
                value: '<b>Anonymous</b>',
                fontSize: 15 * getScaleFactor(),
                color: primaryTheme.fontColor
              }}
              uiTransform={{ justifyContent: 'space-between' }}
            >
              <Switch
                initialValue={this.isAnonymous}
                onChange={(val) => {
                  this.isAnonymous = val
                }}
              />
            </HorizontalLabeledControl>

            <Label
              uiTransform={{
                width: '100%',
                height: 14 * getScaleFactor(),
                margin: {
                  left: 1 * getScaleFactor(),
                  top: 4 * getScaleFactor()
                }
              }}
              fontSize={primaryTheme.smallFontSize}
              color={Color4.Gray()}
              textAlign="middle-left"
              value="Allow to hide identities"
            />
          </UiEntity>
        </UiEntity>

        <ModalButtonsContainer>
          <ModalButton
            text="Start Q&A"
            isDisabled={!this.areInputsValid()}
            onClick={() => {
              this.createQA()
            }}
          />
        </ModalButtonsContainer>
      </ModalWindow>
    )
  }

  clearUI(): void {
    this.uiVersion++
  }

  createQA(): void {
    this.isVisible = false
    const [qaId, qaEntity] = createQAEntity(this.qaTitle, this.isAnonymous, this.isModerated)

    setCurrentActivity(this.gameController.activitiesEntity, qaId, ActivityType.QA)
    const qaState = QAState.get(qaEntity)
    this.gameController.uiQaQueue.open(qaState.title, qaState)
    // this.gameController.uiQaDebug.show()
    pushSyncedMessage('createQA', {
      anonymous: this.isAnonymous,
      moderated: this.isModerated
    })
    this.resetForm()
    utils.timers.setTimeout(() => {
      this.clearUI()
    }, 0)
  }
}
