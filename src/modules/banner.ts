import { engine, TextShape } from "@dcl/sdk/ecs";
import { resetClapMeter } from "./clapMeter";


export function changeShowcasedUser(name: string, avatarName: string){

    resetClapMeter(avatarName)

    const banner = engine.getEntityOrNullByName("BannerText")
    const banner2 = engine.getEntityOrNullByName("BannerText_2")

    if(banner && banner2){
        TextShape.getMutable(banner).text = name
        TextShape.getMutable(banner2).text = avatarName

    
    }
    
}