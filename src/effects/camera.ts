import { getPlayer } from "@dcl/sdk/src/players"
import { EntityEnumId, getActions, getTransform, getTriggers, sceneMessageBus } from "../utils"
import { engine, InputModifier, Transform, VirtualCamera, MainCamera, Entity, Schemas, VisibilityComponent } from "@dcl/sdk/ecs"
import { Vector3 } from "@dcl/sdk/math"
import { triggerEmote } from "~system/RestrictedActions"
import { getTriggerEvents, getActionEvents } from '@dcl/asset-packs/dist/events'
import { TriggerType, TriggerConditionType } from '@dcl/asset-packs'
import { syncEntity } from "@dcl/sdk/network"


export const GlobalCameraController = engine.defineComponent('GlobalCameraController', {
    secuence: Schemas.Number,
    active: Schemas.Boolean
  }, {
    secuence: 0,
    active: false
  })
  

export function cameraSetup(){

    const screen = engine.getEntityOrNullByName("screen")

    const cam1 = engine.getEntityOrNullByName("VCameraRef")
    const cam2 = engine.getEntityOrNullByName("VCameraRef2")
    const cam3 = engine.getEntityOrNullByName("VCameraRef3")

    const cameraRef = engine.getEntityOrNullByName("cameraToggle")

  

    if(cameraRef &&screen && cam1 && cam2 && cam3){
        VirtualCamera.create(cam1, {lookAtEntity:screen, defaultTransition: {transitionMode: VirtualCamera.Transition.Time(0) } })
        VirtualCamera.create(cam2, {lookAtEntity:screen, defaultTransition: {transitionMode: VirtualCamera.Transition.Time(3) } })
        VirtualCamera.create(cam3, {lookAtEntity:screen, defaultTransition: {transitionMode: VirtualCamera.Transition.Time(3) } })

        
        const camSequences = [ [], [cam1, cam2, cam3], [cam3, cam2, cam1] ]

        const cameraCommsEntity = engine.addEntity()

        GlobalCameraController.create(cameraCommsEntity)

        syncEntity(cameraCommsEntity, [GlobalCameraController.componentId], EntityEnumId.CameraComms)

 
        getActions("cameraToggle")?.on("Deactivate", () => {

            GlobalCameraController.getMutable(cameraCommsEntity).active = false
          
        })

        getActions("cameraToggle")?.on("Sequence1", () => {

            GlobalCameraController.getMutable(cameraCommsEntity).active = true
            GlobalCameraController.getMutable(cameraCommsEntity).secuence = 1   

        })

        getActions("cameraToggle")?.on("Sequence2", () => {

            GlobalCameraController.getMutable(cameraCommsEntity).active = true
            GlobalCameraController.getMutable(cameraCommsEntity).secuence = 2   
           
        })

        getActions("cameraToggle")?.on("Sequence3", () => {

            GlobalCameraController.getMutable(cameraCommsEntity).active = true
            GlobalCameraController.getMutable(cameraCommsEntity).secuence = 3   
           
        })

        GlobalCameraController.onChange(cameraCommsEntity, (data) => {
            if(data){
                console.log("Camera controller", data)

                if(data.active && data.secuence){
                    cameraOn( camSequences[data.secuence])
                } else {
                    cameraOff()
                }
            }
        })
     
 
    }

}

function cameraOn(camsInSequence: Entity[]){

    console.log("Camera on", camsInSequence.length)

    const mainCamera = MainCamera.getMutable(engine.CameraEntity)
    mainCamera.virtualCameraEntity = camsInSequence[0]

    engine.removeSystem(cameraSystem)

    camIndex = 0
    time = 0
    cams = camsInSequence
    engine.addSystem(cameraSystem)

}

function cameraOff(){



    const mainCamera = MainCamera.getMutable(engine.CameraEntity)
    mainCamera.virtualCameraEntity = undefined

    engine.removeSystem(cameraSystem)
}

let camIndex = 0
let time = 0
let cams: Entity[] = []

function cameraSystem(dt: number){
    time += dt
    if(time > 3){
        camIndex++
        time = 0
        const mainCamera = MainCamera.getMutable(engine.CameraEntity)
        mainCamera.virtualCameraEntity = cams[camIndex]
        console.log("Camera index", camIndex)

        if(camIndex >= cams.length){
            console.log("Camera system removed")
            engine.removeSystem(cameraSystem)
        }
    }
}