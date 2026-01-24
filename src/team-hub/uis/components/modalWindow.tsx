import { Color4 } from '@dcl/sdk/math'
import ReactEcs, {
  type Children,
  type EntityPropTypes,
  type UiBackgroundProps,
  UiEntity,
  type UiTransformProps
} from '@dcl/sdk/react-ecs'
import { merge } from 'ts-deepmerge'
import { getScaleFactor } from '../../canvas/Canvas'
import { useInteractive } from '../hooks/useInteractive'

function CloseButton(props: { onClosePressed: () => void }): ReactEcs.JSX.Element {
  const [callbacks, isHovering, isPressed] = useInteractive(props.onClosePressed)
  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        width: (isHovering ? 35 : 30) * getScaleFactor(),
        height: (isHovering ? 35 : 30) * getScaleFactor(),
        position: { top: 35 * getScaleFactor(), right: 40 * getScaleFactor() },
        margin: {
          top: (isHovering ? -17.5 : -15) * getScaleFactor(),
          right: (isHovering ? -17.5 : -15) * getScaleFactor()
        }
      }}
      uiBackground={{
        textureMode: 'stretch',
        texture: { src: 'assets/scene/Images/team-hub/ui/exit.png' },
        color: isPressed ? Color4.Gray() : isHovering ? Color4.fromHexString('#FFFFBB') : Color4.White()
      }}
      {...callbacks}
    ></UiEntity>
  )
}

export function ModalWindow(
  props: EntityPropTypes & {
    visible: boolean
    onClosePressed?: () => void
    children?: ReactEcs.JSX.Element
    contentContainerProps?: EntityPropTypes
  }
): ReactEcs.JSX.Element {
  const { visible, children, onClosePressed, contentContainerProps, ...rest } = props
  const closeable = onClosePressed !== undefined
  const windowProps: EntityPropTypes = merge(
    {
      uiTransform: {
        width: 360 * getScaleFactor(),
        height: 522 * getScaleFactor(),
        pointerFilter: 'block'
      } satisfies UiTransformProps,
      uiBackground: {
        texture: {
          src: 'assets/scene/Images/team-hub/ui/background.png'
        },
        textureMode: 'stretch'
      } satisfies UiBackgroundProps
    },
    rest
  )

  const contentContainerFinalProps: EntityPropTypes = merge(
    {
      uiTransform: {
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        padding: {
          top: 50 * getScaleFactor(),
          bottom: 40 * getScaleFactor(),
          left: 48 * getScaleFactor(),
          right: 48 * getScaleFactor()
        }
      }
    } satisfies EntityPropTypes,
    contentContainerProps ?? {}
  )

  return (
    <UiEntity
      uiTransform={{
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        display: props.visible ? 'flex' : 'none'
      }}
    >
      <UiEntity {...windowProps}>
        {closeable && <CloseButton onClosePressed={onClosePressed} />}
        <UiEntity {...contentContainerFinalProps}>{props.children}</UiEntity>
      </UiEntity>
    </UiEntity>
  )
}

export function ModalButtonsContainer(
  props: EntityPropTypes & {
    children?: Children
    removeAbsolutePosition?: boolean
  }
): ReactEcs.JSX.Element {
  const { children, removeAbsolutePosition, ...rest } = props
  const finalProps = merge(
    {
      uiTransform: {
        width: '100%',
        justifyContent: 'center',
        height: 35 * getScaleFactor(),
        ...((removeAbsolutePosition ?? false)
          ? {}
          : {
              positionType: 'absolute',
              position: { bottom: 40 * getScaleFactor(), left: 0 }
            })
      }
    } satisfies EntityPropTypes,
    rest
  )
  return <UiEntity {...finalProps}>{props.children}</UiEntity>
}
