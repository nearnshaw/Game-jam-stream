import { GameController } from './controllers/game.controller'
import './uis/ui.registry'
export * from './controllers/ui.controller'

export type TeamHubOptions = {
  ignoreModels?: boolean
}
export class TeamHub {
  gameController = new GameController()
  constructor(options: TeamHubOptions = {}) {
    this.gameController.start(options)
  }
}
