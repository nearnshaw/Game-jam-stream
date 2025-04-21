import { EasingFunction, engine, Entity, GltfContainer, Material, MeshRenderer, Schemas, Transform, Tween, TweenLoop, TweenSequence, VisibilityComponent } from "@dcl/sdk/ecs"
import { Color4, Quaternion, Vector3 } from "@dcl/sdk/math"
import { getActions, getRandomHexColor } from "../../utils"


export function lightsSetup(){

  getActions("lightsToggle")?.on("DCL Game Jam", () => {
    addDiscoLight()
})

getActions("lightsToggle")?.on("Deactivate", () => {
  
})

    
}



export const DiscoLight = engine.defineComponent('discoLight', { 
    speed: Schemas.Number,
    startColor: Schemas.Color4,
    targetColor: Schemas.Color4,
    colorFactor: Schemas.Number,
    active: Schemas.Boolean
  })

export function addDiscoLight() {
    //const lightSphere = engine.addEntity()
  
    //Transform.create(lightSphere, { 
    //  position: Vector3.create(24, 14, 24),
      //rotation: Quaternion.fromEulerDegrees(-90, 0, 0),
      
    //})

    const lightSphere = engine.getEntityOrNullByName('Light Ref')

    if(!lightSphere){
        return
    }
  
    // LightSource.createOrReplace(lightSphere, {
    //   active:true, 
    //   brightness: 30000, 
    //   range:30,
    //   color: Color4.fromHexString("#ffb808"),  
    //   type: LightSource.Type.Spot({
    //     innerAngle: 100,
    //     outerAngle: 120,
    //     shadow: PBLightSource_ShadowType.ST_NONE,
    //     shadowMaskTexture: Material.Texture.Common({src: "images/dcl-game-jam.png"})
    //   })
    // })
  
    //  DiscoLight.create(lightSphere, {
    //   speed: 0.2,
    //   startColor: Color4.Yellow(),
    //   targetColor: Color4.fromHexString(getRandomHexColor()),
    //   colorFactor: 0,
    //   active: false
    // })
 
    //MeshRenderer.setSphere(lightSphere) 
  
    Tween.createOrReplace(lightSphere, {
      mode: Tween.Mode.Rotate({
        start: Quaternion.fromEulerDegrees(90, 0, 0),
        end: Quaternion.fromEulerDegrees(90, -180, 0),
      }),
      duration: 20200,
      easingFunction: EasingFunction.EF_LINEAR,
    })
    TweenSequence.createOrReplace(lightSphere, {
      loop: TweenLoop.TL_RESTART,
      sequence: [
        {
          mode: Tween.Mode.Rotate({
            start: Quaternion.fromEulerDegrees(90, -180, 0),
            end: Quaternion.fromEulerDegrees(90, -360, 0),
          }),
          duration: 20200,
          easingFunction: EasingFunction.EF_LINEAR,
        },
      ],
    })

    VisibilityComponent.createOrReplace(lightSphere, {
      visible: true
    })
    
/*   
    let ballFrame = engine.addEntity()
    Transform.create(ballFrame, {
      position: Vector3.create(0, 0, 0),
      rotation: Quaternion.Zero(),
      parent: lightSphere
    })
    GltfContainer.create(ballFrame, {src: "models/disco_ball.glb"}) */
  
   // return lightSphere
  }