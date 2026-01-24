import { engine, MainCamera, Transform, VirtualCamera } from '@dcl/sdk/ecs'
import { Color4, Vector3, Color3 } from '@dcl/sdk/math'
import ReactEcs, { Button, type EntityPropTypes, Input, Label, UiEntity } from '@dcl/sdk/react-ecs'
import { Customization } from '../auditorium/customization'
import { primaryTheme } from './themes/themes'
import { Column, Row } from './components/flexOrganizers'
import { getScaleFactor } from '../canvas/Canvas'
import { ModalButtonsContainer, ModalWindow } from './components/modalWindow'
import { ModalTitle } from './components/modalTitle'
import * as utils from '@dcl-sdk/utils'
import { ModalButton } from './components/buttons'
import { useInteractive } from './hooks/useInteractive'

export class CustomizationUI {
  public _isVisible: boolean = false
  public colorPickerVisible: boolean = true
  public customColorMode: boolean = false
  public customColors: Color4[] = [
    Color4.White(),
    Color4.fromHexString('#F1F5A1'),
    Color4.fromHexString('#ED8EE0'),
    Color4.fromHexString('#9FC9D0'),
    Color4.fromHexString('#BBBBBB'),
    Color4.fromHexString('#F0F674'),
    Color4.fromHexString('#FF9797'),
    Color4.fromHexString('#5880EE'),
    Color4.fromHexString('#6D6D6D'),
    Color4.fromHexString('#FFDB38'),
    Color4.fromHexString('#FD5676'),
    Color4.fromHexString('#001EFF'),
    Color4.fromHexString('#2D2D2D'),
    Color4.fromHexString('#FF8C28'),
    Color4.fromHexString('#FF1818')
  ]

  public showExtendedPalette: boolean = false

  public setCustomColorsCallback?: (colors: Color4[]) => void

  public get isVisible(): boolean {
    return this._isVisible
  }

  public set isVisible(value: boolean) {
    this._isVisible = value
    toggleCustomizationCamera(value)
  }

  addCustomColor(color: Color4): void {
    if (this.customColors.length > 0) {
      this.customColors[0] = color
    } else {
      this.customColors.push(color)
    }
    if (this.setCustomColorsCallback != null) {
      this.setCustomColorsCallback(this.customColors)
    }
  }

  create(): ReactEcs.JSX.Element {
    return (
      <ModalWindow
        visible={this.isVisible}
        onClosePressed={() => {
          this.isVisible = false
        }}
        uiTransform={{
          position: { top: '10%', right: '5%' },
          positionType: 'absolute'
        }}
      >
        <ModalTitle value={`<b>Customize Auditorium</b>`}></ModalTitle>
        {this.colorPickerVisible && (
          <ColorPicker
            colors={this.customColors}
            onColorSelect={(color) => {
              Customization.setCustomizationAccentColor(color)
            }}
            onAddCustomColor={() => {
              this.showExtendedPalette = true
              this.colorPickerVisible = false
            }}
          />
        )}

        {this.showExtendedPalette && (
          <RGBGridPalette
            onColorSelect={(color) => {
              Customization.setCustomizationAccentColor(color)
            }}
            onClose={() => {
              this.showExtendedPalette = false
              this.colorPickerVisible = true
            }}
          />
        )}

        <HexColorInput
          uiTransform={{
            height: '10%',
            width: '70%',
            positionType: 'absolute',
            position: { bottom: '30%', left: '10%' }
          }}
          onApply={(color) => {
            Customization.setCustomizationAccentColor(color)
            this.customColors[0] = color
          }}
        />

        <ImageUrlInput
          uiTransform={{
            height: '10%',
            width: '70%',
            positionType: 'absolute',
            position: { bottom: '18%', left: '10%' }
          }}
          onApply={(imageUrl) => {
            Customization.setCustomizationTexture(imageUrl)
          }}
        />

        <ModalButtonsContainer
          uiTransform={{
            justifyContent: 'space-around'
          }}
        >
          <ModalButton
            text="Reset to Default"
            onClick={() => {
              Customization.revertToDefault()
            }}
          ></ModalButton>
          <ModalButton
            text="Finish"
            onClick={() => {
              this.isVisible = false
            }}
          ></ModalButton>
        </ModalButtonsContainer>
      </ModalWindow>
    )
  }
}

const theme = primaryTheme

