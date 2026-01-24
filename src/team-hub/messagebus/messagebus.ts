import { engine, type MapComponentDefinition, Schemas } from '@dcl/ecs'
import { syncEntity } from '@dcl/sdk/network'
import { SyncEntityEnumId } from '../syncEntities'
import { type GameController } from '../controllers/game.controller'
import { currentActivityWasClosed } from '../activities/activitiesEntity'
import * as utils from '@dcl-sdk/utils'

let lastMessageConsumed = Date.now()
export const messageBusEntity = engine.addEntity()

const messageContentAlternatives = {
  showCurrentActivityResults: Schemas.Map({}),
  createZonePollUi: Schemas.Map({
    dataEntityId: Schemas.Int
  }),
  createSurvey: Schemas.Map({}),
  currentActivityClosed: Schemas.Map({}),
  createQA: Schemas.Map({})
}

function handleMessage(message: Message, gameController: GameController): void {
  switch (message.content.$case) {
    case 'showCurrentActivityResults':
      gameController.popupAtendeePanelAndResultbutton.showResultsFromCurrentActivity()
      break
    case 'createSurvey': {
      gameController.surveyQuestionUI.isVisible = true
      break
    }
    case 'currentActivityClosed':
      currentActivityWasClosed(gameController.activitiesEntity)
      break
    case 'createQA':
      console.log('QA CREATED')
      break
  }
}

// section ends here

export const MessageBusComponent = engine.defineComponent('MessageBus', {
  messages: Schemas.Array(
    Schemas.Map({
      content: Schemas.OneOf(messageContentAlternatives),
      timestamp: Schemas.Int64
    })
  )
})

type MessageBusComponentType = typeof MessageBusComponent extends MapComponentDefinition<infer Inner> ? Inner : never
type Message = MessageBusComponentType['messages'][number]
type MessageType = Message['content']['$case']
type MessageContent = Message['content']['value']

export function pushSyncedMessage(messageType: MessageType, messageContent: MessageContent): void {
  // The timeout is needed because otherwise, if a pushed message triggers a second pushes message
  // the second one isn't processed.
  utils.timers.setTimeout(() => {
    MessageBusComponent.getMutable(messageBusEntity).messages.push({
      content: {
        $case: messageType,
        value: messageContent
      } as any,
      timestamp: Date.now()
    })
  }, 0)
}

export function setupMessageBus(gameController: GameController): void {
  MessageBusComponent.create(messageBusEntity, {
    messages: []
  })

  syncEntity(messageBusEntity, [MessageBusComponent.componentId], SyncEntityEnumId.MESSAGE_BUS)

  MessageBusComponent.onChange(messageBusEntity, (component) => {
    if (component === undefined) return

    const newMessages = component.messages.filter((msg) => msg.timestamp > lastMessageConsumed)

    newMessages.sort((a, b) => a.timestamp - b.timestamp)

    for (const message of newMessages) {
      handleMessage(message, gameController)
      lastMessageConsumed = message.timestamp
    }
  })
}
