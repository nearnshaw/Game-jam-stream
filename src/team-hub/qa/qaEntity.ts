import { engine, Schemas, type Entity } from '@dcl/sdk/ecs'
import { syncEntity } from '@dcl/sdk/network'
import { getPlayer } from '@dcl/sdk/src/players'
import { type ComponentState, generateQAId } from '../utils' // can rename to generateQAId
import { getCurrentActivity } from '../activities/activitiesEntity'
import { QuestionState } from '../uis/uiQaQueue'

export const QAState = engine.defineComponent('qaState', {
  id: Schemas.String,
  title: Schemas.String,
  creatorId: Schemas.String,
  closed: Schemas.Boolean,
  anonymous: Schemas.Boolean,
  moderated: Schemas.Boolean
})

export const Question = engine.defineComponent('teamhub:question', {
  id: Schemas.String,
  qaId: Schemas.String,
  userId: Schemas.Optional(Schemas.String),
  text: Schemas.String,
  createdAt: Schemas.Int64,
  votes: Schemas.Optional(Schemas.Array(Schemas.String)),
  state: Schemas.EnumString(QuestionState, QuestionState.NEW)
})

export type QuestionType = ComponentState<typeof Question>
export type QAStateType = ComponentState<typeof QAState>

/**
 * Create a new Q&A session entity.
 * @param anonymous - If true, hides player identity for submitted questions.
 */

export function createQAEntity(
  title: string,
  anonymous: boolean = false,
  moderated: boolean = false
): [string, Entity] {
  // crean previous questions
  for (const [entity] of engine.getEntitiesWith(Question)) {
    engine.removeEntity(entity)
  }
  // [string, Entity] {
  const entity = engine.addEntity()
  const id = generateQAId()
  const player = getPlayer()
  const creatorId = player?.userId ?? 'unknown'

  QAState.create(entity, {
    id,
    title,
    creatorId,
    anonymous,
    moderated,
    closed: false
  })
  syncEntity(entity, [QAState.componentId])
  console.log('QAState created:', QAState.get(entity))
  return [id, entity]
}

/**
 * Close a Q&A session.
 */
export function closeQA(qaEntity: Entity): void {
  const qaState = QAState.getMutableOrNull(qaEntity)
  if (qaState != null) {
    qaState.closed = true
  }
}

/**
 * Get the QA state for the current activity.
 */
export function getQAState(activitiesEntity: Entity): QAStateType | null {
  const currentActivity = getCurrentActivity(activitiesEntity)
  if (currentActivity == null) {
    return null
  }
  return QAState.getOrNull(currentActivity.entity)
}

// Question API

function genQuestionId(sessionId: string): string {
  const t = Date.now().toString(36)
  const r = Math.random().toString(36).slice(2, 8)
  return `${sessionId}-q${t}${r}`
}

export function addQuestionToQA(qaEntity: Entity, text: string, userId: string, isTrusted = false): void {
  const qa = QAState.get(qaEntity)

  const entity = engine.addEntity()
  const questionId = genQuestionId(qa.id)

  const initialState = qa.moderated ? (isTrusted ? QuestionState.NEW : QuestionState.TO_REVIEW) : QuestionState.NEW

  Question.create(entity, {
    id: questionId,
    qaId: qa.id, // qa relation
    userId: qa.anonymous ? undefined : userId,
    text,
    createdAt: Date.now(),
    votes: [], // userIds array
    state: initialState
  })
  syncEntity(entity, [Question.componentId])
}

export function getQuestionsForQA(qaId: string): Array<{ entity: Entity; data: QuestionType }> {
  const out: Array<{ entity: Entity; data: QuestionType }> = []
  for (const [entity, q] of engine.getEntitiesWith(Question)) {
    if (q.qaId === qaId) out.push({ entity, data: q })
  }
  return out
}

export function getVoteCount(q: QuestionType): number {
  return Array.isArray(q.votes) ? q.votes.length : 0
}

export function hasUserVoted(q: QuestionType, userId: string): boolean {
  return !!(Array.isArray(q.votes) && userId.length > 0 && q.votes.includes(userId))
}

export function hasUserVotedById(questionId: string, userId: string): boolean {
  for (const [, q] of engine.getEntitiesWith(Question)) {
    if (q.id === questionId) return hasUserVoted(q, userId)
  }
  return false
}

export function toggleVoteQuestionInQA(qaEntity: Entity, questionId: string, userId: string): void {
  for (const [entity, q] of engine.getEntitiesWith(Question)) {
    if (q.id !== questionId) continue
    const qm = Question.getMutable(entity)
    qm.votes = Array.isArray(qm.votes) ? qm.votes : []
    const idx = qm.votes.indexOf(userId)
    if (idx >= 0)
      qm.votes.splice(idx, 1) // unvote
    else qm.votes.push(userId) // vote
    break
  }
}

export function getCurrentQAEntity(activitiesEntity: Entity): Entity | null {
  const current = getCurrentActivity(activitiesEntity)
  if (current == null /* || current.type !== ActivityType.QA */) return null
  return current.entity
}

export function findFirstOpenQAEntity(): Entity | null {
  for (const [entity] of engine.getEntitiesWith(QAState)) {
    const st = QAState.get(entity)
    if (!st.closed) return entity
  }
  return null
}

export function setQuestionStateInQA(_qaEntity: Entity, questionId: string, newState: QuestionState): void {
  for (const [entity, q] of engine.getEntitiesWith(Question)) {
    if (q.id === questionId) {
      Question.getMutable(entity).state = newState
      break
    }
  }
}

export function removeQuestionFromQA(_qaEntity: Entity, questionId: string): void {
  for (const [entity, q] of engine.getEntitiesWith(Question)) {
    if (q.id === questionId) {
      engine.removeEntity(entity)
      break
    }
  }
}
