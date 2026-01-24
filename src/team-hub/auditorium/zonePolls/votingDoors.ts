import { Animator, engine, type Entity, Schemas } from '@dcl/sdk/ecs'

const votingDoorsEntity = engine.addEntity()

export type VotingDoorNumber = 1 | 2 | 3 | 4

const allDoorNumbers: VotingDoorNumber[] = [1, 2, 3, 4]

function doorEntity(doorNumber: VotingDoorNumber): Entity | null {
  return engine.getEntityOrNullByName(`VotingDoor${doorNumber}`)
}

function zoneEntity(zoneNumber: VotingDoorNumber): Entity | null {
  return engine.getEntityOrNullByName(`VotingZone${zoneNumber}`)
}

function zoneOpenAnimation(zoneNumber: VotingDoorNumber): string {
  return `votingzone0${zoneNumber}_open`
}

function zoneCloseAnimation(zoneNumber: VotingDoorNumber): string {
  return `votingzone0${zoneNumber}_close`
}

function doorOpenAnimation(doorNumber: VotingDoorNumber): string {
  return `door0${doorNumber}_open`
}

function doorCloseAnimation(doorNumber: VotingDoorNumber): string {
  return `door0${doorNumber}_close`
}

const VotingDoorsComponent = engine.defineComponent('votingDoorsComponent', {
  activeDoors: Schemas.Map({
    1: Schemas.Boolean,
    2: Schemas.Boolean,
    3: Schemas.Boolean,
    4: Schemas.Boolean
  })
})

const votingDoorsValues = { 1: false, 2: false, 3: false, 4: false }

export function setupVotingDoors(): void {
  VotingDoorsComponent.create(votingDoorsEntity, {
    activeDoors: { ...votingDoorsValues }
  })
  VotingDoorsComponent.onChange(votingDoorsEntity, (component) => {
    if (component === undefined) return
    for (const i of allDoorNumbers) {
      const door = doorEntity(i)
      const zone = zoneEntity(i)
      if (door === null || zone === null) continue
      const isOpen = component.activeDoors[i]
      const valueChanged = votingDoorsValues[i] !== isOpen
      votingDoorsValues[i] = isOpen
      if (valueChanged) {
        if (isOpen) {
          Animator.playSingleAnimation(door, doorOpenAnimation(i), false)
          Animator.playSingleAnimation(zone, zoneOpenAnimation(i), false)
        } else {
          Animator.playSingleAnimation(door, doorCloseAnimation(i), false)
          Animator.playSingleAnimation(zone, zoneCloseAnimation(i), false)
        }
      }
    }
  })
}

export function openVotingDoors(doorNumbers: VotingDoorNumber[]): void {
  toggleDoors(true, doorNumbers)
}

export function closeVotingDoors(doorNumbers: VotingDoorNumber[]): void {
  toggleDoors(false, doorNumbers)
}

export function closeAllOpenedDoors(): void {
  const component = VotingDoorsComponent.getMutable(votingDoorsEntity)
  const doorsToClose = allDoorNumbers.filter((door) => component.activeDoors[door])
  closeVotingDoors(doorsToClose)
}

function toggleDoors(value: boolean, doorNumbers: VotingDoorNumber[]): void {
  const component = VotingDoorsComponent.getMutable(votingDoorsEntity)
  for (const doorNumber of doorNumbers) {
    component.activeDoors[doorNumber] = value
  }
}
