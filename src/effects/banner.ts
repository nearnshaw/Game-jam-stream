import { engine, TextShape } from "@dcl/sdk/ecs";


export function changeShowcasedUser(text: string){

    const banner = engine.getEntityOrNullByName("BannerText")

    if(banner){
        TextShape.getMutable(banner).text = text
    }
}