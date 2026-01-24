import { PollState } from './pollEntity'
import { type Entity } from '@dcl/sdk/ecs'
import { getPlayer } from '@dcl/sdk/src/players'
import { type GameController } from '../controllers/game.controller'

// variable used to store the last voted option locally, to allow changing the vote in anonymous polls.
let lastVotedOption: { pollId: string; votedOption: string } | undefined

export class PollQuestion {
  gameController: GameController
  constructor(gameController: GameController, entity: Entity) {
    this.gameController = gameController
    this.triggerPollQuestion(entity)
  }

  triggerPollQuestion(entity: Entity): void {
    const pollState = PollState.getOrNull(entity)
    if (pollState !== null) {
      this.createPollQuestionUi(pollState.question, pollState.options, (option: string) => {
        const mutablePoll = PollState.getMutable(entity)
        const userId = getPlayer()?.userId
        if (userId === undefined) return

        if (pollState.anonymous) {
          // If vote was casted in an anonymous poll in the same session -> changes the vote.
          if (mutablePoll.id === lastVotedOption?.pollId) {
            const voteIndex = mutablePoll.votes.findIndex((vote) => vote.option === lastVotedOption?.votedOption)
            if (voteIndex >= 0) {
              mutablePoll.votes[voteIndex].option = option
              lastVotedOption = { pollId: mutablePoll.id, votedOption: option }
            }
            return
          }

          // If vote was casted in an anonymous poll in a different session (like closing and opening explorer)
          // -> cannot change the vote.
          if (mutablePoll.userIdsThatVoted.includes(userId)) {
            return
          }

          // If user never voted in an anonymous poll -> creates a new vote.

          // We need to store the userId even on anonymous polls to avoid double voting since
          // all runs in the client side. Storing it separately than the vote at least makes it
          // harder to figure out who voted for which option.
          mutablePoll.userIdsThatVoted.push(userId)
          mutablePoll.votes.push({ userId: undefined, option })
          lastVotedOption = { pollId: mutablePoll.id, votedOption: option }
        } else {
          // If vote was casted in a public poll -> changes the vote.
          const existingVoteIndex = mutablePoll.votes.findIndex((vote) => vote.userId === userId)

          if (existingVoteIndex >= 0) {
            mutablePoll.votes[existingVoteIndex].option = option
            lastVotedOption = { pollId: mutablePoll.id, votedOption: option }
          } else {
            // If they hadn't vote already, a new vote is created.
            mutablePoll.userIdsThatVoted.push(userId)
            mutablePoll.votes.push({ userId, option })
            lastVotedOption = { pollId: mutablePoll.id, votedOption: option }
          }
        }
      })
    }
  }

  createPollQuestionUi(
    pollQuestion: string,
    options: string[] = ['Yeah', 'Nope'],
    onOption: (option: string) => void
  ): void {
    this.gameController.createOptionUI.openUI(pollQuestion, options, onOption)
  }
}
