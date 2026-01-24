import { Color3, Color4 } from '@dcl/sdk/math'
import { type UiBackgroundProps, type UiFontType, type UiTransformProps } from '@dcl/sdk/react-ecs'
import { getScaleFactor } from '../../canvas/Canvas'

export const accentColor: Color4 = Color4.fromHexString('#5E5A68')
export const secondaryColor: Color4 = Color4.fromHexString('#6B637AFF')

export type UiTheme = {
  uiTransform: UiTransformProps
  uiBackground: UiBackgroundProps
  fontColor: Color4
  disabledFontColor: Color4
  buttonFontSize: number
  fontSize: number
  smallFontSize: number
  titleFontSize: number
  font: UiFontType
  primaryButtonTransform: UiTransformProps
  primaryButtonBackground: UiBackgroundProps
  primaryButtonHoverBackground: UiBackgroundProps
  primaryButtonPressedBackground: UiBackgroundProps
  primaryButtonDisabledBackground: UiBackgroundProps
  // to use in options/buttons/inputs/etc when there are several of them:
  secondaryBackgrounds: UiBackgroundProps[]
  inputBackgroundColor: UiBackgroundProps
  secondaryButtonBackground: UiBackgroundProps
  secondaryButtonDisabledBackground: UiBackgroundProps
}

function factorScaled(theme: UiTheme): UiTheme {
  return {
    ...theme,
    get fontSize(): number {
      return theme.fontSize * getScaleFactor()
    },
    get buttonFontSize(): number {
      return theme.buttonFontSize * getScaleFactor()
    },
    get titleFontSize(): number {
      return theme.titleFontSize * getScaleFactor()
    },
    get smallFontSize(): number {
      return theme.smallFontSize * getScaleFactor()
    }
  }
}

export const primaryTheme: UiTheme = factorScaled({
  fontColor: Color4.White(),
  disabledFontColor: Color4.multiply(Color4.White(), Color4.Gray()),
  buttonFontSize: 15,
  fontSize: 20,
  smallFontSize: 14,
  titleFontSize: 30,
  font: 'sans-serif',
  primaryButtonTransform: {
    padding: '1%',
    height: 'auto',
    borderRadius: 4.5
  },
  primaryButtonBackground: {
    color: accentColor
  },
  primaryButtonHoverBackground: {
    color: Color4.fromHexString('#ff5c7aff')
  },
  primaryButtonPressedBackground: {
    color: Color4.multiply(accentColor, Color4.fromHexString('#AAAAAA'))
  },
  secondaryBackgrounds: ['#F99C58', '#ED6E52', '#E85A4F', '#E03A4C'].map((hexString) => ({
    color: Color4.fromHexString(hexString)
  })),
  inputBackgroundColor: { color: Color4.fromHexString('#FFFFFF') },
  primaryButtonDisabledBackground: {
    color: Color4.fromHexString('#5E5A68')
  },
  secondaryButtonBackground: {
    color: secondaryColor
  },
  secondaryButtonDisabledBackground: {
    color: Color4.multiply(secondaryColor, Color4.Gray())
  },
  uiTransform: {
    padding: {
      top: '5%',
      bottom: '5%',
      left: '5%',
      right: '5%'
    }
  },
  uiBackground: {
    textureMode: 'nine-slices',
    texture: { src: 'assets/scene/Images/team-hub/ui/background.png' },
    textureSlices: {
      top: 0.1,
      bottom: 0.1,
      left: 0.1,
      right: 0.1
    }
  }
})

const primaryButtonColor = Color4.fromColor3(Color3.fromHexString('#393541'))

export const mainTheme: UiTheme = factorScaled({
  fontColor: Color4.Black(),
  disabledFontColor: Color4.multiply(Color4.White(), Color4.Gray()),
  buttonFontSize: 30,
  fontSize: 30,
  titleFontSize: 50,
  smallFontSize: 15,
  font: 'sans-serif',
  primaryButtonTransform: {
    padding: '1%',
    height: 'auto',
    borderRadius: 4.5
  },
  primaryButtonBackground: {
    color: primaryButtonColor
  },
  primaryButtonDisabledBackground: {
    color: Color4.multiply(primaryButtonColor, Color4.Gray())
  },
  primaryButtonHoverBackground: {
    color: Color4.fromHexString('#ff5c7aff')
  },
  primaryButtonPressedBackground: {
    color: Color4.multiply(accentColor, Color4.fromHexString('#AAAAAA'))
  },
  secondaryButtonBackground: {
    color: secondaryColor
  },
  secondaryButtonDisabledBackground: {
    color: Color4.multiply(secondaryColor, Color4.Gray())
  },
  uiTransform: {
    padding: {
      top: '5%',
      bottom: '5%',
      left: '5%',
      right: '5%'
    }
  },
  uiBackground: {
    textureMode: 'nine-slices',
    texture: { src: 'assets/scene/Images/team-hub/mainmenu/background.png' },
    textureSlices: {
      top: 0.1,
      bottom: 0.1,
      left: 0.1,
      right: 0.1
    }
  },
  secondaryBackgrounds: ['#F99C58', '#ED6E52', '#E85A4F', '#E03A4C'].map((hexString) => ({
    color: Color4.fromHexString(hexString)
  })),
  inputBackgroundColor: { color: Color4.fromHexString('#E03A4C') }
})

export const SurveyResultColors: Color4[] = [
  Color4.fromHexString('#FFB95BFF'),
  Color4.fromHexString('#FFA35AFF'),
  Color4.fromHexString('#FF7458FF'),
  Color4.fromHexString('#FF5857FF'),
  Color4.fromHexString('#FF3155FF')
]

export const DCLColors = {
  SILVER: Color4.fromHexString('#A09BA8'),
  RUBY: Color4.fromHexString('#FF2D55'),
  BUTTON: Color4.fromHexString('#F02148')
}
