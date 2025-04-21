import { ReactEcsRenderer } from '@dcl/sdk/react-ecs'
import * as ui from 'dcl-ui-toolkit'
import { getActions, sceneMessageBus } from './utils'
import { checkForPedestal, hidePedestal } from './effects/pedestal'
import * as utils from '@dcl-sdk/utils'
import { changeBanner } from './effects/banner'

export function uiSetup(){

    ReactEcsRenderer.setUiRenderer(ui.render) 
    
    const prompt = ui.createComponent(ui.FillInPrompt, {
        title: 'Showcase user:',
        onAccept: (value: string) => {
          console.log('showcase user:', value)

          hidePedestal()
          changeBanner(value)

          utils.timers.setTimeout(() => {
            sceneMessageBus.emit("Pedestal", { player: value})
          }, 1050)

          //getActions("button")?.emit("Ping", {})
          //checkForPedestal(value)
        },
      })
      
  
    
    
    getActions("pedestalControl")?.on("Deactivate", () => {
        prompt.hide()
    })

    getActions("pedestalControl")?.on("Activate", () => {
        prompt.show()
    })
    
    }