const ColorPicker = (
  props: EntityPropTypes & {
    colors: Color4[]
    onColorSelect?: (color: Color3) => void
    onAddCustomColor?: () => void
  }
): ReactEcs.JSX.Element => {
  const [selectedColor, setSelectedColor] = ReactEcs.useState<Color3>(Color3.Red())
  const { uiTransform, colors, ...rest } = props
  ReactEcs.useEffect(() => {
    Customization.onChange((component) => {
      if (component?.accentColor !== undefined) {
        setSelectedColor(component.accentColor)
      }
    })
  }, [])

  return (
    <Column
      uiTransform={{
        justifyContent: 'flex-start',
        ...theme.uiTransform,
        ...uiTransform
      }}
      {...rest}
    >
      <Row
        uiTransform={{
          height: '30%',
          width: '100%',
          position: { top: '10%', right: '0px' },
          positionType: 'absolute',
          flexWrap: 'nowrap'
        }}
      >
        <Label
          value="<b>Accent Color</b>"
          color={theme.fontColor}
          fontSize={13 * getScaleFactor()}
          uiTransform={{ width: 'auto', alignSelf: 'flex-start' }}
        />
        <UiEntity
          uiTransform={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'flex-start',
            position: { top: '0px', left: '5px' }
          }}
        >
          <Column uiTransform={{ height: 'auto' }}>
            <Row>
              {colors.slice(0, 4).map((color, index) => (
                <ColorButton
                  key={`color-${index}`}
                  color={color}
                  selectedColor={selectedColor}
                  onMouseDown={() => {
                    setSelectedColor(color)
                    props.onColorSelect?.(color)
                  }}
                />
              ))}
            </Row>
            <Row>
              {colors.slice(4, 8).map((color, index) => (
                <ColorButton
                  key={`color-${index + 4}`}
                  color={color}
                  selectedColor={selectedColor}
                  onMouseDown={() => {
                    setSelectedColor(color)
                    props.onColorSelect?.(color)
                  }}
                />
              ))}
            </Row>
            <Row>
              {colors.slice(8, 12).map((color, index) => (
                <ColorButton
                  key={`color-${index + 8}`}
                  color={color}
                  selectedColor={selectedColor}
                  onMouseDown={() => {
                    setSelectedColor(color)
                    props.onColorSelect?.(color)
                  }}
                />
              ))}
            </Row>
            <Row>
              {colors.slice(12, 15).map((color, index) => (
                <ColorButton
                  key={`color-${index + 12}`}
                  color={color}
                  selectedColor={selectedColor}
                  onMouseDown={() => {
                    setSelectedColor(color)
                    props.onColorSelect?.(color)
                  }}
                />
              ))}

              <ColorAddButton onAddCustomColor={props.onAddCustomColor} />
            </Row>
          </Column>
        </UiEntity>
      </Row>
    </Column>
  )
}

const ColorButton = (
  props: {
    color: Color4
    selectedColor: Color3
  } & EntityPropTypes
): ReactEcs.JSX.Element => {
  ReactEcs.useEffect(() => {}, [props.selectedColor])
  const { color, selectedColor, ...rest } = props
  const isSameColor = color.r === selectedColor.r && color.g === selectedColor.g && color.b === selectedColor.b

  return (
    <Button
      value=""
      uiTransform={{
        width: 30 * getScaleFactor(),
        height: 30 * getScaleFactor(),
        margin: 2 * getScaleFactor(),
        borderRadius: 22,
        borderWidth: isSameColor ? 3 : 1,
        borderColor: isSameColor ? Color4.fromHexString('#FEB45A') : Color4.Black(),
        flexShrink: 0
      }}
      uiBackground={{ color }}
      {...rest}
    />
  )
}

type LoadingStatus = {
  status: 'idle' | 'loading' | 'loaded' | 'error'
  message: string
}

