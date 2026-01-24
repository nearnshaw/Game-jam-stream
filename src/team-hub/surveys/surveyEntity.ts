import { engine, type Entity, Schemas } from '@dcl/sdk/ecs'
import { syncEntity } from '@dcl/sdk/network'
import { getPlayer } from '@dcl/sdk/src/players'
import { getCurrentActivity } from '../activities/activitiesEntity'
import { type ComponentState, generateSurveyId } from '../utils'
import { SurveyIcon } from './surveyIcon'

export const SurveyState = engine.defineComponent('surveyState', {
  id: Schemas.String,
  creatorId: Schemas.String,
  closed: Schemas.Boolean,
  question: Schemas.String,
  anonymous: Schemas.Boolean,
  userIdsThatVoted: Schemas.Array(Schemas.String),
  votes: Schemas.Array(
    Schemas.Map({
      userId: Schemas.Optional(Schemas.String),
      option: Schemas.Number
    })
  ),
  optionsQty: Schemas.Number,
  icon: Schemas.EnumString(SurveyIcon, SurveyIcon.STAR)
})

export type SurveyStateType = ComponentState<typeof SurveyState>

export function createSurveyEntity(
  question: string,
  icon: SurveyIcon = SurveyIcon.STAR,
  optionsQty: number = 5,
  anonymous: boolean = false
): [string, Entity] {
  const entity = engine.addEntity()
  const id = generateSurveyId()
  const player = getPlayer()

  const creatorId = player?.userId

  SurveyState.create(entity, {
    id,
    question,
    icon,
    anonymous,
    optionsQty,
    creatorId,
    votes: [],
    userIdsThatVoted: [],
    closed: false
  })

  syncEntity(entity, [SurveyState.componentId])

  return [id, entity]
}

export function closeSurvey(surveyEntity: Entity): void {
  const surveyState = SurveyState.getMutableOrNull(surveyEntity)

  if (surveyState !== null) {
    surveyState.closed = true
  }
}

export function getSurveyState(activitiesEntity: Entity): SurveyStateType | null {
  const currentActivity = getCurrentActivity(activitiesEntity)

  if (currentActivity === undefined) {
    return null
  }

  return SurveyState.getOrNull(currentActivity.entity)
}
