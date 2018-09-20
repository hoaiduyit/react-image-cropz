# react-image-cropz

> A react library to crop image

[![NPM](https://img.shields.io/npm/v/react-image-cropz.svg)](https://www.npmjs.com/package/react-image-cropz) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

## Install

```bash
npm install --save react-image-cropz
```

## Usage

```jsx
import React from 'react'

import ReactImageCropZ from 'react-image-cropz'

class YourComponent extends React.Component {
  state = {
    crop: {
      x: 10,
      y: 10,
      width: 80,
      height: 80
    }
  }
  onCropChange(crop) {
    this.setState({ crop });
  }

  render () {
    return (
      <ReactImageCropZ
        src="your-image-url"
        crop={this.state.crop}
        onChange={this.onCropChange}
      />
    )
  }
}
```

## Props

### src (required): string
```jsx
<ReactImageCropZ src="path/to/image.jpg" />
```
You can of course pass a blob url or base64 data.
### onChange(crop) (required): function
```js
onCropChange(crop) {
  this.setState({ crop });
}
```
### crop (required): object
All crop values are in percentages, and are relative to the image. All crop params are optional.
```jsx
crop: {
  x: 20,
  y: 10,
  width: 30,
  height: 10
}

<ReactImageCropZ src="path/to/image.jpg" crop={crop} />
```
If you want a fixed aspect you can either omit width and height:
```js
crop: {
 aspect: 16/9
}
```
Or specify one of the dimensions:
```js
crop: {
  aspect: 16/9,
  width: 50,
}
```
In this case the other dimension will be calculated and ``onChange`` and ``onComplete`` will be fired with the completed crop, so that the crop will be rendered on the next pass.

### minWidth (optional): number
A minimum crop width, as a percentage of the image width.

### minHeight (optional): number
A minimum crop height, as a percentage of the image height.

### maxWidth (optional): number
A maximum crop width, as a percentage of the image width.

### maxHeight (optional): number
A maximum crop height, as a percentage of the image height.

### keepSelection (optional): bool
If true is passed then selection can't be disabled if the user clicks outside the selection area.

### disabled (optional): bool
If true then the user cannot modify or draw a new crop. A class of disabled is also added to the container for user styling.

### className (optional): string
A string of classes to add to the main ReactCrop element.

### style (optional): object
Inline styles object to be passed to the image wrapper element.

### imageStyle (optional): object
Inline styles object to be passed to the image element.

### imageTypeAfterCrop (optional): string
Image type after crop (support jpeg and png only).

### onComplete(crop, imageSrc) (optional): function
A callback which happens after a resize, drag, or nudge. Passes the current crop state object, as well as a new crop image src.

### onImageLoaded(image, pixelCrop) (optional): function
A callback which happens when the image is loaded. Passes the image DOM element and the pixelCrop if a crop has been specified by this point.

### onImageError(image) (optional): function
This event is called if the image had an error loading.

### onDragStart() (optional): function
A callback which happens when a user starts dragging or resizing. It is convenient to manipulate elements outside this component.

### onDragEnd() (optional): function
A callback which happens when a user releases the cursor or touch after dragging or resizing.

### crossorigin (optional): string
Allows setting the crossorigin attribute on the image.


## License

MIT © [hoaiduyit](https://github.com/hoaiduyit)
