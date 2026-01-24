import { Color4 } from '@dcl/sdk/math'
import ReactEcs, { Button, type UiBackgroundProps, type UiButtonProps } from '@dcl/sdk/react-ecs'
import { merge } from 'ts-deepmerge'
import { getScaleFactor } from '../../canvas/Canvas'
import { useInteractive } from '../hooks/useInteractive'
import { primaryTheme } from '../themes/themes'

export enum ButtonStyle {
  PRIMARY,
  SECONDARY
}

function getFontColor(_buttonStyle: ButtonStyle, disabled: boolean, isHovering: boolean, isPressed: boolean): Color4 {
  if (disabled) return primaryTheme.disabledFontColor
  if (isPressed) return Color4.Yellow()
  return primaryTheme.fontColor
}

function getBackground(
  buttonStyle: ButtonStyle,
  disabled: boolean,
  isHovering: boolean,
  isPressed: boolean
): UiBackgroundProps {
  if (disabled) return primaryTheme.primaryButtonDisabledBackground
  if (isPressed) return primaryTheme.primaryButtonPressedBackground
  if (isHovering) return primaryTheme.primaryButtonHoverBackground
  return primaryTheme.primaryButtonBackground
}

export function ModalButton(props: {
  text: string
  onClick: () => void
  style?: ButtonStyle
  isDisabled?: boolean
  buttonProps?: Partial<UiButtonProps>
}): ReactEcs.JSX.Element {
  const [callbacks, isHovering, isPressed] = useInteractive(props.onClick, props.buttonProps, props.isDisabled)
  const style = props.style ?? ButtonStyle.PRIMARY
  const disabled = props.isDisabled ?? false

  const finalButtonProps = {
    ...merge(
      {
        color: getFontColor(style, disabled, isHovering, isPressed),
        uiTransform: {
          width: 'auto',
          height: 'auto',
          padding: {
            bottom: 12 * getScaleFactor(),
            top: 12 * getScaleFactor(),
            left: 18 * getScaleFactor(),
            right: 18 * getScaleFactor()
          },
          borderRadius: 5 * getScaleFactor(),
          alignSelf: 'center'
        },
        fontSize: primaryTheme.buttonFontSize,
        uiBackground: getBackground(style, disabled, isHovering, isPressed)
      } satisfies Partial<UiButtonProps>,
      props.buttonProps ?? {},
      callbacks
    ),
    value: `<b>${props.text}</b>`
  }

  return <Button {...finalButtonProps}></Button>
}
