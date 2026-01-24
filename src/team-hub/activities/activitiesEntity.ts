import { type ComponentDefinition, engine, type Entity, Schemas } from '@dcl/sdk/ecs'
import { syncEntity } from '@dcl/sdk/network'
import { pushSyncedMessage } from '../messagebus/messagebus'
import { closePoll, PollState } from '../polls/pollEntity'
import { closeSurvey, SurveyState } from '../surveys/surveyEntity'
import { SyncEntityEnumId } from '../syncEntities'
import { type ComponentState } from '../utils'
import { ZonePollState } from '../zonePolls/pollEntity'
import { closeZonePoll } from '../zonePolls/zonePollSystem'
import { QAState, closeQA } from '../qa/qaEntity'

export enum ActivityType {
  NONE,
  POLL,
  SURVEY,
  ZONEPOLL,
  QA
}

export type BaseActivityStateType = {
  id: string
  creatorId: string
  closed: boolean
}

export const ActivitiesState = engine.defineComponent('activitiesState', {
  currentActivityType: Schemas.EnumNumber(ActivityType, ActivityType.NONE),
  currentActivityId: Schemas.Optional(Schemas.String)
})

const onCloseActivityListeners: Array<(activity: ActivityResult | undefined) => void> = []

export type ActivitiesStateType = ComponentState<typeof ActivitiesState>

export function createActivitiesEntity(): Entity {
  const entity = engine.addEntity()

  ActivitiesState.create(entity)

  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  syncEntity(entity, [ActivitiesState.componentId], SyncEntityEnumId.ACTIVITIES)

  return entity
}

export function setCurrentActivity(activitiesEntity: Entity, activityId: string, activityType: ActivityType): void {
  const mutableActivities = ActivitiesState.getMutable(activitiesEntity)
  mutableActivities.currentActivityId = activityId
  mutableActivities.currentActivityType = activityType
}

export type ActivityResult = { entity: Entity; type: ActivityType; state: BaseActivityStateType }

export function getCurrentActivity(activitiesEntity: Entity): ActivityResult | undefined {
  const activities = ActivitiesState.get(activitiesEntity)
  const activityId = activities.currentActivityId
  const activityType = activities.currentActivityType

  function getActivityWithComponent<T extends ComponentDefinition<any>>(
    component: T,
    type: ActivityType
  ): ActivityResult | undefined {
    const foundEntity = Array.from(engine.getEntitiesWith(component)).find((it) => it[1].id === activityId)
    return foundEntity !== undefined ? { entity: foundEntity[0], state: foundEntity[1], type } : undefined
  }

  if (activityId !== undefined) {
    switch (activityType) {
      case ActivityType.NONE:
        return undefined
      case ActivityType.POLL:
        return getActivityWithComponent(PollState, ActivityType.POLL)
      case ActivityType.SURVEY:
        return getActivityWithComponent(SurveyState, ActivityType.SURVEY)
      case ActivityType.ZONEPOLL:
        return getActivityWithComponent(ZonePollState, ActivityType.ZONEPOLL)
      case ActivityType.QA:
        return getActivityWithComponent(QAState, ActivityType.QA)
    }
  }
}

export function onCurrentActivityClosed(
  _activitiesEntity: Entity,
  onActivityClosed: (activity: ActivityResult | undefined) => void
): void {
  onCloseActivityListeners.push(onActivityClosed)
}

export function listenToActivities(
  activitiesEntity: Entity,
  onNewActivity: (activity: ActivityResult | undefined) => void,
  onInitialActivity: (activity: ActivityResult | undefined) => void = onNewActivity
): void {
  ActivitiesState.onChange(activitiesEntity, (state) => {
    if (state !== undefined) {
      onNewActivity(getCurrentActivity(activitiesEntity))
    }
  })

  const currentState = ActivitiesState.getOrNull(activitiesEntity)

  if (currentState !== null) {
    onInitialActivity(getCurrentActivity(activitiesEntity))
  }
}

export function closeCurrentActivity(activitiesEntity: Entity): void {
  const activity = getCurrentActivity(activitiesEntity)
  if (activity !== undefined && !activity.state.closed) {
    closeActivity(activity.type, activity.entity)
  }
}

export function closeActivity(type: ActivityType, entity: Entity): void {
  // TODO: Once we implement the "Activity Component" this can be done "polymorphically" without needing to know which activity is
  switch (type) {
    case ActivityType.POLL:
      closePoll(entity)
      break
    case ActivityType.SURVEY:
      closeSurvey(entity)
      break
    case ActivityType.ZONEPOLL:
      closeZonePoll(entity)
      break
    case ActivityType.QA:
      closeQA(entity)
      break
  }
  pushSyncedMessage('currentActivityClosed', {})
}

export function currentActivityWasClosed(activitiesEntity: Entity): void {
  onCloseActivityListeners.forEach((listener) => {
    listener(getCurrentActivity(activitiesEntity))
  })
}

export function getActivityName(type: ActivityType): string {
  switch (type) {
    case ActivityType.POLL:
      return 'Poll'
    case ActivityType.SURVEY:
      return 'Survey'
    case ActivityType.ZONEPOLL:
      return 'ZonePoll'
    case ActivityType.QA:
      return 'Q&A Session'
    default:
      return 'Activity'
  }
}
