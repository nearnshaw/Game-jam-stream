import { engine, type Entity, PlayerIdentityData, TriggerArea, triggerAreaEventsSystem } from '@dcl/sdk/ecs'
import { ZonePollState } from './pollEntity'

import { type GameController } from '../controllers/game.controller'
import { Color4, Vector3 } from '@dcl/sdk/math'
import { OptionZone } from './optionZone'
import {
  type VotingDoorNumber,
  openVotingDoors,
  closeAllOpenedDoors,
  setupVotingDoors
} from '../auditorium/zonePolls/votingDoors'
import * as utils from '@dcl-sdk/utils'
import {
  ActivityType,
  closeCurrentActivity,
  getCurrentActivity,
  listenToActivities
} from '../activities/activitiesEntity'
import { type ComponentState } from '../utils'

export const zoneIcons = [
  'assets/scene/Images/team-hub/createZonePollUi/Circle.png',
  'assets/scene/Images/team-hub/createZonePollUi/Square.png',
  'assets/scene/Images/team-hub/createZonePollUi/Triangle.png',
  'assets/scene/Images/team-hub/createZonePollUi/X.png'
]

export class ZonePollSystem {
  private readonly gameController: GameController

  private systemIsActive: boolean = false

  public optionZones: OptionZone[] = []
  private triggerEntities: Entity[] = []

  private currentZonePollAlreadyClosed: boolean = false

  constructor(gameController: GameController) {
    this.gameController = gameController
  }

  public setup(): void {
    setupVotingDoors()
    engine.addSystem(this.update.bind(this))

    listenToActivities(this.gameController.activitiesEntity, (activity) => {
      const newActivityIsZonePoll = activity?.type === ActivityType.ZONEPOLL

      this.systemIsActive = newActivityIsZonePoll
      if (newActivityIsZonePoll) {
        this.start(activity.entity)
      }
    })
  }

  private activeZonePoll(): { entity: Entity; state: ComponentState<typeof ZonePollState> } | null {
    const activity = getCurrentActivity(this.gameController.activitiesEntity)
    if (activity === undefined || activity.type !== ActivityType.ZONEPOLL) return null

    return { entity: activity.entity, state: ZonePollState.get(activity.entity) }
  }

  private update(_dt: number): void {
    if (!this.systemIsActive) return

    const zonePoll = this.activeZonePoll()
    if (zonePoll === null) return

    if (zonePoll.state.closed) {
      this.close(zonePoll.entity)
      return
    }

    const oldZoneCounts = zonePoll.state.zoneCounts
    const newZoneCounts = this.optionZones.map((zone) => zone.playersCount())

    const countsAreEqual = newZoneCounts.every((value, index) => value === oldZoneCounts[index])

    if (!countsAreEqual) {
      const mutableZonePollState = ZonePollState.getMutable(zonePoll.entity)
      mutableZonePollState.zoneCounts = newZoneCounts
      this.gameController.zonePollQuestionUI.updateCounts(newZoneCounts)
    }
  }

  private close(zonePollEntity: Entity): void {
    if (this.currentZonePollAlreadyClosed) {
      return
    }
    const currentActivity = getCurrentActivity(this.gameController.activitiesEntity)
    const currentZonePoll =
      currentActivity?.type === ActivityType.ZONEPOLL ? ZonePollState.get(currentActivity.entity) : null
    const closingZonePoll = ZonePollState.get(zonePollEntity)

    if (currentZonePoll?.id !== closingZonePoll.id) {
      return
    }

    this.currentZonePollAlreadyClosed = true
    closeCurrentActivity(this.gameController.activitiesEntity)
    this.clearZones()
    this.hideUIs()
    closeAllOpenedDoors()
  }

  private hideUIs(): void {
    this.gameController.zonePollQuestionUI.hide()
    this.gameController.timerUI.hide()
  }

  private clearZones(): void {
    this.optionZones.forEach((zone) => {
      zone.destroy()
    })
    this.optionZones = []
    // Remove trigger areas
    this.triggerEntities.forEach((ent) => {
      try {
        TriggerArea.deleteFrom(ent)
      } catch {}
    })
    this.triggerEntities = []
  }

  private start(zonePollEntity: Entity): void {
    const zonePollState = ZonePollState.getOrNull(zonePollEntity)
    if (zonePollState === null) return

    this.currentZonePollAlreadyClosed = false

    const zones = [
      { color: Color4.Red(), position: Vector3.create(2.83, 0.14, 6.64) },
      { color: Color4.Green(), position: Vector3.create(6, 0.18, 3.4) },
      { color: Color4.Yellow(), position: Vector3.create(10.54, 0.2, 3.21) },
      { color: Color4.Blue(), position: Vector3.create(13.1, 0.2, 6.64) }
    ] as const

    zonePollState.options.forEach((option, index) => {
      if (index >= zones.length) {
        return
      }

      const zone = zones[index]

      const optionZone = new OptionZone(zone.position, index, zonePollEntity, this.gameController)

      this.optionZones[index] = optionZone

      // Attach spherical trigger to existing Trigger entities (Trigger1..Trigger4)
      const triggerEntity = engine.getEntityOrNullByName(`Trigger${index + 1}`)
      if (triggerEntity !== null) {
        // Set sphere trigger (size inferred from Transform scale)
        TriggerArea.setSphere(triggerEntity)
        // Subscribe to enter/exit events
        triggerAreaEventsSystem.onTriggerEnter(triggerEntity, (result) => {
          const trig = result.trigger
          if (!trig) return
          const otherEntity = trig.entity as unknown as Entity
          if (PlayerIdentityData.has(otherEntity)) {
            const addr = PlayerIdentityData.get(otherEntity).address
            optionZone.playersInside.add(addr)
            optionZone.updateText(optionZone.playersCount())
          }
        })
        triggerAreaEventsSystem.onTriggerExit(triggerEntity, (result) => {
          const trig = result.trigger
          if (!trig) return
          const otherEntity = trig.entity as unknown as Entity
          if (PlayerIdentityData.has(otherEntity)) {
            const addr = PlayerIdentityData.get(otherEntity).address
            optionZone.playersInside.delete(addr)
            optionZone.updateText(optionZone.playersCount())
          }
        })
        this.triggerEntities.push(triggerEntity)
      }

      const doorsToOpen = zonePollState.options.map((_, index) => (index + 1) as VotingDoorNumber)
      utils.timers.setTimeout(() => {
        openVotingDoors(doorsToOpen)
      }, 800)
    })

    // TODO : Should come from the UI's
    const durationInSeconds = 30.0
    utils.timers.setTimeout(() => {
      this.close(zonePollEntity)
    }, durationInSeconds * 1000)

    this.gameController.zonePollQuestionUI.show(zonePollState.question, zonePollState.options)
    this.gameController.timerUI.show(durationInSeconds / 60.0)
  }
}

export function closeZonePoll(zonePollEntity: Entity): void {
  const zonePollState = ZonePollState.getMutableOrNull(zonePollEntity)

  if (zonePollState !== null) {
    zonePollState.closed = true
  }
}
