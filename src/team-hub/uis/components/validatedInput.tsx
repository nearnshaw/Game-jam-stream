import ReactEcs, { type EntityPropTypes, type UiInputProps, Input } from '@dcl/sdk/react-ecs'

export const ValidatedInput = (
  props: EntityPropTypes &
    Partial<UiInputProps> & {
      maxLength?: number
      condition?: (input: string) => boolean
      regex?: RegExp
      defaultValue?: string
    }
): ReactEcs.JSX.Element => {
  const [lastValidValue, setLastValidValue] = ReactEcs.useState(props.value)
  ReactEcs.useEffect(() => {
    setLastValidValue(props.value)
  }, [props.value])

  const isInputValid = (input: string): boolean => {
    if (props.maxLength !== undefined && input.length > props.maxLength) return false
    if (props.condition !== undefined && !props.condition(input)) return false
    if (props.regex !== undefined && !props.regex.test(input)) return false
    return true
  }

  return (
    <Input
      {...props}
      onChange={(value) => {
        if (isInputValid(value)) {
          setLastValidValue(value)
          if (props.onChange !== undefined) props.onChange(value)
        } else {
          if (value === '') {
            setLastValidValue(props.defaultValue)
          } else {
            setLastValidValue('')
            setLastValidValue(lastValidValue)
          }
        }
      }}
      onSubmit={(value) => {
        if (props.onSubmit !== undefined && isInputValid(value)) {
          props.onSubmit(value)
        }
      }}
      value={lastValidValue}
    />
  )
}
