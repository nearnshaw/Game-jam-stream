import { triggerEmote } from "~system/RestrictedActions"
import { EntityEnumId, getActions, sceneMessageBus } from "../utils"
import { engine, Schemas } from "@dcl/sdk/ecs"
import { getActionEvents } from "@dcl/asset-packs/dist/events"
import { syncEntity } from "@dcl/sdk/network"


export const GlobalEmote = engine.defineComponent('GlobalEmote', {
    emote: Schemas.String,
  }, {
    emote: ""
  })
  


export function emoteSetup(){

    const emoteCommsEntity = engine.addEntity()

    GlobalEmote.create(emoteCommsEntity)

    syncEntity(emoteCommsEntity, [GlobalEmote.componentId], EntityEnumId.EmoteComms)
   

    const emotesRef = engine.getEntityOrNullByName("emoteToggle")

    if (emotesRef) {

       
        const emoteActions = getActionEvents(emotesRef)

            emoteActions.on("Deactivate", () => {
               
            })

            emoteActions.on("Flag", () => {

                GlobalEmote.getMutable(emoteCommsEntity).emote = 'urn:decentraland:matic:collections-v2:0x66c256e64eb5dcc6b33adac215692cf7905cf038:0'
            })
        
            emoteActions.on("Robot", () => {
                GlobalEmote.getMutable(emoteCommsEntity).emote = 'robot'
            })
    
            emoteActions.on("Shrug", () => {
                GlobalEmote.getMutable(emoteCommsEntity).emote = 'shrug'
            })
         
            emoteActions.on("Wave", () => {
                GlobalEmote.getMutable(emoteCommsEntity).emote = 'wave'
            })

            emoteActions.on("Fistpump", () => {
                GlobalEmote.getMutable(emoteCommsEntity).emote = 'fistpump'
            })

            // FROM HERE ON; ADD TO UI
            emoteActions.on("RaiseHand", () => {
                GlobalEmote.getMutable(emoteCommsEntity).emote = 'raiseHand'
            })  

            emoteActions.on("Clap", () => {
                GlobalEmote.getMutable(emoteCommsEntity).emote = 'clap'
            })

            emoteActions.on("Money", () => {
                GlobalEmote.getMutable(emoteCommsEntity).emote = 'money'
            })

            emoteActions.on("Kiss", () => {
                GlobalEmote.getMutable(emoteCommsEntity).emote = 'kiss'
            })

            emoteActions.on("Tik", () => {
                GlobalEmote.getMutable(emoteCommsEntity).emote = 'tik'
            })

            emoteActions.on("Hammer", () => {
                GlobalEmote.getMutable(emoteCommsEntity).emote = 'hammer'
            })

            emoteActions.on("Tektonik", () => {
                GlobalEmote.getMutable(emoteCommsEntity).emote = 'tektonik'
            })  

            emoteActions.on("Dontsee", () => {
                GlobalEmote.getMutable(emoteCommsEntity).emote = 'dontsee'
            })

            emoteActions.on("Handsair", () => {
                GlobalEmote.getMutable(emoteCommsEntity).emote = 'handsair'
            })

            emoteActions.on("Disco", () => {
                GlobalEmote.getMutable(emoteCommsEntity).emote = 'disco'
            })

            emoteActions.on("Dab", () => {
                GlobalEmote.getMutable(emoteCommsEntity).emote = 'dab'
            })

            emoteActions.on("Headexplode", () => {
                GlobalEmote.getMutable(emoteCommsEntity).emote = 'headexplode'
            })

            emoteActions.on("Champagne", () => {
                GlobalEmote.getMutable(emoteCommsEntity).emote = 'urn:decentraland:matic:collections-v2:0x0b472c2c04325a545a43370b54e93c87f3d5badf:1'
            })

            emoteActions.on("Lose", () => {
                GlobalEmote.getMutable(emoteCommsEntity).emote = 'urn:decentraland:matic:collections-v2:0x3130c7dcad621257dc01ab1d464430ae8a70ec84:0'
            })

            emoteActions.on("Beach", () => {
                GlobalEmote.getMutable(emoteCommsEntity).emote = 'urn:decentraland:matic:collections-v2:0xe8758ed789474bfd7506f49afc8a9376d858d05a:0'
            })

            emoteActions.on("randomDance", () => {
                GlobalEmote.getMutable(emoteCommsEntity).emote = "randomDance"
            })


            GlobalEmote.onChange(emoteCommsEntity, (emoteData) => {
                if (emoteData) {
                    console.log("Global Emote", emoteData.emote )
                    if(emoteData.emote == "randomDance") {
                        triggerEmote({ predefinedEmote: randomDanceEmotes[Math.floor(Math.random() * randomDanceEmotes.length)] })
                    } else {
                        triggerEmote({ predefinedEmote: emoteData.emote.toString() })
                    }
                }
            })

        }


}



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
