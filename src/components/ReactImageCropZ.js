import React from "react";
import PropTypes from "prop-types";
import { autobind } from "core-decorators";
import {
  getElementOffset,
  getClientPos,
  isCropValid,
  inverseOrd,
  resolveCrop,
  getPixelCrop,
  containCrop,
  clamp
} from "./utils";
import constants from "./utils/constants";

// Feature detection
// https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#Improving_scrolling_performance_with_passive_listeners
let passiveSupported = false;

const EMPTY_GIF =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

@autobind
export default class ReactImageCropZ extends React.PureComponent {
  static propTypes = {
    className: PropTypes.string, // A string of classes to add to the main ReactImageCropZ element.
    crossorigin: PropTypes.string, // Allows setting the crossorigin attribute on the image.
    crop: PropTypes.shape({
      aspect: PropTypes.number,
      x: PropTypes.number,
      y: PropTypes.number,
      width: PropTypes.number,
      height: PropTypes.number
    }), // All crop values are in percentages, and are relative to the image. All crop params are optional.
    disabled: PropTypes.bool, // If true then the user cannot modify or draw a new crop. A class of disabled is also added to the container for user styling.
    imageStyle: PropTypes.shape({}), // Inline styles object to be passed to the image element.
    imageTypeAfterCrop: PropTypes.string, // Image type after crop (support jpeg and png only).
    keepSelection: PropTypes.bool, // If true is passed then selection can't be disabled if the user clicks outside the selection area.
    minWidth: PropTypes.number, // A minimum crop width, as a percentage of the image width.
    minHeight: PropTypes.number, // A minimum crop height, as a percentage of the image height.
    maxWidth: PropTypes.number, // A maximum crop width, as a percentage of the image width.
    maxHeight: PropTypes.number, // A maximum crop height, as a percentage of the image height.
    onChange: PropTypes.func.isRequired, // A callback which happens for every change of the crop. Passes the current crop state object
    onImageError: PropTypes.func, // This event is called if the image had an error loading.
    onComplete: PropTypes.func, // A callback which happens after a resize, drag, or nudge. Passes the current crop state object, as well as a new crop image src.
    onImageLoaded: PropTypes.func, // A callback which happens when the image is loaded. Passes the image DOM element and the pixelCrop if a crop has been specified by this point.
    onDragStart: PropTypes.func, // A callback which happens when a user starts dragging or resizing. It is convenient to manipulate elements outside this component.
    onDragEnd: PropTypes.func, // A callback which happens when a user releases the cursor or touch after dragging or resizing.
    src: PropTypes.string.isRequired, // You can of course pass a blob url or base64 data.
    style: PropTypes.shape({}) // Inline styles object to be passed to the image wrapper element.
  };

  static defaultProps = {
    className: undefined,
    crop: undefined,
    crossorigin: undefined,
    disabled: false,
    maxWidth: 100,
    maxHeight: 100,
    minWidth: 0,
    minHeight: 0,
    keepSelection: false,
    onComplete: () => {},
    onImageError: () => {},
    onImageLoaded: () => {},
    onDragStart: () => {},
    onDragEnd: () => {},
    style: undefined,
    imageStyle: undefined,
    imageTypeAfterCrop: "jpeg"
  };

  state = {};

