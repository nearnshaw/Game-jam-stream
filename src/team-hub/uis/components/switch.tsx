import { engine } from '@dcl/sdk/ecs'
import { Color4 } from '@dcl/sdk/math'
import ReactEcs, { type EntityPropTypes, UiEntity } from '@dcl/sdk/react-ecs'
import { merge } from 'ts-deepmerge'
import { getScaleFactor } from '../../canvas/Canvas'
import { DCLColors } from '../themes/themes'

export function Switch(
  props: {
    initialValue?: boolean
    onChange?: (newValue: boolean) => void
  } & EntityPropTypes
): ReactEcs.JSX.Element {
  const { initialValue = false, onChange, ...rest } = props
  const sf = getScaleFactor()

  const [isChecked, setChecked] = ReactEcs.useState(initialValue)
  const [thumbPosition, setThumbPosition] = ReactEcs.useState(initialValue ? 1 : 0)
  const [animating, setAnimating] = ReactEcs.useState(false)
  const [targetPosition, setTargetPosition] = ReactEcs.useState(initialValue ? 1 : 0)
  const animationSpeed = 3

  // Animation system
  ReactEcs.useEffect(() => {
    if (!animating) return

    function animateSystem(dt: number): void {
      const diff = targetPosition - thumbPosition
      const step = animationSpeed * dt

      if (Math.abs(diff) <= step) {
        setThumbPosition(targetPosition)
        setAnimating(false)
        engine.removeSystem(animateSystem)
      } else {
        setThumbPosition((prev) => prev + Math.sign(diff) * step)
      }
    }

    engine.addSystem(animateSystem)

    // Cleanup (just in case)
    return () => {
      engine.removeSystem(animateSystem)
    }
  }, [animating, thumbPosition, targetPosition])

  // Handle click
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const handleToggle = () => {
    if (animating) return
    const newValue = !isChecked
    setChecked(newValue)
    setTargetPosition(newValue ? 1 : 0)
    setAnimating(true)
    if (onChange != null) onChange(newValue)
  }

  return (
    <UiEntity
      {...merge(
        {
          uiTransform: {
            width: 66 * sf,
            height: 34 * sf,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden'
          },
          onMouseDown: handleToggle
        } satisfies EntityPropTypes,
        rest
      )}
    >
      {/* BACKGROUND OFF */}
      <UiEntity
        uiTransform={{
          width: '100%',
          height: '100%',
          positionType: 'absolute',
          borderRadius: 17 * sf
        }}
        uiBackground={{
          color: Color4.create(0.5, 0.5, 0.5, 1 - thumbPosition)
        }}
      />

      {/* BACKGROUND ON */}
      <UiEntity
        uiTransform={{
          width: '100%',
          height: '100%',
          positionType: 'absolute',
          borderRadius: 17 * sf
        }}
        uiBackground={{
          color: Color4.create(DCLColors.RUBY.r, DCLColors.RUBY.g, DCLColors.RUBY.b, thumbPosition)
        }}
      />

      <UiEntity
        uiTransform={{
          width: 30 * sf,
          height: 30 * sf,
          positionType: 'absolute',
          borderRadius: 15 * sf,
          position: {
            left: (2 + 32 * thumbPosition) * sf
          }
        }}
        uiBackground={{
          color: Color4.White()
        }}
      />
    </UiEntity>
  )
}