export const ImageUrlInput = (
  props: EntityPropTypes & { onApply?: (imageUrl: string) => void }
): ReactEcs.JSX.Element => {
  const [unsubmittedImageUrl, setUnsubmittedImageUrl] = ReactEcs.useState('')
  const [imageUrl, setImageUrl] = ReactEcs.useState('')
  const [loadingStatus, setLoadingStatus] = ReactEcs.useState<LoadingStatus>({
    status: 'idle',
    message: ''
  })
  const { uiTransform, ...rest } = props

  ReactEcs.useEffect(() => {
    Customization.onChange((component) => {
      if (component?.textureSrc !== undefined) {
        setImageUrl(component.textureSrc)
      }
    })
  }, [])
  ReactEcs.useEffect(() => {
    setUnsubmittedImageUrl(imageUrl)
  }, [imageUrl])

  const submitImageUrl = (): void => {
    const submittedImageUrl = unsubmittedImageUrl

    setImageUrl(submittedImageUrl)
    setLoadingStatus({ status: 'loading', message: 'Loading...' })
    assertImageUrl(submittedImageUrl)
      .then(() => {
        setLoadingStatus({ status: 'loaded', message: 'Loaded successfully' })
        utils.timers.setTimeout(() => {
          setLoadingStatus({ status: 'idle', message: '' })
        }, 3000)
      })
      .catch((error) => {
        setLoadingStatus({ status: 'error', message: `${error}` })
        utils.timers.setTimeout(() => {
          setLoadingStatus({ status: 'idle', message: '' })
        }, 3000)
      })
    if (props.onApply !== undefined) props.onApply(submittedImageUrl)
  }

  return (
    <Column
      uiTransform={{
        ...uiTransform
      }}
      {...rest}
    >
      <Row>
        <Label
          value="<b>Logo</b>"
          color={theme.fontColor}
          fontSize={12 * getScaleFactor()}
          uiTransform={{ width: 100 * getScaleFactor() }}
        />
        <Input
          uiTransform={{
            width: '100%',
            height: '80%',
            position: { top: '10%' }
          }}
          onChange={(value) => {
            setUnsubmittedImageUrl(value)
          }}
          onSubmit={() => {
            submitImageUrl()
          }}
          value={imageUrl}
          fontSize={12 * getScaleFactor()}
          placeholder={'Paste image url here'}
          color={Color4.Black()}
          placeholderColor={Color4.Black()}
          uiBackground={theme.inputBackgroundColor}
        />
        <Button
          value="<b>Apply</b>"
          uiTransform={{
            width: '50%',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: {
              topRight: 6 * getScaleFactor(),
              bottomRight: 6 * getScaleFactor()
            },
            height: '80%',
            position: { top: '10%' }
          }}
          fontSize={theme.buttonFontSize}
          uiBackground={{ color: Color4.fromHexString('#DD2C4A') }}
          onMouseDown={() => {
            submitImageUrl()
          }}
        />
      </Row>
      <Label
        value={loadingStatus.message ?? ''}
        color={
          {
            error: Color4.Red(),
            loading: Color4.Gray(),
            loaded: Color4.Green(),
            idle: Color4.White()
          }[loadingStatus.status]
        }
        fontSize={theme.fontSize / 2.0}
        textAlign="top-left"
        textWrap="nowrap"
        uiTransform={{
          position: { left: 70 * getScaleFactor() },
          width: '70%',
          height: (theme.fontSize / 2.0) * getScaleFactor()
        }}
      />
    </Column>
  )
}

function toggleCustomizationCamera(on: boolean): void {
  const auditoriumCamera = engine.getEntityOrNullByName('AuditoriumCamera')
  if (auditoriumCamera === null) return

  const lookAtEntity = engine.getEntityOrNullByName('Podium')
  if (lookAtEntity === null) return

  VirtualCamera.createOrReplace(auditoriumCamera, {
    defaultTransition: { transitionMode: VirtualCamera.Transition.Time(1.5) },
    lookAtEntity
  })

  Transform.getMutable(auditoriumCamera).position = Vector3.create(0, 9, 0)

  MainCamera.createOrReplace(engine.CameraEntity, {
    virtualCameraEntity: on ? auditoriumCamera : undefined
  })
}

async function assertImageUrl(url: string): Promise<void> {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error('Failed to fetch url.')
  }

  const contentType = response.headers.get('Content-Type') ?? ''
  if (!contentType.startsWith('image/')) {
    throw new Error('URL is not a supported image.')
  }
  if (contentType === 'image/gif') {
    throw new Error('GIFs are not supported.')
  }
}

