import { getTriggerEvents, getActionEvents } from '@dcl/asset-packs/dist/events'
import { engine, Transform } from '@dcl/sdk/ecs'

import { MessageBus } from '@dcl/sdk/message-bus'


export const sceneMessageBus = new MessageBus()


export function getTriggers(item: string){

    const itemRef = engine.getEntityOrNullByName(item)

    if (itemRef) {
        return getTriggerEvents(itemRef)
    }
}

export function getActions(item: string){

    const itemRef = engine.getEntityOrNullByName(item)

    if (itemRef) {
        return getActionEvents(itemRef)
    }
}

export function getTransform(item: string){
    const itemRef = engine.getEntityOrNullByName(item)
    if (itemRef) {
        return Transform.get(itemRef)
    }
}

export function getMutableTransform(item: string){
    const itemRef = engine.getEntityOrNullByName(item)
    if (itemRef) {
        return Transform.getMutable(itemRef)
    }
}


export function getRandomHexColor(): string {
    const letters = "0123456789ABCDEF";
    let color = "#";
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }


 export enum EntityEnumId {
	CameraComms = 1,
	ClapMeterComms = 2,
	EmoteComms = 3,
    PedestalComms = 4,

}