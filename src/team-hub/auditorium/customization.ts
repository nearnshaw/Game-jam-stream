import {
  engine,
  type MapComponentDefinition,
  Material,
  MaterialTransparencyMode,
  type PBMaterial_PbrMaterial,
  Schemas
} from '@dcl/sdk/ecs'

import { type Color3, Color4 } from '@dcl/sdk/math'
import { syncEntity } from '@dcl/sdk/network'
import { SyncEntityEnumId } from '../syncEntities'

export const customizationEntity = engine.addEntity()

export const CustomizationState = engine.defineComponent('customizationState', {
  accentColor: Schemas.Color4,
  textureSrc: Schemas.String
})
const defaultCustomization = {
  accentColor: Color4.Black(),
  textureSrc: 'https://cryptologos.cc/logos/decentraland-mana-logo.png?v=040'
  // TODO: Change this link when we migrate the repo
}
CustomizationState.create(customizationEntity, defaultCustomization)

type CustomizationStateType = typeof CustomizationState extends MapComponentDefinition<infer Inner> ? Inner : never

export const Customization = {
  onChange(callback: (component: CustomizationStateType | undefined) => void) {
    CustomizationState.onChange(customizationEntity, callback)
  },

  setCustomizationAccentColor(color: Color3) {
    getMutableCustomizationState().accentColor = Color4.fromColor3(color)
  },

  setCustomizationTexture(textureSrc: string) {
    getMutableCustomizationState().textureSrc = textureSrc
  },

  revertToDefault() {
    CustomizationState.createOrReplace(customizationEntity, defaultCustomization)
  }
}

export function getMutableCustomizationState(): CustomizationStateType {
  return CustomizationState.getMutable(customizationEntity)
}

CustomizationState.onChange(customizationEntity, (component) => {
  for (const bannerName of ['BannerLogo', 'BannerLogo_2', 'Logo']) {
    const entity = engine.getEntityOrNullByName(bannerName)
    if (entity !== null) {
      const texture = Material.Texture.Common({
        src: component?.textureSrc ?? ''
      })
      Material.setPbrMaterial(entity, {
        texture,
        transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND,
        specularIntensity: 0,
        metallic: 0,
        roughness: 1
      })
    }
  }

  const color = component?.accentColor ?? Color4.Black()

  const accentMaterialParams: PBMaterial_PbrMaterial = {
    albedoColor: color,
    transparencyMode: MaterialTransparencyMode.MTM_AUTO
  }

  const brightAccentMaterial: PBMaterial_PbrMaterial = {
    albedoColor: Color4.fromInts(color.r * 255 * 2.5, color.g * 255 * 2.5, color.b * 255 * 2.5, color.a),
    transparencyMode: MaterialTransparencyMode.MTM_OPAQUE
  }

  for (const bannerName of ['Accent', 'BannerBackground', 'BannerBackground_2']) {
    const entity = engine.getEntityOrNullByName(bannerName)
    if (entity !== null) {
      Material.setPbrMaterial(entity, accentMaterialParams)
    }
  }

  for (const bannerName of ['AccentColorStage', 'AccentColorStage_BelowPodium']) {
    const entity = engine.getEntityOrNullByName(bannerName)
    if (entity !== null) {
      Material.setPbrMaterial(entity, brightAccentMaterial)
    }
  }
})

export function setupCustomization(): void {
  syncEntity(customizationEntity, [CustomizationState.componentId], SyncEntityEnumId.CUSTOMIZATION_STATE)
}
