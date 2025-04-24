import { MeshRenderer, engine, Material, Transform, Tween, EasingFunction, VideoPlayer, pointerEventsSystem, InputAction, MeshCollider, InputModifier } from '@dcl/sdk/ecs'
import { Color4, Quaternion, Vector3 } from '@dcl/sdk/math'
import { getTriggerEvents, getActionEvents } from '@dcl/asset-packs/dist/events'
import { getActions } from '../modules/utils'

export function tiltWorldSetup(){

    getActions("tiltWorld1")?.on("Activate", () => {
        tiltWorld(Quaternion.fromEulerDegrees(0, 0, 30))
    })

    getActions("lever")?.on("Activate", () => {
        tiltWorld(Quaternion.fromEulerDegrees(0, 0, 30))
    })

    getActions("lever")?.on("Deactivate", () => {
        tiltWorld(Quaternion.fromEulerDegrees(0, 0, 0))
    })

    getActions("lever2")?.on("Activate", () => {
        tiltWorld(Quaternion.fromEulerDegrees(0, 0, -30))
    })

    getActions("lever2")?.on("Deactivate", () => {
        tiltWorld(Quaternion.fromEulerDegrees(0, 0, 0))
    })

    getActions("lever3")?.on("Activate", () => {
        tiltWorld(Quaternion.fromEulerDegrees(0, 180, 0))
    })

    getActions("lever3")?.on("Deactivate", () => {
        tiltWorld(Quaternion.fromEulerDegrees(0, 0, 0))
    })

}


function tiltWorld(finalRotation: Quaternion){
	const base = engine.getEntityOrNullByName('base')

	if (base) {

		const currentRot = Transform.get(base).rotation

		Tween.deleteFrom(base)

		Tween.create(base, {
			mode: Tween.Mode.Rotate({
				start: currentRot,
				end: finalRotation,
			}),
			duration: 7000,
			easingFunction: EasingFunction.EF_LINEAR,
		})

	}

	// play sound from pillar
	
}