const RGBGridPalette = (props: {
  onColorSelect: (color: Color3) => void
  onClose: () => void
}): ReactEcs.JSX.Element => {
  const scale = getScaleFactor()
  const steps = 8
  const containerSize = 130 * scale
  const buttonSize = containerSize / steps

  const rows = []
  for (let r = 0; r < steps; r++) {
    const rowButtons = []
    for (let g = 0; g < steps; g++) {
      const color = Color4.fromColor3(Color3.create(r / (steps - 1), g / (steps - 1), 0.5), 1)
      rowButtons.push(
        <Button
          key={`rgb-${r}-${g}`}
          value=""
          uiTransform={{
            width: buttonSize,
            height: buttonSize
          }}
          uiBackground={{ color }}
          onMouseDown={() => {
            props.onColorSelect(Color3.create(r / (steps - 1), g / (steps - 1), 0.5))
          }}
        />
      )
    }
    rows.push(
      <Row
        key={`row-${r}`}
        uiTransform={{
          width: containerSize,
          justifyContent: 'center'
        }}
      >
        {rowButtons}
      </Row>
    )
  }

  return (
    <Column
      uiTransform={{
        width: containerSize * scale,
        height: containerSize + 60 * scale,
        alignSelf: 'center',
        positionType: 'absolute',
        position: { top: 130 * getScaleFactor() },
        justifyContent: 'flex-start',
        alignItems: 'center'
      }}
    >
      <Column
        uiTransform={{
          width: containerSize,
          height: containerSize,
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        {rows}
      </Column>
      <ColorBackButton onClick={props.onClose}></ColorBackButton>
    </Column>
  )
}

export const HexColorInput = (props: EntityPropTypes & { onApply?: (color: Color4) => void }): ReactEcs.JSX.Element => {
  const [inputValue, setInputValue] = ReactEcs.useState('#ffffff')
  const [statusMessage, setStatusMessage] = ReactEcs.useState('')
  const [statusColor, setStatusColor] = ReactEcs.useState(Color4.White())
  const { uiTransform, ...rest } = props

  const submitColor = (): void => {
    const hex = inputValue.trim()
    const validHex = /^#([0-9A-Fa-f]{6})$/

    if (!validHex.test(hex)) {
      setStatusMessage('Invalid HEX (use #RRGGBB)')
      setStatusColor(Color4.Red())
      utils.timers.setTimeout(() => {
        setStatusMessage('')
      }, 3000)

      return
    }

    try {
      const color = Color4.fromHexString(hex)
      setStatusMessage('Color applied!')
      setStatusColor(Color4.Green())
      utils.timers.setTimeout(() => {
        setStatusMessage('')
      }, 3000)

      if (props.onApply != null) props.onApply(color)
    } catch (e) {
      setStatusMessage('Failed to parse color')
      setStatusColor(Color4.Red())
    }
  }

  return (
    <Column uiTransform={{ ...uiTransform }} {...rest}>
      <Row>
        <Label
          value="<b>HEX</b>"
          color={theme.fontColor}
          fontSize={12 * getScaleFactor()}
          uiTransform={{ width: 100 * getScaleFactor() }}
        />
        <Input
          uiTransform={{
            width: '100%',
            height: '80%',
            position: { top: '10%' }
          }}
          onChange={(value) => {
            setInputValue(value)
          }}
          onSubmit={() => {
            submitColor()
          }}
          value={inputValue}
          fontSize={12 * getScaleFactor()}
          color={Color4.Black()}
          placeholderColor={Color4.Black()}
          uiBackground={theme.inputBackgroundColor}
        />
        <Button
          value="<b>Apply</b>"
          uiTransform={{
            width: '50%',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: {
              topRight: 6 * getScaleFactor(),
              bottomRight: 6 * getScaleFactor()
            },
            height: '80%',
            position: { top: '10%' }
          }}
          fontSize={theme.buttonFontSize}
          uiBackground={{ color: Color4.fromHexString('#DD2C4A') }}
          onMouseDown={submitColor}
        />
      </Row>
      <Label
        value={statusMessage}
        color={statusColor}
        fontSize={theme.fontSize / 2.0}
        textAlign="top-left"
        uiTransform={{
          position: { left: 70 * getScaleFactor() },
          width: '70%',
          height: (theme.fontSize / 2.0) * getScaleFactor()
        }}
      />
    </Column>
  )
}

function ColorAddButton(props: { onAddCustomColor?: () => void }): ReactEcs.JSX.Element {
  const [callbacks, isHovering, isPressed] = useInteractive(() => {
    props.onAddCustomColor?.()
  })

  const baseSize = 30 * getScaleFactor()
  const marginNormal = 2 * getScaleFactor()

  return (
    <UiEntity
      key="color-add-button"
      uiTransform={{
        width: baseSize,
        height: baseSize,
        margin: marginNormal,
        flexShrink: 0
      }}
      uiBackground={{
        textureMode: 'stretch',
        texture: { src: 'assets/scene/Images/team-hub/customization/more_button_s.png' },
        color: isPressed ? Color4.Gray() : isHovering ? Color4.White() : Color4.Gray()
      }}
      {...callbacks}
    />
  )
}

function ColorBackButton(props: { onClick?: () => void }): ReactEcs.JSX.Element {
  const [callbacks, isHovering, isPressed] = useInteractive(() => {
    props.onClick?.()
  })

  const baseSize = 32 * getScaleFactor()

  return (
    <UiEntity
      key="color-add-button"
      uiTransform={{
        width: baseSize,
        height: baseSize,
        margin: { top: '4%' },
        flexShrink: 0
      }}
      uiBackground={{
        textureMode: 'stretch',
        texture: { src: 'assets/scene/Images/team-hub/customization/back_button.png' },
        color: isPressed ? Color4.Gray() : isHovering ? Color4.White() : Color4.Gray()
      }}
      {...callbacks}
    />
  )
}
