import { triggerEmote } from "~system/RestrictedActions"
import { EntityEnumId, getActions, sceneMessageBus } from "../modules/utils"
import { engine, Schemas, Entity } from "@dcl/sdk/ecs"
import { getActionEvents } from "@dcl/asset-packs/dist/events"
import { syncEntity } from "@dcl/sdk/network"

// Constants
const EMOTE_TOGGLE_ENTITY_NAME = "emoteToggle"

// Component definition
export const GlobalEmote = engine.defineComponent('GlobalEmote', {
    emote: Schemas.String,
}, {
    emote: ""
})

/**
 * Sets up the emotes functionality
 * Initializes the emote communication entity and event listeners
 */
export function emoteSetup() {
    // Create communication entity for syncing
    const emoteCommsEntity = engine.addEntity()
    GlobalEmote.create(emoteCommsEntity)
    syncEntity(emoteCommsEntity, [GlobalEmote.componentId], EntityEnumId.EmoteComms)

    // Get emote toggle entity
    const emotesRef = engine.getEntityOrNullByName(EMOTE_TOGGLE_ENTITY_NAME)
    if (!emotesRef) {
        console.error("Emote toggle entity not found")
        return
    }

    // Set up action event listeners
    setupEmoteActions(emoteCommsEntity)
    
    // Set up emote change listener
    setupEmoteChangeListener(emoteCommsEntity)
}

/**
 * Sets up action event listeners for emotes
 * @param emoteCommsEntity - The emote communication entity
 */
function setupEmoteActions(emoteCommsEntity: Entity) {
    const emoteActions = getActionEvents(engine.getEntityOrNullByName(EMOTE_TOGGLE_ENTITY_NAME)!)
    
    // Deactivate action
    emoteActions.on("Deactivate", () => {
        // Deactivation logic if needed
    })

    // Flag emote
    emoteActions.on("Flag", () => {
        GlobalEmote.getMutable(emoteCommsEntity).emote = 'urn:decentraland:matic:collections-v2:0x66c256e64eb5dcc6b33adac215692cf7905cf038:0'
    })

    // Robot emote
    emoteActions.on("Robot", () => {
        GlobalEmote.getMutable(emoteCommsEntity).emote = 'robot'
    })

    // Shrug emote
    emoteActions.on("Shrug", () => {
        GlobalEmote.getMutable(emoteCommsEntity).emote = 'shrug'
    })

    // Wave emote
    emoteActions.on("Wave", () => {
        GlobalEmote.getMutable(emoteCommsEntity).emote = 'wave'
    })

    // Fistpump emote
    emoteActions.on("Fistpump", () => {
        GlobalEmote.getMutable(emoteCommsEntity).emote = 'fistpump'
    })

    // Raise hand emote
    emoteActions.on("RaiseHand", () => {
        GlobalEmote.getMutable(emoteCommsEntity).emote = 'raiseHand'
    })

    // Clap emote
    emoteActions.on("Clap", () => {
        GlobalEmote.getMutable(emoteCommsEntity).emote = 'clap'
    })

    // Money emote
    emoteActions.on("Money", () => {
        GlobalEmote.getMutable(emoteCommsEntity).emote = 'money'
    })

    // Kiss emote
    emoteActions.on("Kiss", () => {
        GlobalEmote.getMutable(emoteCommsEntity).emote = 'kiss'
    })

    // Tik emote
    emoteActions.on("Tik", () => {
        GlobalEmote.getMutable(emoteCommsEntity).emote = 'tik'
    })

    // Hammer emote
    emoteActions.on("Hammer", () => {
        GlobalEmote.getMutable(emoteCommsEntity).emote = 'hammer'
    })

    // Tektonik emote
    emoteActions.on("Tektonik", () => {
        GlobalEmote.getMutable(emoteCommsEntity).emote = 'tektonik'
    })

    // Dontsee emote
    emoteActions.on("Dontsee", () => {
        GlobalEmote.getMutable(emoteCommsEntity).emote = 'dontsee'
    })

    // Handsair emote
    emoteActions.on("Handsair", () => {
        GlobalEmote.getMutable(emoteCommsEntity).emote = 'handsair'
    })

    // Disco emote
    emoteActions.on("Disco", () => {
        GlobalEmote.getMutable(emoteCommsEntity).emote = 'disco'
    })

    // Dab emote
    emoteActions.on("Dab", () => {
        GlobalEmote.getMutable(emoteCommsEntity).emote = 'dab'
    })

    // Headexplode emote
    emoteActions.on("Headexplode", () => {
        GlobalEmote.getMutable(emoteCommsEntity).emote = 'headexplode'
    })

    // Champagne emote
    emoteActions.on("Champagne", () => {
        GlobalEmote.getMutable(emoteCommsEntity).emote = 'urn:decentraland:matic:collections-v2:0x0b472c2c04325a545a43370b54e93c87f3d5badf:1'
    })

    // Lose emote
    emoteActions.on("Lose", () => {
        GlobalEmote.getMutable(emoteCommsEntity).emote = 'urn:decentraland:matic:collections-v2:0x3130c7dcad621257dc01ab1d464430ae8a70ec84:0'
    })

    // Beach emote
    emoteActions.on("Beach", () => {
        GlobalEmote.getMutable(emoteCommsEntity).emote = 'urn:decentraland:matic:collections-v2:0xe8758ed789474bfd7506f49afc8a9376d858d05a:0'
    })

    // Random dance emote
    emoteActions.on("randomDance", () => {
        GlobalEmote.getMutable(emoteCommsEntity).emote = "randomDance"
    })
}

/**
 * Sets up the emote change listener
 * @param emoteCommsEntity - The emote communication entity
 */
function setupEmoteChangeListener(emoteCommsEntity: Entity) {
    GlobalEmote.onChange(emoteCommsEntity, (emoteData) => {
        if (!emoteData) return
        
        console.log("Global Emote:", emoteData.emote)
        
        if (emoteData.emote === "randomDance") {
            // Trigger a random dance emote
            const randomEmote = randomDanceEmotes[Math.floor(Math.random() * randomDanceEmotes.length)]
            triggerEmote({ predefinedEmote: randomEmote })
        } else {
            // Trigger the specific emote
            triggerEmote({ predefinedEmote: emoteData.emote.toString() })
        }
    })
}

/**
 * List of random dance emotes that can be triggered
 */
export const randomDanceEmotes = [
    'urn:decentraland:matic:collections-v2:0xe79cadd6fb15a626a48d2bbb60d4450eb196c84d:9',
    'urn:decentraland:matic:collections-v2:0x875146d1d26e91c80f25f5966a84b098d3db1fc8:1',
    'urn:decentraland:matic:collections-v2:0x378cd34662fcd2311743fad74b5a196ad0cb2544:4',
    'hammer',
    'tik',
    'disco',
    'dab',
    'headexplode',
]
