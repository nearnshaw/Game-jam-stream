import { Color4 } from '@dcl/sdk/math'
import ReactEcs, {
  Label,
  UiEntity,
  type EntityPropTypes,
  type UiBackgroundProps,
  type UiLabelProps,
  type UiTransformProps
} from '@dcl/sdk/react-ecs'
import { merge } from 'ts-deepmerge'
import { getScaleFactor } from '../../canvas/Canvas'
import { primaryTheme } from '../themes/themes'

const theme = primaryTheme

export const HorizontalLabeledControl = (props: {
  labelProps?: UiLabelProps
  uiTransform?: UiTransformProps
  uiBackground?: UiBackgroundProps
  children?: ReactEcs.JSX.Element
}): ReactEcs.JSX.Element => {
  return (
    <UiEntity
      uiTransform={{
        display: 'flex',
        flexDirection: 'row',
        ...props.uiTransform
      }}
      uiBackground={props.uiBackground}
    >
      <Label
        value={props.labelProps?.value ?? ''}
        color={Color4.Black()}
        fontSize={theme.fontSize}
        {...props.labelProps}
        uiTransform={{ width: 100 * getScaleFactor(), height: '100%' }}
      />
      {props.children}
    </UiEntity>
  )
}
export function VerticalLabeledControl(props: {
  containerProps?: EntityPropTypes
  labelProps: UiLabelProps & EntityPropTypes
  children?: ReactEcs.JSX.Element
}): ReactEcs.JSX.Element {
  const labelProps = merge(
    {
      uiTransform: {
        width: '100%',
        height: 20 * getScaleFactor(),
        margin: { bottom: 10 * getScaleFactor() }
      },
      fontSize: theme.smallFontSize,
      font: 'sans-serif',
      color: theme.fontColor,
      textAlign: 'middle-left'
    } satisfies EntityPropTypes & Omit<UiLabelProps, 'value'>,
    props.labelProps
  )

  const containerProps = merge(
    {
      uiTransform: {
        flexDirection: 'column',
        width: 'auto',
        height: 'auto'
      }
    } satisfies EntityPropTypes,
    props.containerProps ?? {}
  )

  return (
    <UiEntity {...containerProps}>
      <Label {...labelProps} />
      {props.children}
    </UiEntity>
  )
}
