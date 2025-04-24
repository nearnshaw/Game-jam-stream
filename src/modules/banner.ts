import { engine, TextShape } from "@dcl/sdk/ecs";
import { resetClapMeter } from "./clapMeter";


export function changeShowcasedUser(text: string){

    resetClapMeter(text)

    const banner = engine.getEntityOrNullByName("BannerText")

    if(banner){
        TextShape.getMutable(banner).text = text

    
    }
}