import ReactEcs, { type EntityPropTypes, UiEntity } from '@dcl/sdk/react-ecs'

export const Row = (props: EntityPropTypes): ReactEcs.JSX.Element => {
  const { uiTransform, ...rest } = props
  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        height: '100%',
        flexDirection: 'row',
        ...uiTransform
      }}
      {...rest}
    />
  )
}
export const Column = (props: EntityPropTypes): ReactEcs.JSX.Element => {
  const { uiTransform, ...rest } = props
  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        height: '100%',
        flexDirection: 'column',
        ...uiTransform
      }}
      {...rest}
    />
  )
}
