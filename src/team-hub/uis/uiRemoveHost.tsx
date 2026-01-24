import { withPlayerInfo } from '../utils'
import { type GameController } from '../controllers/game.controller'

export class RemoveHostModal {
  public removeHostVisibility: boolean = false

  // This local list of hosts is to ensure a correlation between the index of the array and the corresponding hosts.
  private hosts: string[] = []
  private selectedHostIndex: number = -1
  private readonly gameController: GameController
  constructor(gameController: GameController) {
    this.gameController = gameController
    this.gameController.playerController.onHostChange((newHosts) => {
      this.updateHosts(newHosts ?? [])
    })
    this.updateHosts(this.gameController.playerController.getHosts())
  }

  updateHosts(someHosts: string[]): void {
    this.hosts = someHosts
    if (this.hosts.length > 0) {
      this.selectedHostIndex = 0
    }

    withPlayerInfo((player) => {
      if (!this.gameController.playerController.isHost(player.userId)) {
        this.removeHostVisibility = false
      }
    })
  }

  removeSelectedHost(): void {
    if (this.selectedHostIndex !== -1) {
      this.gameController.playerController.setHost(this.hosts[this.selectedHostIndex], false)
    }
  }

  removeHostByUserId(userId: string): void {
    const index = this.hosts.indexOf(userId)
    if (index !== -1) {
      this.gameController.playerController.setHost(this.hosts[index], false)
    }
  }
}
