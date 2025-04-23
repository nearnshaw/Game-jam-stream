import { getPlayer } from "@dcl/sdk/src/players"
import { getActions, getTriggers, sceneMessageBus } from "../utils"
import { engine, InputModifier, Transform } from "@dcl/sdk/ecs"
import { Vector3 } from "@dcl/sdk/math"
import { triggerEmote } from "~system/RestrictedActions"
import { getTriggerEvents, getActionEvents } from '@dcl/asset-packs/dist/events'
import { randomDanceEmotes } from "./emotes"
import { resetClapMeter } from "./clapMeter"
import * as utils from '@dcl-sdk/utils'

// Constants
const TEST_AVATAR = "NicoE"
const PEDESTAL_ENTITY_NAME = 'pedestal'
const SPIRAL_ENTITY_NAME = 'spiral'
const EMOTE_DELAY_MS = 3100

// State
let isPlayerOnPedestal = false

/**
 * Sets up the pedestal functionality
 * Initializes message bus listeners for pedestal events
 */
export function pedestalSetup() {
    // Listen for pedestal events from the message bus
    sceneMessageBus.on("Pedestal", (data) => {
        console.log("Pedestal event received:", data)
        checkForPedestal(data.player)
    })
}

/**
 * Checks if the current player should be on the pedestal
 * @param avatarName - The name of the avatar to check against
 */
export function checkForPedestal(avatarName: string = TEST_AVATAR) {
    const currentPlayer = getPlayer()

    if (!currentPlayer) {
        console.log("No player found")
        return
    }

    console.log('Player Name:', currentPlayer.name)
    console.log('Player UserId:', currentPlayer.userId)

    const isCurrentPlayer = currentPlayer.name.toLowerCase() === avatarName.toLowerCase()
    
    if (isCurrentPlayer && currentPlayer.position && !isPlayerOnPedestal) {
        // Player should be on pedestal
        console.log("Player is the chosen one")
        activatePedestal(currentPlayer.position)
	
    } else if (isPlayerOnPedestal) {
        // Player should get off pedestal
        getOffPedestal()
    }
}

/**
 * Activates the pedestal for the current player
 * @param playerPosition - The current position of the player
 */
function activatePedestal(playerPosition: Vector3) {
    isPlayerOnPedestal = true

    // Disable player movement
    disablePlayerMovement()



    // Position and activate pedestal
    const pedestal = engine.getEntityOrNullByName(PEDESTAL_ENTITY_NAME)
    const spiral = engine.getEntityOrNullByName(SPIRAL_ENTITY_NAME)
    
    if (!pedestal || !spiral) {
        console.error("Pedestal or spiral entities not found")
        return
    }

    // Position pedestal at player location
    Transform.getMutable(pedestal).position = playerPosition

    // Activate pedestal and spiral animations
    const pedestalActions = getActionEvents(pedestal)
    pedestalActions.emit('Up', {})
    pedestalActions.emit('Sound', {})

    const spiralActions = getActionEvents(spiral)
    spiralActions.emit('Pop Up', {})

    // Trigger random dance emote after delay
    utils.timers.setTimeout(() => {
        const emote = randomDanceEmotes[Math.floor(Math.random() * randomDanceEmotes.length)]
        triggerEmote({ predefinedEmote: emote })
    }, EMOTE_DELAY_MS)
}

/**
 * Deactivates the pedestal for the current player
 */
function getOffPedestal() {
    // Re-enable player movement
    enablePlayerMovement()
    
    isPlayerOnPedestal = false
    console.log("Player is no longer on the pedestal")
}

/**
 * Disables player movement controls
 */
function disablePlayerMovement() {
    InputModifier.createOrReplace(engine.PlayerEntity, {
        mode: InputModifier.Mode.Standard({
            disableJog: true,
            disableRun: true,
            disableJump: true,
            disableWalk: true
        }),
    })
}

/**
 * Enables player movement controls
 */
function enablePlayerMovement() {
    InputModifier.createOrReplace(engine.PlayerEntity, {
        mode: InputModifier.Mode.Standard({
            disableJog: false,
            disableRun: false,
            disableJump: false,
            disableWalk: false
        }),
    })
}

/**
 * Hides the pedestal and resets the clap meter
 * This function is only called by the admin
 */
export function hidePedestal() {
    // Reset clap meter
    //resetClapMeter()

    // Get pedestal and spiral entities
    const pedestal = engine.getEntityOrNullByName(PEDESTAL_ENTITY_NAME)
    const spiral = engine.getEntityOrNullByName(SPIRAL_ENTITY_NAME)

    if (!pedestal || !spiral) {
        console.error("Pedestal or spiral entities not found")
        return
    }

    // Hide pedestal and spiral
    const pedestalActions = getActionEvents(pedestal)
    pedestalActions.emit('Down', {})
    
    const spiralActions = getActionEvents(spiral)
    spiralActions.emit('Hide', {})

	// free player movement
	enablePlayerMovement()
}
