//jshint esversion:8
let R, G, B;
self.onmessage = (e) => {
  const key = e.data.key;
  if (e.data.R && e.data.G && e.data.B) {
    R = new Uint8ClampedArray(e.data.R);
    G = new Uint8ClampedArray(e.data.G);
    B = new Uint8ClampedArray(e.data.B);
    self.postMessage({
      result: true
    });
  } else {
    const img = new Uint8ClampedArray(e.data.img);
    const filter = new Uint8ClampedArray(img);
    const width = e.data.width;
    const height = e.data.height;
    try {
      for (let row = 0; row < height; ++row) {
        for (let col = 0; col < width; ++col) {
          let ind = col * 4 + row * width * 4;
          filter[ind] = R[img[ind]];
          filter[ind + 1] = G[img[ind + 1]];
          filter[ind + 2] = B[img[ind + 2]];
          filter[ind + 3] = img[ind + 3];
        }
      }
      self.postMessage({
        filter: filter.buffer,
        width: width,
        height: height,
        key: key
      }, [filter.buffer]);
    }
    catch (err) {
      console.warn(err);
      self.postMessage({
        filter: null,
        key: key
      });
    }
  }
};