  componentDidMount() {
    const options = passiveSupported ? { passive: false } : false;

    document.addEventListener("mousemove", this.onDocMouseTouchMove, options);
    document.addEventListener("touchmove", this.onDocMouseTouchMove, options);

    document.addEventListener("mouseup", this.onDocMouseTouchEnd, options);
    document.addEventListener("touchend", this.onDocMouseTouchEnd, options);
    document.addEventListener("touchcancel", this.onDocMouseTouchEnd, options);

    if (this.imageRef.complete || this.imageRef.readyState) {
      if (this.imageRef.naturalWidth === 0) {
        // Broken load on iOS, PR #51
        // https://css-tricks.com/snippets/jquery/fixing-load-in-ie-for-cached-images/
        // http://stackoverflow.com/questions/821516/browser-independent-way-to-detect-when-image-has-been-loaded
        const { src } = this.imageRef;
        this.imageRef.src = EMPTY_GIF;
        this.imageRef.src = src;
      } else {
        this.onImageLoad(this.imageRef);
      }
    }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.crop !== this.props.crop) {
      this.resolveCropAndTriggerChange(this.props.crop, this.imageRef);
    }
  }

  componentWillUnmount() {
    document.removeEventListener("mousemove", this.onDocMouseTouchMove);
    document.removeEventListener("touchmove", this.onDocMouseTouchMove);

    document.removeEventListener("mouseup", this.onDocMouseTouchEnd);
    document.removeEventListener("touchend", this.onDocMouseTouchEnd);
    document.removeEventListener("touchcancel", this.onDocMouseTouchEnd);
  }

  onCropMouseTouchDown(e) {
    const { crop, disabled } = this.props;

    if (disabled) {
      return;
    }

    e.preventDefault(); // Stop drag selection.

    const clientPos = getClientPos(e);

    // Focus for detecting keypress.
    this.componentRef.focus({ preventScroll: true });

    const { ord } = e.target.dataset;
    const xInversed = ord === "nw" || ord === "w" || ord === "sw";
    const yInversed = ord === "nw" || ord === "n" || ord === "ne";

    let cropOffset;

    if (crop.aspect) {
      cropOffset = getElementOffset(this.cropSelectRef);
    }

    this.evData = {
      clientStartX: clientPos.x,
      clientStartY: clientPos.y,
      cropStartWidth: crop.width,
      cropStartHeight: crop.height,
      cropStartX: xInversed ? crop.x + crop.width : crop.x,
      cropStartY: yInversed ? crop.y + crop.height : crop.y,
      xInversed,
      yInversed,
      xCrossOver: xInversed,
      yCrossOver: yInversed,
      startXCrossOver: xInversed,
      startYCrossOver: yInversed,
      isResize: e.target !== this.cropSelectRef,
      ord,
      cropOffset
    };

    this.mouseDownOnCrop = true;
    this.setState({ cropIsActive: true });
  }

  onComponentMouseTouchDown(e) {
    const { crop, disabled, keepSelection, onChange } = this.props;

    if (e.target !== this.imageRef) {
      return;
    }

    if (disabled || (keepSelection && isCropValid(crop))) {
      return;
    }

    e.preventDefault(); // Stop drag selection.

    const clientPos = getClientPos(e);

    // Focus for detecting keypress.
    this.componentRef.focus({ preventScroll: true });

    const imageOffset = getElementOffset(this.imageRef);
    const xPc = ((clientPos.x - imageOffset.left) / this.imageRef.width) * 100;
    const yPc = ((clientPos.y - imageOffset.top) / this.imageRef.height) * 100;

    const nextCrop = {
      aspect: crop ? crop.aspect : undefined,
      x: xPc,
      y: yPc,
      width: 0,
      height: 0
    };

    this.evData = {
      clientStartX: clientPos.x,
      clientStartY: clientPos.y,
      cropStartWidth: nextCrop.width,
      cropStartHeight: nextCrop.height,
      cropStartX: nextCrop.x,
      cropStartY: nextCrop.y,
      xInversed: false,
      yInversed: false,
      xCrossOver: false,
      yCrossOver: false,
      startXCrossOver: false,
      startYCrossOver: false,
      isResize: true,
      ord: "nw"
    };

    this.mouseDownOnCrop = true;
    onChange(nextCrop);
    this.setState({ cropIsActive: true });
  }

  onDocMouseTouchMove(e) {
    const { crop, disabled, onChange, onDragStart } = this.props;

    onDragStart();

    if (disabled) {
      return;
    }

    if (!this.mouseDownOnCrop) {
      return;
    }

    e.preventDefault(); // Stop drag selection.

    const { evData } = this;
    const clientPos = getClientPos(e);

    if (evData.isResize && crop.aspect && evData.cropOffset) {
      clientPos.y = this.straightenYPath(clientPos.x);
    }

    const xDiffPx = clientPos.x - evData.clientStartX;
    evData.xDiffPc = (xDiffPx / this.imageRef.width) * 100;

    const yDiffPx = clientPos.y - evData.clientStartY;
    evData.yDiffPc = (yDiffPx / this.imageRef.height) * 100;

    let nextCrop;

    if (evData.isResize) {
      nextCrop = this.resizeCrop();
    } else {
      nextCrop = this.dragCrop();
    }

    onChange(nextCrop);
  }

  onComponentKeyDown(e) {
    const { crop, disabled, onChange, onComplete } = this.props;

    if (disabled) {
      return;
    }

    const keyCode = e.which;
    let nudged = false;

    if (!isCropValid(crop)) {
      return;
    }

    const nextCrop = this.makeNewCrop();

    if (keyCode === constants.arrowKey.left) {
      nextCrop.x -= constants.nudgeStep;
      nudged = true;
    } else if (keyCode === constants.arrowKey.right) {
      nextCrop.x += constants.nudgeStep;
      nudged = true;
    } else if (keyCode === constants.arrowKey.up) {
      nextCrop.y -= constants.nudgeStep;
      nudged = true;
    } else if (keyCode === constants.arrowKey.down) {
      nextCrop.y += constants.nudgeStep;
      nudged = true;
    }

    if (nudged) {
      e.preventDefault(); // Stop drag selection.
      nextCrop.x = clamp(nextCrop.x, 0, 100 - nextCrop.width);
      nextCrop.y = clamp(nextCrop.y, 0, 100 - nextCrop.height);

      onChange(nextCrop);
      onComplete(
        nextCrop,
        this.getImageUrlAfterCrop(getPixelCrop(this.imageRef, nextCrop))
      );
    }
  }

  onDocMouseTouchEnd() {
    const { crop, disabled, onComplete, onDragEnd } = this.props;

    onDragEnd();

    if (disabled) {
      return;
    }

    if (this.mouseDownOnCrop) {
      this.mouseDownOnCrop = false;

      onComplete(
        crop,
        this.getImageUrlAfterCrop(getPixelCrop(this.imageRef, crop))
      );
      this.setState({ cropIsActive: false });
    }
  }

  onImageLoad(image) {
    const crop = this.resolveCropAndTriggerChange(this.props.crop, image);
    this.props.onImageLoaded(
      image,
      this.getImageUrlAfterCrop(getPixelCrop(image, crop))
    );
  }

  getImageUrlAfterCrop(pixelCrop) {
    const { imageTypeAfterCrop } = this.props;
    const canvas = document.getElementById("react-image-cropz");
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;
    return imageTypeAfterCrop === "jpeg"
      ? canvas.toDataURL("image/jpeg")
      : canvas.toDataURL("image/png");
  }

  getCropStyle() {
    const { crop } = this.props;
    return {
      top: `${crop.y}%`,
      left: `${crop.x}%`,
      width: `${crop.width}%`,
      height: `${crop.height}%`
    };
  }

  getNewSize() {
    const { crop, minWidth, maxWidth, minHeight, maxHeight } = this.props;
    const { evData } = this;
    const imageAspect = this.imageRef.width / this.imageRef.height;

    // New width.
    let newWidth = evData.cropStartWidth + evData.xDiffPc;

    if (evData.xCrossOver) {
      newWidth = Math.abs(newWidth);
    }

    newWidth = clamp(newWidth, minWidth, maxWidth);

    // New height.
    let newHeight;

    if (crop.aspect) {
      newHeight = (newWidth / crop.aspect) * imageAspect;
    } else {
      newHeight = evData.cropStartHeight + evData.yDiffPc;
    }

    if (evData.yCrossOver) {
      // Cap if polarity is inversed and the height fills the y space.
      newHeight = Math.min(Math.abs(newHeight), evData.cropStartY);
    }

    newHeight = clamp(newHeight, minHeight, maxHeight);

    if (crop.aspect) {
      newWidth = clamp((newHeight * crop.aspect) / imageAspect, 0, 100);
    }

    return {
      width: newWidth,
      height: newHeight
    };
  }

  resolveCropAndTriggerChange(crop, image) {
    const resolvedCrop = resolveCrop(crop, image);
    if (resolvedCrop !== crop) {
      this.props.onChange(resolvedCrop);
      this.props.onComplete(
        resolvedCrop,
        this.getImageUrlAfterCrop(getPixelCrop(image, resolvedCrop))
      );
    }
    return resolvedCrop;
  }

  dragCrop() {
    const nextCrop = this.makeNewCrop();
    const { evData } = this;
    nextCrop.x = clamp(
      evData.cropStartX + evData.xDiffPc,
      0,
      100 - nextCrop.width
    );
    nextCrop.y = clamp(
      evData.cropStartY + evData.yDiffPc,
      0,
      100 - nextCrop.height
    );
    return nextCrop;
  }

  resizeCrop() {
    const nextCrop = this.makeNewCrop();
    const { evData } = this;
    const { ord } = evData;
    const imageAspect = this.imageRef.width / this.imageRef.height;

    // On the inverse change the diff so it's the same and
    // the same algo applies.
    if (evData.xInversed) {
      evData.xDiffPc -= evData.cropStartWidth * 2;
    }
    if (evData.yInversed) {
      evData.yDiffPc -= evData.cropStartHeight * 2;
    }

    // New size.
    const newSize = this.getNewSize();

    // Adjust x/y to give illusion of 'staticness' as width/height is increased
    // when polarity is inversed.
    let newX = evData.cropStartX;
    let newY = evData.cropStartY;

    if (evData.xCrossOver) {
      newX = nextCrop.x + (nextCrop.width - newSize.width);
    }

    if (evData.yCrossOver) {
      // This not only removes the little "shake" when inverting at a diagonal, but for some
      // reason y was way off at fast speeds moving sw->ne with fixed aspect only, I couldn't
      // figure out why.
      if (evData.lastYCrossover === false) {
        newY = nextCrop.y - newSize.height;
      } else {
        newY = nextCrop.y + (nextCrop.height - newSize.height);
      }
    }

    const containedCrop = containCrop(
      this.props.crop,
      {
        x: newX,
        y: newY,
        width: newSize.width,
        height: newSize.height,
        aspect: nextCrop.aspect
      },
      imageAspect
    );

    // Apply x/y/width/height changes depending on ordinate (fixed aspect always applies both).
    if (nextCrop.aspect || constants.xyOrds.indexOf(ord) > -1) {
      nextCrop.x = containedCrop.x;
      nextCrop.y = containedCrop.y;
      nextCrop.width = containedCrop.width;
      nextCrop.height = containedCrop.height;
    } else if (constants.xOrds.indexOf(ord) > -1) {
      nextCrop.x = containedCrop.x;
      nextCrop.width = containedCrop.width;
    } else if (constants.yOrds.indexOf(ord) > -1) {
      nextCrop.y = containedCrop.y;
      nextCrop.height = containedCrop.height;
    }

    evData.lastYCrossover = evData.yCrossOver;
    this.crossOverCheck();
    return nextCrop;
  }

  straightenYPath(clientX) {
    const { evData } = this;
    const { ord } = evData;
    const { cropOffset } = evData;
    const cropStartWidth = (evData.cropStartWidth / 100) * this.imageRef.width;
    const cropStartHeight =
      (evData.cropStartHeight / 100) * this.imageRef.height;
    let k;
    let d;

    if (ord === "nw" || ord === "se") {
      k = cropStartHeight / cropStartWidth;
      d = cropOffset.top - cropOffset.left * k;
    } else {
      k = -cropStartHeight / cropStartWidth;
      d = cropOffset.top + (cropStartHeight - cropOffset.left * k);
    }

    return k * clientX + d;
  }

  createCropSelection() {
    const { disabled } = this.props;
    const style = this.getCropStyle();

    return (
      <div
        ref={n => {
          this.cropSelectRef = n;
        }}
        style={style}
        className="crop-selection"
        onMouseDown={this.onCropMouseTouchDown}
        onTouchStart={this.onCropMouseTouchDown}
        role="presentation"
      >
        {!disabled && (
          <div className="drag-elements">
            <div className="drag-bar ord-n" data-ord="n" />
            <div className="drag-bar ord-e" data-ord="e" />
            <div className="drag-bar ord-s" data-ord="s" />
            <div className="drag-bar ord-w" data-ord="w" />

            <div className="drag-handle ord-nw" data-ord="nw" />
            <div className="drag-handle ord-n" data-ord="n" />
            <div className="drag-handle ord-ne" data-ord="ne" />
            <div className="drag-handle ord-e" data-ord="e" />
            <div className="drag-handle ord-se" data-ord="se" />
            <div className="drag-handle ord-s" data-ord="s" />
            <div className="drag-handle ord-sw" data-ord="sw" />
            <div className="drag-handle ord-w" data-ord="w" />
          </div>
        )}
      </div>
    );
  }

  makeNewCrop() {
    return {
      ...constants.defaultCrop,
      ...this.props.crop
    };
  }

  crossOverCheck() {
    const { evData } = this;

    if (
      (!evData.xCrossOver &&
        -Math.abs(evData.cropStartWidth) - evData.xDiffPc >= 0) ||
      (evData.xCrossOver &&
        -Math.abs(evData.cropStartWidth) - evData.xDiffPc <= 0)
    ) {
      evData.xCrossOver = !evData.xCrossOver;
    }

    if (
      (!evData.yCrossOver &&
        -Math.abs(evData.cropStartHeight) - evData.yDiffPc >= 0) ||
      (evData.yCrossOver &&
        -Math.abs(evData.cropStartHeight) - evData.yDiffPc <= 0)
    ) {
      evData.yCrossOver = !evData.yCrossOver;
    }

    const swapXOrd = evData.xCrossOver !== evData.startXCrossOver;
    const swapYOrd = evData.yCrossOver !== evData.startYCrossOver;

    evData.inversedXOrd = swapXOrd ? inverseOrd(evData.ord) : false;
    evData.inversedYOrd = swapYOrd ? inverseOrd(evData.ord) : false;
  }

  render() {
    const {
      className,
      crossorigin,
      crop,
      disabled,
      onImageError,
      src,
      style,
      imageStyle
    } = this.props;
    const { cropIsActive } = this.state;
    let cropSelection;

    if (isCropValid(crop)) {
      cropSelection = this.createCropSelection();
    }

    const componentClasses = ["ReactImageCropZ"];

    if (cropIsActive) {
      componentClasses.push("active");
    }

    if (crop) {
      if (crop.aspect) {
        componentClasses.push("fixed-aspect");
      }

      // In this case we have to shadow the image, since the box-shadow
      // on the crop won't work.
      if (cropIsActive && (!crop.width || !crop.height)) {
        componentClasses.push("crop-invisible");
      }
    }

    if (disabled) {
      componentClasses.push("disabled");
    }

    if (className) {
      componentClasses.push(...className.split(" "));
    }

    return (
      <div
        ref={n => {
          this.componentRef = n;
        }}
        className={componentClasses.join(" ")}
        style={style}
        onTouchStart={this.onComponentMouseTouchDown}
        onMouseDown={this.onComponentMouseTouchDown}
        role="presentation"
        tabIndex="1"
        onKeyDown={this.onComponentKeyDown}
      >
        <img
          ref={n => {
            this.imageRef = n;
          }}
          crossOrigin={crossorigin}
          className="image"
          style={imageStyle}
          src={src}
          onLoad={e => this.onImageLoad(e.target)}
          onError={onImageError}
        />
        {cropSelection}
        <canvas id="react-image-cropz" style={{ display: "none" }} />
      </div>
    );
  }
}
