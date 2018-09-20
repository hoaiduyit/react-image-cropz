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

## License

MIT © [hoaiduyit](https://github.com/hoaiduyit)
