function getElementOffset(el) {
  const rect = el.getBoundingClientRect();
  const docEl = document.documentElement;

  const rectTop = rect.top + window.pageYOffset - docEl.clientTop;
  const rectLeft = rect.left + window.pageXOffset - docEl.clientLeft;

  return {
    top: rectTop,
    left: rectLeft
  };
}

function getClientPos(e) {
  let pageX;
  let pageY;

  if (e.touches) {
    pageX = e.touches[0].pageX;
    pageY = e.touches[0].pageY;
  } else {
    pageX = e.pageX;
    pageY = e.pageY;
  }

  return {
    x: pageX,
    y: pageY
  };
}

function clamp(num, min, max) {
  return Math.min(Math.max(num, min), max);
}

function isCropValid(crop) {
  return crop && crop.width && crop.height;
}

function inverseOrd(ord) {
  let inversedOrd;

  if (ord === "n") inversedOrd = "s";
  else if (ord === "ne") inversedOrd = "sw";
  else if (ord === "e") inversedOrd = "w";
  else if (ord === "se") inversedOrd = "nw";
  else if (ord === "s") inversedOrd = "n";
  else if (ord === "sw") inversedOrd = "ne";
  else if (ord === "w") inversedOrd = "e";
  else if (ord === "nw") inversedOrd = "se";

  return inversedOrd;
}

function makeAspectCrop(crop, imageAspect) {
  if (Number.isNaN(crop.aspect) || Number.isNaN(imageAspect)) {
    return crop;
  }

  const completeCrop = { ...crop };

  if (crop.width) {
    completeCrop.height = (crop.width / crop.aspect) * imageAspect;
  }
  if (crop.height) {
    completeCrop.width =
      (completeCrop.height || crop.height) * (crop.aspect / imageAspect);
  }

  if (crop.y + (completeCrop.height || crop.height) > 100) {
    completeCrop.height = 100 - crop.y;
    completeCrop.width = (completeCrop.height * crop.aspect) / imageAspect;
  }

  if (crop.x + (completeCrop.width || crop.width) > 100) {
    completeCrop.width = 100 - crop.x;
    completeCrop.height = (completeCrop.width / crop.aspect) * imageAspect;
  }

  return completeCrop;
}

function resolveCrop(crop, image) {
  if (
    crop &&
    crop.aspect &&
    ((!crop.width && crop.height) || (crop.width && !crop.height))
  ) {
    return makeAspectCrop(crop, image.naturalWidth / image.naturalHeight);
  }

  return crop;
}

function getPixelCrop(image, percentCrop) {
  if (!image || !percentCrop) {
    return null;
  }

  const x = Math.round(image.naturalWidth * (percentCrop.x / 100));
  const y = Math.round(image.naturalHeight * (percentCrop.y / 100));
  const width = Math.round(image.naturalWidth * (percentCrop.width / 100));
  const height = Math.round(image.naturalHeight * (percentCrop.height / 100));

  return {
    x,
    y,
    // Clamp width and height so rounding doesn't cause the crop to exceed bounds.
    width: clamp(width, 0, image.naturalWidth - x),
    height: clamp(height, 0, image.naturalHeight - y)
  };
}

function containCrop(previousCrop, crop, imageAspect) {
  const contained = { ...crop };

  // Don't let the crop grow on the opposite side when hitting an x image boundary.
  let cropXAdjusted = false;
  if (contained.x + contained.width > 100) {
    contained.width = crop.width + (100 - (crop.x + crop.width));
    contained.x = crop.x + (100 - (crop.x + contained.width));
    cropXAdjusted = true;
  } else if (contained.x < 0) {
    contained.width = crop.x + crop.width;
    contained.x = 0;
    cropXAdjusted = true;
  }

  if (cropXAdjusted && crop.aspect) {
    // Adjust height to the resized width to maintain aspect.
    contained.height = (contained.width / crop.aspect) * imageAspect;
    // If sizing in up direction we need to pin Y at the point it
    // would be at the boundary.
    if (previousCrop.y > contained.y) {
      contained.y = crop.y + (crop.height - contained.height);
    }
  }

  // Don't let the crop grow on the opposite side when hitting a y image boundary.
  let cropYAdjusted = false;
  if (contained.y + contained.height > 100) {
    contained.height = crop.height + (100 - (crop.y + crop.height));
    contained.y = crop.y + (100 - (crop.y + contained.height));
    cropYAdjusted = true;
  } else if (contained.y < 0) {
    contained.height = crop.y + crop.height;
    contained.y = 0;
    cropYAdjusted = true;
  }

  if (cropYAdjusted && crop.aspect) {
    // Adjust width to the resized height to maintain aspect.
    contained.width = (contained.height * crop.aspect) / imageAspect;
    // If sizing in up direction we need to pin X at the point it
    // would be at the boundary.
    if (contained.x < crop.x) {
      contained.x = crop.x + (crop.width - contained.width);
    }
  }

  return contained;
}

export default {
  getElementOffset,
  getClientPos,
  isCropValid,
  inverseOrd,
  resolveCrop,
  getPixelCrop,
  containCrop,
  clamp
};

export {
  getElementOffset,
  getClientPos,
  isCropValid,
  inverseOrd,
  resolveCrop,
  getPixelCrop,
  containCrop,
  clamp
};
