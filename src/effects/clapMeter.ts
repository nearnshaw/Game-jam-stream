import { engine, Entity, GltfContainer, Transform, SystemFn, UiText, VisibilityComponent } from '@dcl/sdk/ecs'
import { Quaternion, Vector3 } from '@dcl/sdk/math'
import * as utils from '@dcl-sdk/utils'
import { AvatarEmoteCommand } from '@dcl/sdk/ecs'
import { EntityEnumId, getActions, sceneMessageBus } from '../utils'
import { TriggerType, TriggerConditionType, CounterComponent, Counter } from '@dcl/asset-packs'
import { Schemas } from '@dcl/sdk/ecs'
import { syncEntity } from '@dcl/sdk/network'

export const ClapScore = engine.defineComponent('ClapScore', {
  score: Schemas.Number,
  active: Schemas.Boolean
}, {
  score: 0,
  active: false
})



// Config
export let isClapping: boolean = false

var clapMeterCommsEntity: Entity | null = null

export const START_ANGLE = 350
const END_ANGLE = 190
const ANGLE_INCREMENT = 5 // How many degrees the needle moves forwards
//const COOLDOWN_INCREMENT = 0.1 // How many degrees the needle moves backwards
//export const COOLDOWN_TIME = 6000 // Cooldown time in milliseconds

var currentNeedleRotation: number = START_ANGLE


export let clapMeterFull: boolean = false

export function clapMeterSetup() {
// Create clap meter entities
    const clapMeterNeedle = engine.getEntityOrNullByName('Needle')
    const clapMeterBoard = engine.getEntityOrNullByName('clapMeter')

    if(!clapMeterNeedle || !clapMeterBoard) {
        console.error('Clap meter entities not found')
        return
    }

    clapMeterCommsEntity = engine.addEntity()

    const Score = ClapScore.create(clapMeterCommsEntity)

    syncEntity(clapMeterCommsEntity, [ClapScore.componentId], EntityEnumId.ClapMeterComms)

   
      //activate
      getActions("clapMeter")?.on("Activate", () => {
        VisibilityComponent.getMutable(clapMeterNeedle).visible = true
        VisibilityComponent.getMutable(clapMeterBoard).visible = true
        Score.active = true
        Score.score = 0
        currentNeedleRotation = START_ANGLE
        Transform.getMutable(clapMeterNeedle).rotation = Quaternion.fromEulerDegrees(0, 0, currentNeedleRotation)
    })

         //deactivate
         getActions("clapMeter")?.on("Deactivate", () => {
            VisibilityComponent.getMutable(clapMeterNeedle).visible = false
            VisibilityComponent.getMutable(clapMeterBoard).visible = false
            Score.active = false
            Score.score = 0
            currentNeedleRotation = START_ANGLE
            Transform.getMutable(clapMeterNeedle).rotation = Quaternion.fromEulerDegrees(0, 0, currentNeedleRotation)
        })


    //reset
    getActions("clapMeter")?.on("Reset", () => {
        resetClapMeter()
    })


   // Listen for claps
   AvatarEmoteCommand.onChange(engine.PlayerEntity, (emote) => {
    if (!emote || !clapMeterCommsEntity) return
    console.log('Emote played: ', emote)
    if (emote.emoteUrn == 'clap') {
      
      isClapping = true

      const currentScore = ClapScore.getMutable(clapMeterCommsEntity).score += 1

      currentNeedleRotation = START_ANGLE - (currentScore * ANGLE_INCREMENT)

      console.log('clap detected, current score: ', currentScore, 'current needle rotation: ', currentNeedleRotation)

      if(currentNeedleRotation < END_ANGLE) {
        currentNeedleRotation = END_ANGLE
      }
      
 
    Transform.getMutable(clapMeterNeedle).rotation = Quaternion.fromEulerDegrees(0, 0, currentNeedleRotation)
    
   
    }
  })
}


export function resetClapMeter() {
  const clapMeterNeedle = engine.getEntityOrNullByName('Needle')
  if(!clapMeterNeedle || !clapMeterCommsEntity) {
    console.error('Clap meter needle not found')
    return
  }

  ClapScore.getMutable(clapMeterCommsEntity).score = 0
  currentNeedleRotation = START_ANGLE
  Transform.getMutable(clapMeterNeedle).rotation = Quaternion.fromEulerDegrees(0, 0, currentNeedleRotation)
}



