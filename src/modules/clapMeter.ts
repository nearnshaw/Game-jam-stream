import { engine, Entity, TextShape, Transform, VisibilityComponent } from '@dcl/sdk/ecs'
import { Quaternion } from '@dcl/sdk/math'
import * as utils from '@dcl-sdk/utils'
import { AvatarEmoteCommand } from '@dcl/sdk/ecs'
import { EntityEnumId, getActions } from './utils'
import { Schemas } from '@dcl/sdk/ecs'
import { syncEntity } from '@dcl/sdk/network'
import { uIprompt } from './ui'

// Constants
const NEEDLE_ENTITY_NAME = 'Needle'
const CLAP_METER_ENTITY_NAME = 'clapMeter'
const START_ANGLE = 350
const END_ANGLE = 190
const BASE_ANGLE_INCREMENT = 2 // Base increment for early claps
const DIMINISHING_THRESHOLD = 25 // Clap count where diminishing returns begin
const MIN_ANGLE_INCREMENT = 1 // Minimum increment for late claps

// Component definition
export const ClapScore = engine.defineComponent('ClapScore', {
  score: Schemas.Number,
  active: Schemas.Boolean,
  player: Schemas.String
}, {
  score: 0,
  active: false,
  player: ""
})

// State variables
export let isClapping: boolean = false
let clapMeterCommsEntity: Entity | null = null
let currentNeedleRotation: number = START_ANGLE
export let clapMeterFull: boolean = false

/**
 * Sets up the clap meter functionality
 * Initializes the clap meter entities and event listeners
 */
export function clapMeterSetup() {
    // Get clap meter entities
    const clapMeterNeedle = engine.getEntityOrNullByName(NEEDLE_ENTITY_NAME)
    const clapMeterBoard = engine.getEntityOrNullByName(CLAP_METER_ENTITY_NAME)

    const clapMeterText = engine.getEntityOrNullByName("clapMeterText")

    if (!clapMeterNeedle || !clapMeterBoard || !clapMeterText) {
        console.error('Clap meter entities not found')
        return
    }

    // Create communication entity for syncing
    clapMeterCommsEntity = engine.addEntity()
    const score = ClapScore.create(clapMeterCommsEntity)
    syncEntity(clapMeterCommsEntity, [ClapScore.componentId], EntityEnumId.ClapMeterComms)

    // Set up action event listeners
    setupActionListeners(clapMeterNeedle, clapMeterBoard, score, clapMeterText)
    
    // Set up emote listener
    setupEmoteListener(clapMeterNeedle)
}

/**
 * Sets up action event listeners for the clap meter
 * @param needle - The needle entity
 * @param board - The clap meter board entity
 * @param score - The score component
 */
function setupActionListeners(needle: Entity, board: Entity, score: { active: boolean, score: number }, clapMeterText: Entity) {
    // Activate clap meter
    getActions(CLAP_METER_ENTITY_NAME)?.on("Activate", () => {
        activateClapMeter(needle, board, score, clapMeterText)
    })

    // Deactivate clap meter
    getActions(CLAP_METER_ENTITY_NAME)?.on("Deactivate", () => {
        deactivateClapMeter(needle, board, score, clapMeterText)
    })

    // Reset clap meter
    getActions(CLAP_METER_ENTITY_NAME)?.on("Reset", () => {
        resetClapMeter()
    })
}

/**
 * Activates the clap meter
 * @param needle - The needle entity
 * @param board - The clap meter board entity
 * @param score - The score component
 */
function activateClapMeter(needle: Entity, board: Entity, score: { active: boolean, score: number }, clapMeterText: Entity) {
    uIprompt.show()  
    TextShape.getMutable(clapMeterText).text = "Clap Meter"
    VisibilityComponent.getMutable(needle).visible = true
    VisibilityComponent.getMutable(board).visible = true
    score.active = true
    score.score = 0
    currentNeedleRotation = START_ANGLE
    Transform.getMutable(needle).rotation = Quaternion.fromEulerDegrees(0, 0, currentNeedleRotation)
}

