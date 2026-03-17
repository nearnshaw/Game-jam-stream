
import { engine, Entity, GltfNodeModifiers, Tags } from '@dcl/sdk/ecs'
import { Color4 } from '@dcl/sdk/math'
import { getActionEvents } from '@dcl/asset-packs/dist/events'

export class ColoredConfetti {
  /**
   * Properties
   * Define class fields you want to reuse across methods.
   * Example usage: this.myVariable
   */
   // private myVariable: boolean = true
  
  /**
   * Constructor / Inputs
   * Parameters declared here appear in the Script component UI in Creator Hub.
   * Supported types: Entity, String, Number, Boolean, ActionCallback.
   *
   * Note: After editing this file, click the refresh icon in the Script component UI
   * to see updated inputs.
   *
   * The `src` and `entity` fields in the constructor are required by internal references.
   */
  constructor(
    public src: string,     // DO NOT REMOVE
    public entity: Entity,   // DO NOT REMOVE
    // Add your custom inputs below
  ) {}

  /**
   * start()
   * Called once when the script is initialized.
   */
  start() {
    // Script initialization
    console.log("ColoredConfetti initialized for entity:", this.entity);
  }


  /**
   * Applies a color override to all GLBs tagged "Confetti",
   * waits 2 seconds, then activates this script's owning entity.
   */
  public async coloredConfetti(color: Color4): Promise<void> {
    // Find all entities with the "Confetti" tag and apply a GLTF material override
    const confettiEntities = engine.getEntitiesByTag('Confetti')
    for (const entity of confettiEntities) {
      GltfNodeModifiers.createOrReplace(entity, {
        modifiers: [
          {
            // Empty path targets the whole model
            path: '',
            material: {
              material: {
                $case: 'unlit',
                unlit: {
                  diffuseColor: color
                }
              }
            }
          }
        ]
      })
    }

    // Wait 2 seconds before triggering Activate on this script's entity
    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 500)
    })

    getActionEvents(this.entity).emit('Activate', {})
  }

  /**
   * @action
   * Triggers pink confetti (girl reveal).
   */
  public async revealGirlConfetti() {
    // const pink = Color4.create(1, 0.3, 0.8, 1) // soft pastel pink
    // await this.coloredConfetti(pink)
    const confettiEntities = engine.getEntitiesByTag('Pink')
    for (const entity of confettiEntities) {
      getActionEvents(entity).emit('Explode', {})
    }
  }

  /**
   * @action
   * Triggers light blue confetti (boy reveal).
   */
  public async revealBoyConfetti() {
    // const lightBlue = Color4.create(0.3, 0.75, 1, 1) // soft pastel blue
    // await this.coloredConfetti(lightBlue)
    const confettiEntities = engine.getEntitiesByTag('Blue')
    for (const entity of confettiEntities) {
      getActionEvents(entity).emit('Explode', {})
    }
  }

  //   /**
  //  * @action
  //  * Triggers pink confetti (girl reveal).
  //  */
  //   public async resetConfetti() {
  //     const confettiEntities = engine.getEntitiesByTag('Confetti')
  //     for (const entity of confettiEntities) {
  //       GltfNodeModifiers.deleteFrom(entity)
  //     }
  
  //   }

}
