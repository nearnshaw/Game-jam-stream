import { engine, Schemas } from '@dcl/sdk/ecs'

export const ZonePollState = engine.defineComponent('ZonePollState', {
  id: Schemas.String,
  pollId: Schemas.String,
  question: Schemas.String,
  options: Schemas.Array(Schemas.String),
  zoneCounts: Schemas.Array(Schemas.Int),
  creatorId: Schemas.String,
  closed: Schemas.Boolean,
  startTime: Schemas.Number
})
