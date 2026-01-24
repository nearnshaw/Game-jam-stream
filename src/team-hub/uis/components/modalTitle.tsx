import { Color4 } from '@dcl/sdk/math'
import type ReactEcs from '@dcl/sdk/react-ecs'
import { type EntityPropTypes, Label, type UiLabelProps } from '@dcl/sdk/react-ecs'
import { merge } from 'ts-deepmerge'
import { getScaleFactor } from '../../canvas/Canvas'

export function ModalTitle(props: UiLabelProps & EntityPropTypes): ReactEcs.JSX.Element {
  const finalProps = merge(
    {
      uiTransform: {
        width: '100%',
        height: 45 * getScaleFactor(),
        justifyContent: 'center'
      },
      font: 'sans-serif',
      color: Color4.White(),
      fontSize: 25 * getScaleFactor(),
      textAlign: 'middle-center'
    },
    props
  ) as UiLabelProps & EntityPropTypes
  return Label(finalProps)
}
