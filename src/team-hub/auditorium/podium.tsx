import {
  engine,
  type EventSystemCallback,
  GltfContainer,
  InputAction,
  PointerEvents,
  pointerEventsSystem,
  Transform
} from '@dcl/sdk/ecs'
import { type GameController } from '../controllers/game.controller'
import { BounceComponent, withPlayerInfo } from '../utils'
import { Vector3 } from '@dcl/sdk/math'

export function setupPodium(gameController: GameController): void {
  // const podiumOrNull = engine.getEntityOrNullByName('Podium')
  // if (podiumOrNull === null) return

  // const podium = podiumOrNull
  // const arrow = engine.addEntity()

  // gameController.playerController.onHostChange(() => {
  //   updatePodiumActions()
  // })

  // updatePodiumActions()

  // function updatePodiumActions(): void {
  //   withPlayerInfo((player) => {
  //     if (gameController.playerController.isHost(player.userId)) {
  //       removeArrowFromPodium()
  //       configurePodiumForHosts()
  //     } else if (gameController.playerController.noHostExists()) {
  //       addArrowToPodium()
  //       configurePodiumForClaimingHost()
  //     } else {
  //       removeArrowFromPodium()
  //       disablePodium()
  //     }
  //   })
  // }

  // function configurePodiumForHosts(): void {
  //   configurePodium('Interact', () => {
  //     gameController.mainMenuUI.isVisible = true
  //   })
  // }

  // function configurePodiumForClaimingHost(): void {
  //   configurePodium('Claim Host', () => {
  //     gameController.playerController.claimHost()
  //   })
  // }

  // function configurePodium(text: string, callback: EventSystemCallback): void {
  //   pointerEventsSystem.onPointerDown(
  //     {
  //       entity: podium,
  //       opts: { button: InputAction.IA_POINTER, hoverText: text }
  //     },
  //     callback
  //   )
  // }

  // function disablePodium(): void {
  //   PointerEvents.deleteFrom(podium)
  // }

  // function addArrowToPodium(): void {
  //   GltfContainer.create(arrow, { src: 'assets/models/target_arrow.glb' })
  //   Transform.create(arrow, {
  //     position: Vector3.create(8, 3, 9),
  //     scale: Vector3.create(1, 1, 1)
  //   })
  //   BounceComponent.create(arrow, {
  //     amplitude: 0.3,
  //     speed: 2,
  //     offset: 0
  //   })
  // }

  // function removeArrowFromPodium(): void {
  //   GltfContainer.deleteFrom(arrow)
  //   BounceComponent.deleteFrom(arrow)
  //   Transform.deleteFrom(arrow)
  // }
}
