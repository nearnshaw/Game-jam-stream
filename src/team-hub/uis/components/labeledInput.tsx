import { Color4 } from '@dcl/sdk/math'
import ReactEcs, { type EntityPropTypes, Input, type UiInputProps, type UiLabelProps } from '@dcl/sdk/react-ecs'
import { merge } from 'ts-deepmerge'
import { getScaleFactor } from '../../canvas/Canvas'
import { DCLColors } from '../themes/themes'
import { VerticalLabeledControl } from './labeledControl'

export function LabeledInput(props: {
  containerProps?: EntityPropTypes
  inputProps?: Partial<UiInputProps> & EntityPropTypes
  labelProps: UiLabelProps & EntityPropTypes
}): ReactEcs.JSX.Element {
  const inputProps = merge(
    {
      uiTransform: {
        width: '100%',
        height: 35 * getScaleFactor(),
        borderRadius: 10 * getScaleFactor()
      },
      fontSize: 16 * getScaleFactor(),
      placeholderColor: DCLColors.SILVER,
      textAlign: 'middle-left',
      uiBackground: {
        color: Color4.White()
      }
    } satisfies Partial<UiInputProps> & EntityPropTypes,
    props.inputProps ?? {}
  )

  return (
    <VerticalLabeledControl containerProps={props.containerProps} labelProps={props.labelProps}>
      <Input {...inputProps} />
    </VerticalLabeledControl>
  )
}
