import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { getScaleFactor } from '../canvas/Canvas'
import { type SurveyIcon } from './surveyIcon'

export type RatingNumber = number

function IconEntity(props: {
  icon: SurveyIcon
  ratingValue: RatingNumber
  currentRating: RatingNumber
  onSelected: (ratingNumber: RatingNumber) => void
}): ReactEcs.JSX.Element {
  const highlighted = props.currentRating >= props.ratingValue
  const hOffset = highlighted ? 0.5 : 0

  return (
    <UiEntity
      uiTransform={{
        flexDirection: 'column',
        width: 'auto',
        height: 100 * getScaleFactor(),
        alignItems: 'center'
      }}
    >
      <Label value={props.ratingValue.toString()} textAlign="middle-center" fontSize={12 * getScaleFactor()}></Label>
      <UiEntity
        uiTransform={{
          width: 50 * getScaleFactor(),
          height: 50 * getScaleFactor()
        }}
        onMouseDown={() => {
          props.onSelected(props.ratingValue)
        }}
        uiBackground={{
          texture: { src: `assets/scene/Images/team-hub/createSurveyUi/stars.png` },
          textureMode: 'stretch',
          uvs: [0 + hOffset, 0, 0 + hOffset, 1, 0.5 + hOffset, 1, 0.5 + hOffset, 0]
        }}
      ></UiEntity>
    </UiEntity>
  )
}

export function RatingSelector(props: {
  icon: SurveyIcon
  qty: number
  onChange?: (newRating: RatingNumber) => void
  initialRating?: RatingNumber
}): ReactEcs.JSX.Element {
  const [currentValue, setCurrentValue] = ReactEcs.useState<RatingNumber>(props.initialRating ?? 0)
  const elements: ReactEcs.JSX.Element[] = []
  for (let i = 0; i < props.qty; i++) {
    elements.push(
      <IconEntity
        icon={props.icon}
        ratingValue={i + 1}
        currentRating={currentValue}
        onSelected={(ratingNumber) => {
          setCurrentValue(ratingNumber)
          if (props.onChange !== undefined) props.onChange(ratingNumber)
        }}
      ></IconEntity>
    )
  }
  return (
    <UiEntity
      uiTransform={{
        flexDirection: 'row',
        width: '100%',
        height: 100 * getScaleFactor(),
        justifyContent: 'space-between',
        padding: { top: 12 * getScaleFactor(), bottom: 12 * getScaleFactor() }
      }}
    >
      {elements}
    </UiEntity>
  )
}
