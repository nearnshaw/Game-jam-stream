import { getTriggerEvents, getActionEvents } from '@dcl/asset-packs/dist/events'
import { engine, Transform } from '@dcl/sdk/ecs'
import { MessageBus } from '@dcl/sdk/message-bus'

/**
 * Message bus for scene-wide communication
 */
export const sceneMessageBus = new MessageBus()

/**
 * Entity communication IDs for network synchronization
 */
export enum EntityEnumId {
    CameraComms = 1,
    ClapMeterComms = 2,
    EmoteComms = 3,
    PedestalComms = 4,
}

/**
 * Gets the trigger events for an entity by name
 * @param entityName - The name of the entity
 * @returns The trigger events for the entity, or undefined if not found
 */
export function getTriggers(entityName: string) {
    const entity = engine.getEntityOrNullByName(entityName)
    if (!entity) return undefined
    
    return getTriggerEvents(entity)
}

/**
 * Gets the action events for an entity by name
 * @param entityName - The name of the entity
 * @returns The action events for the entity, or undefined if not found
 */
export function getActions(entityName: string) {
    const entity = engine.getEntityOrNullByName(entityName)
    if (!entity) return undefined
    
    return getActionEvents(entity)
}

/**
 * Gets the transform component for an entity by name
 * @param entityName - The name of the entity
 * @returns The transform component for the entity, or undefined if not found
 */
export function getTransform(entityName: string) {
    const entity = engine.getEntityOrNullByName(entityName)
    if (!entity) return undefined
    
    return Transform.get(entity)
}

/**
 * Gets a mutable reference to the transform component for an entity by name
 * @param entityName - The name of the entity
 * @returns A mutable reference to the transform component for the entity, or undefined if not found
 */
export function getMutableTransform(entityName: string) {
    const entity = engine.getEntityOrNullByName(entityName)
    if (!entity) return undefined
    
    return Transform.getMutable(entity)
}

/**
 * Generates a random hex color string
 * @returns A random hex color string (e.g., "#FF0000")
 */
export function getRandomHexColor(): string {
    const letters = "0123456789ABCDEF"
    let color = "#"
    
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)]
    }
    
    return color
}



