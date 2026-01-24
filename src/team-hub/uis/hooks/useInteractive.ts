import { InputAction, inputSystem } from '@dcl/sdk/ecs'
import ReactEcs, { type Callback, type Listeners } from '@dcl/sdk/react-ecs'

export function useInteractive(
  onClick?: Callback,
  originalListeners?: Listeners,
  isDisabled?: boolean
): [Listeners, boolean, boolean] {
  const [isHovering, setHovering] = ReactEcs.useState(false)
  const [isPressed, setPressed] = ReactEcs.useState(false)
  const currentlyDisabled = isDisabled ?? false

  const callbacks = {
    onMouseEnter: () => {
      setHovering(!currentlyDisabled)
      if (isPressed && !inputSystem.isPressed(InputAction.IA_POINTER)) {
        setPressed(false)
      }
      originalListeners?.onMouseEnter?.()
    },
    onMouseLeave: () => {
      setHovering(false)
      originalListeners?.onMouseLeave?.()
    },
    onMouseDown: () => {
      setPressed(!currentlyDisabled)
      originalListeners?.onMouseDown?.()
    },
    onMouseUp: () => {
      if (isPressed && onClick !== undefined && !currentlyDisabled) {
        onClick()
      }
      setPressed(false)
      originalListeners?.onMouseUp?.()
    }
  }

  return [callbacks, isHovering, isPressed]
}
