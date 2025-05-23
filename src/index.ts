import { MeshRenderer, engine, Material, Transform, Tween, EasingFunction, VideoPlayer, pointerEventsSystem, InputAction, MeshCollider, InputModifier } from '@dcl/sdk/ecs'
import { Color4, Quaternion, Vector3 } from '@dcl/sdk/math'
import { getTriggerEvents, getActionEvents } from '@dcl/asset-packs/dist/events'
import { TriggerType } from '@dcl/asset-packs'
import { PlayerIdentityData } from '@dcl/sdk/ecs'
import { getPlayer } from '@dcl/sdk/src/players'
import { triggerEmote } from '~system/RestrictedActions'
import { pedestalSetup } from './effects/pedestal'
import { tiltWorldSetup } from './effects/tiltWorld'
import { cameraSetup } from './effects/camera'
import { uiSetup } from './modules/ui'
import { emoteSetup } from './effects/emotes'
import { clapMeterSetup } from './modules/clapMeter'
import { downloadScheduleData, sendClapData } from './modules/googleDocsLink'
import { setupSchedulControllerData } from './modules/googleDocsLink'
import { gitSetup } from './modules/github'
import { descriptionPanelSetup } from './modules/descriptionPanel'
/**
 * Main entry point for the scene
 * Initializes all scene components and systems
 */
export function main() {
	console.log("Initializing scene components...")
	
	// Set up scene components
	pedestalSetup()
	tiltWorldSetup()
	cameraSetup()
	uiSetup()
	emoteSetup()
	clapMeterSetup()
	gitSetup()
	descriptionPanelSetup()		

	
	// Uncomment to enable disco ball lights
	// lightsSetup()

	downloadScheduleData()	
	setupSchedulControllerData()
	
	console.log("Scene initialization complete")

	
}