/**
 * Deactivates the clap meter
 * @param needle - The needle entity
 * @param board - The clap meter board entity
 * @param score - The score component
 */
function deactivateClapMeter(needle: Entity, board: Entity, score: { active: boolean, score: number }, clapMeterText: Entity) {
    uIprompt.hide()    
    TextShape.getMutable(clapMeterText).text = ""
    VisibilityComponent.getMutable(needle).visible = false  
    VisibilityComponent.getMutable(board).visible = false
    score.active = false
    score.score = 0
    currentNeedleRotation = START_ANGLE
    Transform.getMutable(needle).rotation = Quaternion.fromEulerDegrees(0, 0, currentNeedleRotation)
}

/**
 * Sets up the emote listener for clap detection
 * @param needle - The needle entity
 */
function setupEmoteListener(needle: Entity) {
    AvatarEmoteCommand.onChange(engine.PlayerEntity, (emote) => {
        if (!emote || !clapMeterCommsEntity) return
        
        console.log('Emote played:', emote)
        
        if (emote.emoteUrn === 'clap') {
            handleClap(needle)
        }
    })
}

/**
 * Calculates the angle increment based on the current score
 * Implements diminishing returns: early claps are more valuable than later ones
 * @param currentScore - The current clap score
 * @returns The angle increment for this clap
 */
function calculateAngleIncrement(currentScore: number): number {
    if (currentScore <= DIMINISHING_THRESHOLD) {
        // Early claps (before threshold) get the full base increment
        return BASE_ANGLE_INCREMENT
    } else {
        // Later claps get a diminishing increment
        // Linear decrease from BASE_ANGLE_INCREMENT to MIN_ANGLE_INCREMENT
        const excessClaps = currentScore - DIMINISHING_THRESHOLD
        const diminishingFactor = Math.max(0, 1 - (excessClaps / 100)) // Gradually decrease to 0
        return MIN_ANGLE_INCREMENT + ((BASE_ANGLE_INCREMENT - MIN_ANGLE_INCREMENT) * diminishingFactor)
    }
}

/**
 * Handles a clap event
 * @param needle - The needle entity
 */
function handleClap(needle: Entity) {
    isClapping = true

    // Update score
    const currentScore = ClapScore.getMutable(clapMeterCommsEntity!).score += 1

    // Calculate angle increment based on diminishing returns
    const angleIncrement = calculateAngleIncrement(currentScore)
    
    // Calculate new needle rotation
    currentNeedleRotation = START_ANGLE - (currentScore * angleIncrement)

    console.log('Clap detected, current score:', currentScore, 'angle increment:', angleIncrement, 'current needle rotation:', currentNeedleRotation)

    // Ensure needle doesn't go beyond end angle
    if (currentNeedleRotation < END_ANGLE) {
        currentNeedleRotation = END_ANGLE
    }
    
    // Update needle rotation
    Transform.getMutable(needle).rotation = Quaternion.fromEulerDegrees(0, 0, currentNeedleRotation)
}

/**
 * Resets the clap meter to its initial state
 */
export function resetClapMeter(newPlayer: string = "") {
    const clapMeterNeedle = engine.getEntityOrNullByName(NEEDLE_ENTITY_NAME)
    
    if (!clapMeterNeedle || !clapMeterCommsEntity) {
        console.error('Clap meter needle not found')
        return
    }

    // Reset score and needle rotation
    ClapScore.getMutable(clapMeterCommsEntity).score = 0
    ClapScore.getMutable(clapMeterCommsEntity).player = newPlayer
    currentNeedleRotation = START_ANGLE
    Transform.getMutable(clapMeterNeedle).rotation = Quaternion.fromEulerDegrees(0, 0, currentNeedleRotation)
}



