import React, { Component } from "react";
import ReactImageCropZ from "react-image-cropz";

export default class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      src: null,
      crop: {
        x: 10,
        y: 10,
        width: 80,
        height: 80
      }
    };
    this.onImageLoaded = this.onImageLoaded.bind(this);
    this.onCropComplete = this.onCropComplete.bind(this);
    this.onCropChange = this.onCropChange.bind(this);
  }

  onSelectFile = e => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener(
        "load",
        () =>
          this.setState({
            src: reader.result
          }),
        false
      );
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  onImageLoaded(image) {
    console.log("onCropComplete", image);
  }

  onCropComplete(crop, url) {
    console.log("onCropComplete", url);
  }

  onCropChange(crop) {
    this.setState({ crop });
  }

  render() {
    return (
      <div className="App">
        <div className="select-button">
          <input type="file" onChange={this.onSelectFile} />
        </div>
        {this.state.src && (
          <ReactImageCropZ
            src={this.state.src}
            crop={this.state.crop}
            onImageLoaded={this.onImageLoaded}
            onComplete={this.onCropComplete}
            onChange={this.onCropChange}
          />
        )}
      </div>
    );
  }
}
