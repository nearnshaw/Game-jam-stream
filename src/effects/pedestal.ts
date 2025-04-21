import { getPlayer } from "@dcl/sdk/src/players"
import { getActions, getTriggers, sceneMessageBus } from "../utils"
import { engine, InputModifier, Transform } from "@dcl/sdk/ecs"
import { Vector3 } from "@dcl/sdk/math"
import { triggerEmote } from "~system/RestrictedActions"
import { getTriggerEvents, getActionEvents } from '@dcl/asset-packs/dist/events'
import { randomDanceEmotes } from "./emotes"
import { TriggerType, TriggerConditionType } from '@dcl/asset-packs'
import { resetClapMeter } from "./clapMeter"
import * as utils from '@dcl-sdk/utils'

var test_avatar = "NicoE"

var amIOnPedestal = false




// y si lo controlo todo desde el Admin?  con GetPlayers


export function pedestalSetup(){


    // getActions("button")?.on("Play Activate Animation", () => {
    //     checkForPedestal()
    // })<

	sceneMessageBus.on("Pedestal", (data) => {
		console.log("Pedestal", data)
		checkForPedestal(data.player)
	})

	//getTriggers("button")?.on(TriggerType.ON_COUNTER_CHANGE, (data) => {
	//	console.log("Button pressed", data)
	//	checkForPedestal()
	//})

}

// runs for all
export function checkForPedestal(avatar: string = test_avatar){

	let myPlayer = getPlayer()

	if (myPlayer) {
		console.log('Name : ', myPlayer.name)
		console.log('UserId : ', myPlayer.userId)

		if(myPlayer.name.toLowerCase() === avatar.toLowerCase() && myPlayer.position && !amIOnPedestal){
			console.log("IM THE CHOSEN ONE")

			// check state of pedestal, if up do fast tween down && lights off. Wait one second, then resposition and tween up.
			amIOnPedestal = true

			InputModifier.createOrReplace(engine.PlayerEntity, {
				mode: InputModifier.Mode.Standard({
					disableJog: true,
					disableRun: true,
					disableJump: true,
					disableWalk: true
				}),
			})

			pedestal(myPlayer.position)

		

		} else if(amIOnPedestal){
			InputModifier.createOrReplace(engine.PlayerEntity, {
				mode: InputModifier.Mode.Standard({
					disableJog: false,
					disableRun: false,
					disableJump: false,
					disableWalk: false
				}),
			})

			amIOnPedestal = false
	
			console.log("I AM NOT ON THE PEDESTAL")
	
		}	
	} 
}

// runs for all
function pedestal(newPosition: Vector3){
	const pedestal = engine.getEntityOrNullByName('pedestal')
	const spiral = engine.getEntityOrNullByName('spiral')
	if (pedestal && spiral) {

		Transform.getMutable(pedestal).position = newPosition

		//const pedestalTriggers = getTriggerEvents(pedestal)
		const pedestalActions = getActionEvents(pedestal)
		pedestalActions.emit('Up', {})
		pedestalActions.emit('Sound', {})

		const spiralActions = getActionEvents(spiral)
		spiralActions.emit('Pop Up', {})

		utils.timers.setTimeout(() => {
			const emote = randomDanceEmotes[Math.floor(Math.random() * randomDanceEmotes.length)]
			triggerEmote({ predefinedEmote: emote })
          }, 3050)	

	}
}

// only runs for admin
export function hidePedestal(){

	
	resetClapMeter()

	const pedestal = engine.getEntityOrNullByName('pedestal')
	const spiral = engine.getEntityOrNullByName('spiral')

	if (pedestal && spiral) {
		const pedestalActions = getActionEvents(pedestal)
		pedestalActions.emit('Down', {})
		const spiralActions = getActionEvents(spiral)
		spiralActions.emit('Hide', {})
	}

	

}
