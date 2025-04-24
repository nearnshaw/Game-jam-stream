import { ReactEcsRenderer } from '@dcl/sdk/react-ecs'
import * as ui from 'dcl-ui-toolkit'
import { getActions, sceneMessageBus } from './utils'
import { checkForPedestal, hidePedestal } from '../effects/pedestal'
import * as utils from '@dcl-sdk/utils'
import { changeShowcasedUser } from './banner'


export const uIprompt = ui.createComponent(ui.FillInPrompt, {
  title: 'Showcase user:',
  onAccept: (value: string) => {
    console.log('showcase user:', value)

    hidePedestal()
    changeShowcasedUser(value)

    utils.timers.setTimeout(() => {
      sceneMessageBus.emit("Pedestal", { player: value})
    }, 1050)

    //getActions("button")?.emit("Ping", {})
    //checkForPedestal(value)
  },
}) 


export function uiSetup(){

    ReactEcsRenderer.setUiRenderer(ui.render) 
    
    
      
  
    
    
    //getActions("pedestalControl")?.on("Deactivate", () => {
    //    uIprompt.hide()
    //})

    //getActions("pedestalControl")?.on("Activate", () => {
    //    uIprompt.show()
    //})
    
    }