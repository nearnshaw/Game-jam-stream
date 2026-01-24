import { engine, Schemas, type Entity } from '@dcl/sdk/ecs'
import { syncEntity } from '@dcl/sdk/network'
import { generatePollId } from '../utils'

import { getPlayer } from '@dcl/sdk/src/players'

export const PollState = engine.defineComponent('pollState', {
  id: Schemas.String,
  question: Schemas.String,
  options: Schemas.Array(Schemas.String),
  anonymous: Schemas.Boolean,
  userIdsThatVoted: Schemas.Array(Schemas.String),
  votes: Schemas.Array(
    Schemas.Map({
      userId: Schemas.Optional(Schemas.String),
      option: Schemas.String
    })
  ),
  creatorId: Schemas.String,
  closed: Schemas.Boolean
})

export const pollRegistry = new Map<string, Entity>()
export function createPollEntity(
  question: string,
  options: string[],
  isAnonymous: boolean
): { entity: Entity; pollId: string } {
  const pollEntity = engine.addEntity()
  const id = generatePollId()
  const player = getPlayer()
  const creatorId = player?.userId

  PollState.create(pollEntity, {
    id,
    question,
    options,
    anonymous: isAnonymous,
    votes: [],
    creatorId,
    closed: false
  })
  pollRegistry.set(id, pollEntity)

  syncEntity(pollEntity, [PollState.componentId])

  return { entity: pollEntity, pollId: id }
}

export function closePoll(pollEntity: Entity): void {
  const pollState = PollState.getMutableOrNull(pollEntity)

  if (pollState !== null) {
    pollState.closed = true
  }
}
