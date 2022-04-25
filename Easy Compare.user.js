// ==UserScript==
// @name               Easy Compare
// @description        Compare images
// @version            0.9.4
// @author             Secant (TYT@NexusHD)
// @license            GPL-3.0-or-later
// @supportURL         zzwu@zju.edu.cn
// @contributionURL    https://i.loli.net/2020/02/28/JPGgHc3UMwXedhv.jpg
// @contributionAmount 10
// @include            *
// @require            https://cdn.staticfile.org/jquery/3.4.1/jquery.min.js
// @require            https://bundle.run/pixelmatch@5.1.0
// @resource           PixelMatchCore https://bundle.run/pixelmatch@5.1.0
// @namespace          https://greasyfork.org/users/152136
// @icon               data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='%23008000'%3E%3Cpath id='ld' d='M20 6H10c-2.21 0-4 1.79-4 4v28c0 2.21 1.79 4 4 4h10v4h4V2h-4v4zm0 30H10l10-12v12zM38 6H28v4h10v26L28 24v18h10c2.21 0 4-1.79 4-4V10c0-2.21-1.79-4-4-4z'/%3E%3C/svg%3E
// @grant              GM_xmlhttpRequest
// @grant              GM_download
// @grant              GM_getValue
// @grant              GM_setValue
// @grant              GM_getResourceText
// @grant              unsafewindow
// @connect            hdbits.org
// @connect            awesome-hd.me
// @connect            ptpimg.me
// @connect            imgbox.com
// @connect            malzo.com
// @connect            imagebam.com
// @connect            pixhost.to
// @connect            loli.net
// @connect            funkyimg.com
// @connect            ilikeshots.club
// @connect            z4a.net
// @connect            picgd.com
// @connect            tu.totheglory.im
// @connect            tpimg.ccache.org
// @connect            pterclub.com
// @connect            catbox.moe
// @connect            sm.ms
// @connect            broadcasthe.net
// @connect            *
// ==/UserScript==
// jshint esversion:8, -W054
(async function ($, Mousetrap, pixelmatch, URL) {
  'use strict';

  /*--- Preparation ---*/
  // Mousetrap Pause Plugin
  if (Mousetrap) {
    let target = Mousetrap.prototype || Mousetrap;
    const _originalStopCallback = target.stopCallback;
    target.stopCallback = function (e, element, combo) {
      var self = this;
      if (self.paused) {
        return true;
      }
      return _originalStopCallback.call(self, e, element, combo);
    };
    target.pause = function () {
      var self = this;
      self.paused = true;
    };
    target.unpause = function () {
      var self = this;
      self.paused = false;
    };
    try {
      Mousetrap.init();
    } catch (_) { }
  }

  /*--- Global Contexts ---*/
  // A global timeout ID holder
  let timeout;
  // A global scale factor
  let scale = 10;
  // Regex replacement array that converts thumbs to originals
  const t2oLib = [
    [/\.thumb\.jpe?g$/, ''], // nexusphp
    [/\.md\.png$/, '.png'], // m-team
    [/\.th\.png$/, '.png'], // pterclub
    [/_thumb\.png$/, '.png'], // totheglory
    [/img\.awesome\-hd\.me\/t(\/\d+)?\//, 'img.awesome-hd.me/images/'], // awesome-hd
    [/thumbs((?:\d+)?\.imgbox\.com\/.+_)t\.png$/, 'images$1o.png'], // imgbox
    [/t((?:\d+)?\.pixhost\.to\/)thumbs\//, 'img$1images/'], // pixhost
    [/t(\.hdbits\.org\/.+)\.jpg$/, 'i$1.png'], // hdbits
    [/^.*?imagecache\.php\?url=(https?)%3A%2F%2Fthumbs(\d+)?\.imgbox\.com%2F(\w+)%2F(\w+)%2F(\w+)_t\.png/, '$1://images$2.imgbox.com/$3/$4/$5_o.png']
  ];
  // Skip redirections
  const skipRedirLib = [
    [/^https?:\/\/anonym\.to\/\?(.*)$/, (_, p1) => decodeURIComponent(p1)],
    [/^https?:\/\/www\.dereferer\.org\/\?(.*)$/, (_, p1) => decodeURIComponent(p1)],
    [/^(?:https?:\/\/pterclub\.com)?\/link\.php\?sign=.+?&target=(.*)$/, (_, p1) => decodeURIComponent(p1.replace(/\+/g, ' ')).replace(/ /g, '%20')],
    [/^.*?imagecache\.php\?url=(.*)$/, (_, p1) => decodeURIComponent(p1.replace(/\+/g, ' ')).replace(/ /g, '%20')]
  ];
  // Probable original image selectors on a view page
  const guessSelectorLib = [
    '#image-viewer-container>img',
    '.image-container img',
    'div.img.big>img',
    'img.mainimage',
    'img.main-image',
    'img#img'
  ];
  // Filter function mapping
  const filterImage = {
    'solar': img => rgbImage(img, solarWorker || rgbSolarCurve),
    's2lar': img => rgbImage(img, s2larWorker || rgbS2larCurve)
  };

  /*--- Workers Initialization ---*/
  // Solar Curve
  function solarCurve(x, t = 5, k = 5.5) {
    const m = (k * Math.PI - 128 / t);
    const A = -1 / 4194304 * m;
    const B = 3 / 32768 * m;
    const C = 1 / t;
    return Math.round(
      127.9999 * Math.sin(
        A * x ** 3 + B * x ** 2 + C * x - Math.PI / 2
      ) + 127.5
    ) || 0;
  }
  let rgbSolarCurve = GM_getValue('solarCurve');
  let rgbS2larCurve = GM_getValue('s2larCurve');
  if (!rgbSolarCurve) {
    rgbSolarCurve = [
      Array.from({ length: 256 }, (_, x) => solarCurve(x)),
      Array.from({ length: 256 }, (_, x) => solarCurve(x - 5)),
      Array.from({ length: 256 }, (_, x) => solarCurve(x + 5))
    ];
    GM_setValue('solarCurve', JSON.stringify(rgbSolarCurve));
    rgbS2larCurve = [
      Array.from({ length: 256 }, (_, x) => rgbSolarCurve[0][[rgbSolarCurve[0][x]]]),
      Array.from({ length: 256 }, (_, x) => rgbSolarCurve[1][[rgbSolarCurve[1][x]]]),
      Array.from({ length: 256 }, (_, x) => rgbSolarCurve[2][[rgbSolarCurve[2][x]]])
    ];
    GM_setValue('s2larCurve', JSON.stringify(rgbS2larCurve));
  } else {
    rgbSolarCurve = JSON.parse(rgbSolarCurve);
    rgbS2larCurve = JSON.parse(rgbS2larCurve);
  }
  rgbSolarCurve = rgbSolarCurve.map(e => new Uint8Array(e));
  rgbS2larCurve = rgbS2larCurve.map(e => new Uint8Array(e));
  async function loadBuffer(worker, [R, G, B]) {
    return new Promise((resolve) => {
      worker.onmessage = (e) => {
        resolve(e.data.result);
      };
      worker.postMessage({
        R: R.buffer,
        G: G.buffer,
        B: B.buffer
      }, [R.buffer, G.buffer, B.buffer]);
    });
  }
  // Diff, Solar, S2lar Worker Initialization
  function diffWork(f) {
    f.apply(self);
    const u = Uint8ClampedArray;
    self.onmessage = ({ data: { key, img1, img2, width, height, init } }) => {
      img1 = new u(img1);
      img2 = new u(img2);
      const diff = new u(img1);
      try {
        self.pixelmatch(img1, img2, diff, width, height, init);
        self.postMessage({
          diff: diff.buffer,
          width: width,
          height: height,
          key: key
        }, [diff.buffer]);
      } catch (err) {
        console.warn(err);
        self.postMessage({
          diff: null,
          key: key
        });
      }
    };
  }
  function rgbWork(f) {
    const u = Uint8ClampedArray;
    self.onmessage = ({ data: { key, R, G, B, img, width, height } }) => {
      if (R && G && B) {
        self.RGB = [new u(R), new u(G), new u(B)];
        self.postMessage({ result: true });
      } else {
        img = new u(img);
        const filter = new u(img);
        try {
          f.apply(self, [img, filter, width, height, self.RGB]);
          self.postMessage({
            filter: filter.buffer,
            width: width,
            height: height,
            key: key
          }, [filter.buffer]);
        } catch (err) {
          console.warn(err);
          self.postMessage({
            filter: null,
            key: key
          });
        }
      }
    };
  }
  function stringifyWork(workFun, arg) {
    return `(${workFun.toString()})(${arg})`;
  }
  let diffWorker, solarWorker, s2larWorker;
  let loadBufferPromise;
  try {
    const diffWorkerBlob = new Blob([
      stringifyWork(diffWork, new Function(
        GM_getResourceText('PixelMatchCore')
      ))
    ], { type: 'application/javascript' });
    diffWorker = new Worker(URL.createObjectURL(diffWorkerBlob));
    diffWorker.keyPool = {};
    URL.revokeObjectURL(diffWorkerBlob);
    const rgbWorkerBlob = new Blob([stringifyWork(rgbWork, rgbRemap)], { type: 'application/javascript' });
    const rgbWorkerURL = URL.createObjectURL(rgbWorkerBlob);
    solarWorker = new Worker(rgbWorkerURL);
    solarWorker.keyPool = {};
    const transSo = loadBuffer(solarWorker, rgbSolarCurve);
    s2larWorker = new Worker(rgbWorkerURL);
    s2larWorker.keyPool = {};
    const transS2 = loadBuffer(s2larWorker, rgbS2larCurve);
    URL.revokeObjectURL(rgbWorkerURL);
    loadBufferPromise = Promise.all([transSo, transS2]);
  } catch (e) {
    try {
      const diffWorkerDataURI = `data:application/javascript,${
        encodeURIComponent(
          stringifyWork(diffWork, new Function(
            GM_getResourceText('PixelMatchCore')
          ))
        )}`;
      diffWorker = new Worker(diffWorkerDataURI);
      diffWorker.keyPool = {};
      const rgbWorkerDataURI = `data:application/javascript,${
        encodeURIComponent(
          stringifyWork(rgbWork, rgbRemap)
        )}`;
      solarWorker = new Worker(rgbWorkerDataURI);
      solarWorker.keyPool = {};
      const transSo = loadBuffer(solarWorker, rgbSolarCurve);
      s2larWorker = new Worker(rgbWorkerDataURI);
      s2larWorker.keyPool = {};
      const transS2 = loadBuffer(s2larWorker, rgbS2larCurve);
      loadBufferPromise = Promise.all([transSo, transS2]);
    } catch (e) {
      diffWorker = null;
      solarWorker = null;
    }
  }

  /*--- Helper Functions ---*/
  // Virtual DOM for selection without fetching images
  function $$(htmlString) {
    return $(htmlString, document.implementation.createHTMLDocument('virtual'));
  }
  // Function to make an <canvas/> element
  function makeCanvas(outlineColor = 'red') {
    const $figure = $('<figure/>').css({
      'width': 'fit-content',
      'position': 'fixed',
      'top': '50%',
      'left': '50%',
      'margin': '0',
      'vertical-align': 'middle'
    });
    const $canvas = $(`<canvas/>`).css({
      'display': 'none',
      'transform': 'translate(-50%, -50%)',
      'opacity': '1',
      'outline': '3px solid ' + outlineColor,
      'outline-offset': '2px',
    });
    $figure.append($canvas);
    return $canvas[0];
  }
  // Draw text on canvas
  function drawText(canvas, text, font = '16px sans serif', fillStyle = 'rgba(255,255,255,255)') {
    const context = canvas.getContext('2d');
    context.font = font;
    canvas.width = context.measureText(text).width;
    canvas.height = 20;
    context.font = font;
    context.fillStyle = fillStyle;
    context.fillText(text, 0, 15);
  }
  // Draw image on canvas
  function drawImage(canvas, imageData) {
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    canvas.getContext('2d').putImageData(imageData, 0, 0);
  }
  // Guess original image src from view page
  function guessOriginalImage(url) {
    return new Promise((resolve) => {
      GM_xmlhttpRequest({
        url: url,
        method: 'GET',
        timeout: 6000,
        onload: (x) => {
          if (x.status === 200) {
            try {
              const $e = $$(x.responseText);
              const src = $e.find(guessSelectorLib.join(','))[0].src;
              let realSrc = src;
              for (let pairs of t2oLib) {
                realSrc = realSrc.replace(pairs[0], pairs[1]);
                if (realSrc !== src) {
                  break;
                }
              }
              resolve(realSrc);
            }
            catch (e) {
              console.warn(e);
              resolve(null);
            }
          }
          else {
            console.warn(x);
            resolve(null);
          }
        },
        ontimeout: (e) => {
          console.warn(e);
          resolve(null);
        }
      });
    });
  }
  // RGB channel remap function (lowlevel)
  function rgbRemap(raw, filter, width, height, rgb) {
    const [R, G, B] = rgb;
    for (let row = 0; row < height; ++row) {
      for (let col = 0; col < width; ++col) {
        let ind = col * 4 + row * width * 4;
        filter[ind] = R[raw[ind]];
        filter[ind + 1] = G[raw[ind + 1]];
        filter[ind + 2] = B[raw[ind + 2]];
        filter[ind + 3] = raw[ind + 3];
      }
    }
  }
  // Get ImageData from src with an optional update hook
  // Cross origin is supported
  async function GM_getImageData(src, fn) {
    return new Promise((resolve) => {
      GM_xmlhttpRequest({
        url: src,
        method: 'GET',
        // Blob or Arraybuffer responseType will slow down the page noticeably,
        // so we text type with x-user-defined charset to get raw binaries
        overrideMimeType: 'text/plain; charset=x-user-defined',
        // Progress update hook
        onprogress: (e) => {
          if (typeof (fn) == 'function') {
            if (e.total !== -1) {
              fn(e.loaded / e.total);
            }
            else {
              fn(-e.loaded);
            }
          }
        },
        onload: (e) => {
          if (e.status === 200) {
            // Get binary from text
            const imageResponseText = e.responseText;
            const l = imageResponseText.length;
            const bytes = new Uint8Array(l);
            for (let i = 0; i < l; i++) {
              bytes[i] = imageResponseText.charCodeAt(i) & 0xff;
            }
            // Decode png binary and resolve the image data arraybuffer,
            // createImageBitmap is a multi-thread operation,
            // and won't complain about CSP img-src errors when using Image object
            const type = (e.responseHeaders.match(/content\-type: *(.+)$/m) || ['', 'image/png'])[1];
            let ext;
            switch (type) {
              case 'image/apng':
                ext = '.apng';
                break;
              case 'image/bmp':
                ext = '.bmp';
                break;
              case 'image/gif':
                ext = '.gif';
                break;
              case 'image/x-icon':
                ext = '.ico';
                break;
              case 'image/jpeg':
                ext = '.jpg';
                break;
              case 'image/png':
                ext = '.png';
                break;
              case 'image/svg+xml':
                ext = '.svg';
                break;
              case 'image/tiff':
                ext = '.tiff';
                break;
              case 'image/webp':
                ext = '.webp';
                break;
              default:
                if (type.slice(0, 5) === 'image') {
                  let temp = type.match(/\/(.*)/);
                  if (temp) {
                    ext = '.' + temp;
                  } else {
                    ext = '';
                  }
                } else {
                  ext = (src.match(/\.[^\.]+$/) || [''])[0];
                }
                break;
            }
            createImageBitmap(new Blob([bytes], { type: type }))
              .then((e) => {
                const [width, height] = [e.width, e.height];
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const context = canvas.getContext('2d');
                context.drawImage(e, 0, 0);
                e.close();
                resolve({
                  imageData: new ImageData(
                    context.getImageData(0, 0, width, height).data,
                    width,
                    height
                  ),
                  extension: ext
                });
              });
          }
          else {
            console.warn(e);
            resolve(null);
          }
        },
        onerror: (e) => {
          console.warn(e);
          resolve(null);
        }
      });
    });
  }

  /*--- Diff and Filter Core Function ---*/
  // Diff images
  async function diffImage(img1, img2, init = { alpha: 0.5, threshold: 0.007 }, worker = diffWorker) {
    if (
      img1 && img2 &&
      img1.width === img2.width &&
      img1.height === img2.height
    ) {
      if (worker) {// async diff
        const [
          raw1,
          raw2,
          width,
          height
        ] = [
            img1.data.buffer,
            img2.data.buffer,
            img1.width,
            img1.height
          ];
        const key = '' + Date.now();
        worker.onmessage = (e) => {
          const returnKey = e.data.key;
          const resolve = worker.keyPool[returnKey];
          if (resolve) {
            resolve(
              new ImageData(
                new Uint8ClampedArray(e.data.diff),
                e.data.width,
                e.data.height
              )
            );
          }
        };
        worker.postMessage({
          img1: raw1,
          img2: raw2,
          width: width,
          height: height,
          init: init,
          key: key
        }, [raw1, raw2]);
        return new Promise((res) => {
          worker.keyPool[key] = res;
        });
      } else {// sync diff
        const [data1, data2, width, height] = [
          img1.data,
          img2.data,
          img1.width,
          img1.height
        ];
        const res = new Uint8ClampedArray(data1);
        pixelmatch(data1, data2, res, width, height, init);
        return (
          new ImageData(
            res,
            width,
            height
          )
        );
      }
    } else {
      return null;
    }
  }
  // RGB channel remap filter image
  async function rgbImage(img, argument) {
    if (img) {
      if (argument instanceof Worker) {
        const worker = argument;
        const [raw, width, height] = [img.data.buffer, img.width, img.height];
        const key = '' + Date.now();
        worker.onmessage = (e) => {
          const returnKey = e.data.key;
          const resolve = worker.keyPool[returnKey];
          if (resolve) {
            resolve(
              new ImageData(
                new Uint8ClampedArray(e.data.filter),
                e.data.width,
                e.data.height
              )
            );
          }
        };
        await loadBufferPromise;
        worker.postMessage({
          img: raw,
          width: width,
          height: height,
          key: key
        }, [raw]);
        return new Promise((res) => {
          worker.keyPool[key] = res;
        });
      } else {
        const rgb = argument;
        const [data, width, height] = [img.data, img.width, img.height];
        const res = new Uint8ClampedArray(data);
        rgbRemap(data, res, width, height, rgb);
        return (
          new ImageData(
            res,
            width,
            height
          )
        );
      }
    } else {
      return null;
    }
  }

  /*--- Get Images: Original, Diffed or Filtered ---*/
  // Get original image function
  function getOriginalImage(target, $overlay) {
    if (target.easyCompare && target.easyCompare.originalImage) {
      const originalImage = target.easyCompare.originalImage;
      if (originalImage.ready) {
        originalImage.style.width = `${scale * 10}%`;
      }
      return originalImage;
    } else {
      const originalCanvas = makeCanvas();
      const updateProgress = (p) => {
        let text;
        if (p !== null && p >= 0) {
          drawText(originalCanvas, `Loading ${(p * 100).toFixed(1)}%`);
        } else if (p < 0) {
          drawText(originalCanvas, `Loading...`);
        }
      };
      const resolveOriginal = (src, onprogress, resolve) => {
        GM_getImageData(src, onprogress).then(({ imageData: originalImageData, extension }) => {
          resolve(originalImageData);
          originalCanvas.src = src;
          originalCanvas.ext = extension;
          drawImage(originalCanvas, originalImageData);
          originalCanvas.style.width = `${scale * 10}%`;
          originalCanvas.ready = true;
        });
      };
      drawText(originalCanvas, `Loading...`);
      originalCanvas.ready = false;
      originalCanvas.targetImage = target;
      $overlay.append(originalCanvas.parentElement);
      if (!target.easyCompare) {
        target.easyCompare = {};
      }
      target.easyCompare.originalImage = originalCanvas;
      target.easyCompare.originalImagePromise = onprogress => new Promise(async (resolve) => {
        let realSrc = target.src;
        // Parse original src from thumb src
        for (let pairs of t2oLib) {
          realSrc = realSrc.replace(pairs[0], pairs[1]);
          if (realSrc !== target.src) {
            resolveOriginal(realSrc, onprogress, resolve);
            return;
          }
        }
        // Guess original src from hyper link
        let href, hrefOriginal;
        if ((hrefOriginal = target.parentElement.href, href = hrefOriginal)) {
          for (let pairs of skipRedirLib) {
            href = href.replace(pairs[0], pairs[1]);
            if (href !== hrefOriginal) {
              break;
            }
          }
          if (href.match(/\.png$|\.jpe?g$|\.webp|\.gif|\.bmp|\.svg$/)) {
            resolveOriginal(href, onprogress, resolve);
            return;
          } else {
            guessOriginalImage(href).then(src => {
              resolveOriginal(src || realSrc, onprogress, resolve);
              return;
            });
          }
        } else {
          resolveOriginal(realSrc, onprogress, resolve);
          return;
        }
      });
      target.easyCompare.originalImagePromise(updateProgress);
      return originalCanvas;
    }
  }
  // Get diffed image function
  function getDiffedImage(target, base, $overlay) {
    if (target.src === base.src) {
      return getOriginalImage(target);
    }
    if (target.easyCompare && target.easyCompare[base.src]) {
      target.easyCompare[base.src].targetImage = target;
      target.easyCompare[base.src].baseImage = base;
      const diffedCanvas = target.easyCompare[base.src];
      if (diffedCanvas.ready) {
        diffedCanvas.style.width = `${scale * 10}%`;
      }
      return diffedCanvas;
    } else {
      const diffedCanvas = makeCanvas();
      drawText(diffedCanvas, 'Loading...');
      diffedCanvas.ready = false;
      diffedCanvas.targetImage = target;
      diffedCanvas.baseImage = base;
      diffedCanvas.threshold = -1;
      diffedCanvas.step = 0.001;
      $overlay.append(diffedCanvas.parentElement);
      if (!target.easyCompare) {
        target.easyCompare = {};
      }
      target.easyCompare[base.src] = diffedCanvas;
      if (!base.easyCompare) {
        base.easyCompare = {};
      }
      base.easyCompare[target.src] = diffedCanvas;

      let progress = [0, 0];
      // Progress update function
      const updateProgress = (p, ind) => {
        if (p !== null && p >= 0 && ind !== null) {
          progress[ind] = p;
          drawText(diffedCanvas, `Loading ${((progress[0] + progress[1]) * 50).toFixed(1)}%`);
        }
        else if (p < 0) {
          drawText(diffedCanvas, 'Loading...');
        }
        else {
          drawText(diffedCanvas, 'Diffing...');
        }
      };
      getOriginalImage(target, $overlay);
      getOriginalImage(base, $overlay);
      Promise.all([
        target.easyCompare.originalImagePromise((p) => updateProgress(p, 0)),
        base.easyCompare.originalImagePromise((p) => updateProgress(p, 1))
      ]).then(imageData => {
        updateProgress(null, null);
        return diffImage(...imageData, {
          alpha: 0.5,
          threshold: 0.007
        });
      }).then((diffedImageData) => {
        if (diffedImageData === null) {
          drawText(diffedCanvas, 'Sizes Not Match');
        } else {
          drawImage(diffedCanvas, diffedImageData);
          diffedCanvas.ext = '.png';
          diffedCanvas.threshold = 0.007;
          diffedCanvas.style.width = `${scale * 10}%`;
          diffedCanvas.ready = true;
        }
      }).catch((err) => {
        console.warn(err);
        drawText(diffedCanvas, 'Something Went Wrong');
      });
      return diffedCanvas;
    }
  }
  // Get filtered image function
  function getFilteredImage(target, ftType, $overlay) {
    if (target.easyCompare && target.easyCompare[ftType]) {
      const filteredCanvas = target.easyCompare[ftType];
      if (filteredCanvas.ready) {
        filteredCanvas.style.width = `${scale * 10}%`;
      }
      return filteredCanvas;
    } else {
      const filteredCanvas = makeCanvas();
      drawText(filteredCanvas, 'Loading...');
      filteredCanvas.ready = false;
      filteredCanvas.targetImage = target;
      $overlay.append(filteredCanvas.parentElement);
      if (!target.easyCompare) {
        target.easyCompare = {};
      }
      target.easyCompare[ftType] = filteredCanvas;
      // Progress Update Function
      const updateProgress = (p) => {
        if (p !== null && p >= 0) {
          drawText(filteredCanvas, `Loading ${(p * 100).toFixed(1)}%`);
        } else if (p < 0) {
          drawText(filteredCanvas, 'Loading...');
        } else {
          drawText(filteredCanvas, 'Filtering...');
        }
      };
      // Wait original image and filter the original image
      getOriginalImage(target, $overlay);
      target.easyCompare
        .originalImagePromise(updateProgress).then((imageData) => {
          updateProgress(null);
          return filterImage[ftType](imageData);
        }).then(filterdImageData => {
          drawImage(filteredCanvas, filterdImageData);
          filteredCanvas.ext = '.png';
          filteredCanvas.style.width = `${scale * 10}%`;
          filteredCanvas.ready = true;
        });
      return filteredCanvas;
    }
  }

  /*--- UI Response Functions ---*/
  // Function to acquire active image
  function getActive($overlay) {
    return $overlay.find('canvas:visible');
  }
  // Function fired when compare button is activated
  function activateCompare($target) {
    $target.attr({
      'fill': '#008000'
    }).css({
      'cursor': 'pointer',
      'opacity': '1'
    })[0].state = true;
  }
  // Function fired when leaving image
  function leaveImage($overlay, target = undefined) {
    const original = getActive($overlay).hide()[0];
    if (((original && (target = original.targetImage)) || target) &&
      target.easyCompare && target.easyCompare.boxShadow !== undefined) {
      $(target).css('box-shadow', target.easyCompare.boxShadow);
    }
  }
  // Function fired when compare button is clicked and toggled on
  // (Main UI Logic)
  function enterCompare($overlay, $images, $message) {
    if (Mousetrap) {
      Mousetrap.pause();
    }
    $overlay.show()[0].state = true;
    let colors = ['red', 'blue'];
    let step = 1, baseImage;
    let ftType = 'none';
    let fadingTime = 300;
    // Mouse enter event
    $images.on('mouseenter.compare', (e, triggeredShiftKey) => {
      const target = e.currentTarget;
      clearTimeout(timeout);
      leaveImage($overlay);
      if (!target.easyCompare) {
        target.easyCompare = {};
        target.easyCompare.boxShadow = target.style['box-shadow'];
      }
      $(target).css({
        'box-shadow': '0px 0px 8px ' + colors[0]
      });
      let displayedImage;
      if ((e.shiftKey || triggeredShiftKey) && baseImage) {
        displayedImage = $(getDiffedImage(target, baseImage, $overlay))
          .css('outline-color', colors[0])
          .show();
      } else {
        switch (ftType) {
          case 'none':
            displayedImage = $(getOriginalImage(target, $overlay))
              .css('outline-color', colors[0])
              .show();
            break;
          default:
            displayedImage = $(getFilteredImage(target, ftType, $overlay))
              .css('outline-color', colors[0])
              .show();
            break;
        }
      }
      colors.push(colors.shift());
      //Mouse leave event
    }).on('mouseleave.compare', (e) => {
      const target = e.currentTarget;
      timeout = setTimeout(() => {
        leaveImage($overlay, target);
      }, 200);
    });

    // KeyBoard functions
    function setBaseImage() {
      try {
        baseImage = getActive($overlay)[0].targetImage;
      } catch (err) {
        baseImage = undefined;
        if (!(err instanceof TypeError)) {
          console.warn(err);
        }
      }
    }
    function downloadImage(name = 'easycompare') {
      try {
        const target = getActive($overlay)[0];
        const url = target.src || target.toDataURL('image/png').replace(/^data:image\/[^;]/, 'data:application/octet-stream');
        const ext = target.ext || '';
        GM_download({
          url: url,
          name: name + ext
        });
      } catch (err) {
        if (!(err instanceof TypeError)) {
          console.warn(err);
        }
      }
    }
    function toggleFilter(filter) {
      ftType = (ftType === filter ? 'none' : filter);
      try {
        const target = getActive($overlay).hide()[0];
        let $displayImage;
        if (ftType === 'none') {
          $displayImage = $(getOriginalImage(target.targetImage, $overlay));
        } else {
          $displayImage = $(getFilteredImage(target.targetImage, ftType, $overlay));
        }
        $displayImage
          .css('outline-color', target.style['outline-color'])
          .show();
      } catch (err) {
        if (!(err instanceof TypeError)) {
          console.warn(err);
        }
      }
    }
    function adjustView(up) {
      try {
        if (up && scale < 10) {
          scale = scale + 1;
        } else if (up && scale < 30) {
          scale = scale + 2;
        } else if (!up && scale > 10) {
          scale = scale - 2;
        } else if (!up && scale > 1) {
          scale = scale - 1;
        }
        const target = getActive($overlay)[0];
        if (target.ready) {
          if (scale > 10) {
            target.style['image-rendering'] = 'pixelated';
          } else {
            target.style['image-rendering'] = 'auto';
          }
          target.style.width = `${scale * 10}%`;
        }
        $message.text(`Zoom: ${parseInt(scale * 10)}%`).css('opacity', '1');
        setTimeout(() => {
          $message.css('opacity', '0');
        }, fadingTime);
      } catch (err) {
        if (!(err instanceof TypeError)) {
          console.warn(err);
        }
      }
    }
    function setView(scl) {
      try {
        if (scale !== scl) {
          scale = scl;
          const target = getActive($overlay)[0];
          if (target.ready) {
            target.style.width = `${scale * 10}%`;
            target.style['image-rendering'] = 'auto';
          }
          $message.text(`Zoom: ${parseInt(scale * 10)}%`).css('opacity', '1');
          setTimeout(() => {
            $message.css('opacity', '0');
          }, fadingTime);
        }
      } catch (err) {
        if (!(err instanceof TypeError)) {
          console.warn(err);
        }
      }
    }
    function adjustThreshold(up) {
      try {
        const target = getActive($overlay)[0];
        let threshold = target.threshold;
        if (threshold !== undefined && threshold >= 0) {
          const thresholdPrev = threshold;
          $message.text(`Threshold: ${thresholdPrev.toFixed(4)}`).css('opacity', '1');
          if (up) {
            threshold += target.step;
            if (threshold > 1) {
              threshold = 1;
            }
          } else {
            threshold -= target.step;
            if (threshold < 0) {
              threshold = 0;
            }
          }
          target.threshold = -1;
          const [
            baseCanvas,
            targetCanvas
          ] = [
              target.baseImage.easyCompare.originalImage,
              target.targetImage.easyCompare.originalImage
            ];
          diffImage(
            baseCanvas.getContext('2d').getImageData(0, 0, baseCanvas.width, baseCanvas.height),
            targetCanvas.getContext('2d').getImageData(0, 0, targetCanvas.width, targetCanvas.height),
            {
              alpha: 0.5,
              threshold: threshold
            }
          ).then((imageData) => {
            target.getContext('2d').putImageData(imageData, 0, 0);
            $message.text(`Threshold: ${threshold.toFixed(4)}`).css('opacity', '1');
            setTimeout(() => {
              target.threshold = threshold;
              $message.css('opacity', '0');
            }, fadingTime);
          });
        }
      } catch (err) {
        if (!(err instanceof TypeError)) {
          console.warn(err);
        }
      }
    }
    function adjustStep(left) {
      try {
        const target = getActive($overlay)[0];
        let step = target.step;
        if (step) {
          if (left && step <= 0.1) {
            target.step = step * 10;
          } else if (left) {
            target.step = 1.0;
          } else if (!left && step >= 0.001) {
            target.step = step / 10;
          } else {
            target.step = 0.0001;
          }
          $message.text(`Step: ${target.step.toFixed(4)}`).css('opacity', '1');
          setTimeout(() => $message.css('opacity', '0'), fadingTime);
        }
      } catch (err) {
        if (!(err instanceof TypeError)) {
          console.warn(err);
        }
      }
    }
    function clearCache() {
      try {
        leaveImage($overlay, getActive($overlay)[0].targetImage);
      } catch (err) {
        if (!(err instanceof TypeError)) {
          console.warn(err);
        }
      }
      $overlay.find('canvas').toArray().forEach(e => {
        const target = e.targetImage;
        delete target.easyCompare;
        e.parentElement.remove();
      });
    }
    function switchImage(left, shiftKey) {
      try {
        const targetImage = getActive($overlay)[0].targetImage;
        const index = $images.index(targetImage);
        leaveImage($overlay, targetImage);
        const nextElem = $images[left ? index - step : index + step] || $images[index];
        $(nextElem).trigger('mouseenter', [shiftKey]);
      } catch (err) {
        if (!(err instanceof TypeError)) {
          console.warn(err);
        }
      }
    }

    // Scroll and Keyboard event
    $(document).on('scroll.compare', (e) => {
      const temp = getActive($overlay)[0];
      if (temp) {
        const $prev = $(temp.targetImage);
        if (!$prev.is(':hover')) {
          leaveImage($overlay, $prev[0]);
          $images.find('img:hover').trigger('mousenter');
        }
      }// Hot-Keys
    }).on('keydown.compare', (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      switch (e.key) {
        case 'Escape':
          exitCompare($overlay, $images);
          break;
        case 'Shift':
          setBaseImage();
          break;
        case '+': case '=':
          if (e.ctrlKey) {
            adjustView(true);
          }
          break;
        case '-': case '_':
          if (e.ctrlKey) {
            adjustView(false);
          }
          break;
        case 'O': case 'o':
          if (e.ctrlKey) {
            setView(10);
          }
          break;
        case 'P': case 'p':
          if (e.ctrlKey) {
            setView(30);
          }
          break;
        case 'S': case 's':
          if (e.ctrlKey) {
            downloadImage();
          } else {
            toggleFilter('solar');
          }
          break;
        case 'A': case 'a':
          toggleFilter('s2lar');
          break;
        case 'I': case 'i':
          if (e.ctrlKey) {
            setView(1);
          } else {
            adjustThreshold(true);
          }
          break;
        case 'ArrowUp':
          adjustThreshold(true);
          break;
        case 'K': case 'k': case 'ArrowDown':
          adjustThreshold(false);
          break;
        case 'J': case 'j': case 'ArrowLeft':
          adjustStep(true);
          break;
        case 'L': case 'l': case 'ArrowRight':
          if (e.ctrlKey) {
            clearCache();
          } else {
            adjustStep(false);
          }
          break;
        case 'Q':
        case 'q':
          $overlay.css('opacity', 0.5);
          break;
        case '1': case '2': case '3': case '4': case '5': case '6': case '7': case '8': case '9':
          step = parseInt(e.key);
          break;
        case '0':
          step = 10;
          break;
        case 'W': case 'w':
          switchImage(true, e.shiftKey);
          break;
        case 'E': case 'e':
          switchImage(false, e.shiftKey);
          break;
      }
      return false;
    }).on('keyup.compare', (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      switch (e.key) {
        case 'Q':
        case 'q':
          $overlay.css('opacity', '');
          break;
      }
      return false;
    });
  }
  // Function fired when compare button is clicked and toggled off
  // or quit via keyboard 'esc'
  function exitCompare($overlay, $images) {
    if (Mousetrap) {
      Mousetrap.unpause();
    }
    leaveImage($overlay);
    $overlay.hide()[0].state = false;
    $images
      .off('mouseenter.compare')
      .off('mouseleave.compare');
    $(document)
      .off('scroll.compare')
      .off('keydown.compare');
  }

  /*--- Building Blocks ---*/
  // A message on the whole page
  const $message = $('<div>').css({
    'top': '50%',
    'left': '50%',
    'z-index': 2147483647,
    'position': 'fixed',
    'transform': 'translate(-50%, -50%)',
    'opacity': '0',
    'vertical-align': 'middle',
    'pointer-events': 'none',
    'transition': 'all 0.1s',
    'font-size': '500%',
    'color': 'yellow',
    'font-weight': 'bold'
  });
  // An overlay on the whole page
  const $overlay = $('<div/>').css({
    'id': 'easy-compare-overlay',
    'position': 'fixed',
    'top': 0,
    'right': 0,
    'bottom': 0,
    'left': 0,
    'z-index': 2147483646,
    'background-color': 'rgba(0, 0, 0, 0.75)',
    'pointer-events': 'none',
    'display': 'none'
  }).append($message);
  // The compare button
  const $compareButton = $(`<svg xmlns="http://www.w3.org/2000/svg">
<path id="ld" d="M20 6H10c-2.21 0-4 1.79-4 4v28c0 2.21 1.79 4 4 4h10v4h4V2h-4v4zm0 30H10l10-12v12zM38 6H28v4h10v26L28 24v18h10c2.21 0 4-1.79 4-4V10c0-2.21-1.79-4-4-4z"/>
</svg>`).attr({
    'width': '30',
    'height': '30',
    'viewBox': '0 0 48 48',
    'stroke': 'white',
    'stroke-width': '5px',
    'fill': 'gray'
  }).css({
    'position': 'fixed',
    'top': '0px',
    'right': '0px',
    'padding': '15px',
    'box-sizing': 'content-box',
    'z-index': 2147483647,
    'paint-order': 'stroke',
    'opacity': 0,
    'transition': 'all 0.2s',
    'cursor': 'auto'
  }).on('mouseenter', (e) => {
    const $target = $(e.currentTarget);
    if ($target[0].manualFlag) {
      $target.attr({
        'fill': 'gray'
      }).css({
        'opacity': 0.2,
        'pointer-events': 'none'
      });
      $target[0].manualFlag = false;
      const clientWidth = document.documentElement.clientWidth;
      $(document).on('mousemove.compare', ({ clientX, clientY }) => {
        if (clientX < clientWidth - 61 || clientY > 61) {
          $target[0].insideFlag = 0;
          clearTimeout(timeout);
          $target.attr({
            'fill': 'gray'
          }).css({
            'cursor': 'auto',
            'opacity': 0,
            'pointer-events': 'auto'
          })[0].state = false;
          $(document).off('mousemove.compare');
          $target[0].manualFlag = true;
        } else if (clientX >= clientWidth - 45 && clientX <= clientWidth - 15 && clientY >= 15 && clientY <= 45) {
          if (!$target[0].insideFlag) {
            $target[0].insideFlag = 1;
            timeout = setTimeout(() => {
              activateCompare($target);
              $target.css({
                'pointer-events': 'auto'
              });
            }, $overlay[0].state ? 0 : 1000);
          }
        } else if (clientX < clientWidth - 45 || clientX > clientWidth - 15 || clientY < 15 || clientY > 45) {
          $target[0].insideFlag = 0;
          clearTimeout(timeout);
          $target.attr({
            'fill': 'gray'
          }).css({
            'cursor': 'auto',
            'opacity': 0.2,
            'pointer-events': 'none'
          })[0].state = false;
        }
      });
    }
  }).click((e) => {
    if (e.currentTarget.state) {
      switch ($overlay[0].state) {
        case false:
          enterCompare($overlay, $(':not("#easy-compare-overlay") img:visible'), $message);
          break;
        case true:
          exitCompare($overlay, $(':not("#easy-compare-overlay") img:visible'));
          break;
      }
    }
    else {
      let x = e.clientX;
      let y = e.clientY;
      const lowerElement = document
        .elementsFromPoint(x, y)
        .find(e => !['svg', 'path'].includes(e.tagName));
      lowerElement.click();
    }
  }).mousedown((e) => {
    if (e.currentTarget.state) {
      $(e.currentTarget).attr({
        'fill': '#006000'
      });
    }
  }).mouseup((e) => {
    if (e.currentTarget.state) {
      $(e.currentTarget).attr({
        'fill': '#008000'
      });
    }
  });
  $compareButton[0].manualFlag = true;
  $compareButton[0].insideFlag = false;

  /*--- Insert to Document ---*/
  $overlay[0].state = false;
  $compareButton[0].state = false;
  $('body').append($compareButton).append($overlay);

})(window.$.noConflict(true),
  unsafeWindow.Mousetrap,
  window.pixelmatch,
  unsafeWindow.URL.createObjectURL ?
    unsafeWindow.URL :
    unsafeWindow.webkitURL);