// ==UserScript==
// @name               Easy Compare
// @description        Compare images
// @version            0.2
// @author             Secant (TYT@NexusHD)
// @license            GPL-3.0-or-later
// @supportURL         zzwu@zju.edu.cn
// @contributionURL    https://i.loli.net/2020/02/28/JPGgHc3UMwXedhv.jpg
// @contributionAmount 10
// @include            *
// @require            https://cdn.staticfile.org/jquery/3.4.1/jquery.min.js
// @require            https://bundle.run/pixelmatch@5.1.0
// /require            https://cdn.staticfile.org/pako/1.0.10/pako.min.js
// /require            https://cdn.staticfile.org/upng-js/2.1.0/UPNG.min.js
// @namespace          https://greasyfork.org/users/152136
// @icon               data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='%23008000'%3E%3Cpath id='ld' d='M20 6H10c-2.21 0-4 1.79-4 4v28c0 2.21 1.79 4 4 4h10v4h4V2h-4v4zm0 30H10l10-12v12zM38 6H28v4h10v26L28 24v18h10c2.21 0 4-1.79 4-4V10c0-2.21-1.79-4-4-4z'/%3E%3C/svg%3E
// @grant              GM_xmlhttpRequest
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
// @connect            *

// ==/UserScript==

// # TODO List
// ☑ image diff: https://bundle.run/pixelmatch@5.1.0
//   this is a compation intensive operation,
//   so dataURL dynamic webwoker is used.
// ☐ canvasless (async/sync)
// ☐ more sites support
// ☑ guess images
// ☑ redirect url chopper: deferer, anonymouse

// jshint esversion:8
(function ($, Mousetrap, pixelmatch, UPNG, URL) {
  'use strict';

  // Web Worker Initialization
  let workerDataURL = `data:application/javascript,${encodeURIComponent(`const defaultOptions={threshold:.1,includeAA:!1,alpha:.1,aaColor:[255,255,0],diffColor:[255,0,0],diffMask:!1};function pixelmatch(a,b,c,d,e,f){if(!isPixelData(a)||!isPixelData(b)||c&&!isPixelData(c))throw new Error("Image data: Uint8Array, Uint8ClampedArray or Buffer expected.");if(a.length!==b.length||c&&c.length!==a.length)throw new Error("Image sizes do not match.");if(a.length!==4*(d*e))throw new Error("Image data size does not match width/height.");f=Object.assign({},defaultOptions,f);const g=d*e,h=new Uint32Array(a.buffer,a.byteOffset,g),j=new Uint32Array(b.buffer,b.byteOffset,g);let k=!0;for(let l=0;l<g;l++)if(h[l]!==j[l]){k=!1;break}if(k){if(c&&!f.diffMask)for(let b=0;b<g;b++)drawGrayPixel(a,4*b,f.alpha,c);return 0}const l=35215*f.threshold*f.threshold;let m=0;const[n,o,p]=f.aaColor,[q,r,s]=f.diffColor;for(let g=0;g<e;g++)for(let h=0;h<d;h++){const i=4*(g*d+h),j=colorDelta(a,b,i,i);j>l?!f.includeAA&&(antialiased(a,h,g,d,e,b)||antialiased(b,h,g,d,e,a))?c&&!f.diffMask&&drawPixel(c,i,n,o,p):(c&&drawPixel(c,i,q,r,s),m++):c&&!f.diffMask&&drawGrayPixel(a,i,f.alpha,c)}return m}function isPixelData(a){return ArrayBuffer.isView(a)&&1===a.constructor.BYTES_PER_ELEMENT}function antialiased(a,b,c,d,e,f){const g=Math.max(b-1,0),h=Math.max(c-1,0),i=Math.min(b+1,d-1),j=Math.min(c+1,e-1);let k,l,m,n,o=b===g||b===i||c===h||c===j?1:0,p=0,q=0;for(let r=g;r<=i;r++)for(let e=h;e<=j;e++){if(r===b&&e===c)continue;const f=colorDelta(a,a,4*(c*d+b),4*(e*d+r),!0);if(0!==f)f<p?(p=f,k=r,l=e):f>q&&(q=f,m=r,n=e);else if(o++,2<o)return!1}return 0!==p&&0!==q&&(hasManySiblings(a,k,l,d,e)&&hasManySiblings(f,k,l,d,e)||hasManySiblings(a,m,n,d,e)&&hasManySiblings(f,m,n,d,e))}function hasManySiblings(a,b,c,d,e){const f=Math.max(b-1,0),g=Math.max(c-1,0),h=Math.min(b+1,d-1),i=Math.min(c+1,e-1),j=4*(c*d+b);let k=b===f||b===h||c===g||c===i?1:0;for(let l=f;l<=h;l++)for(let e=g;e<=i;e++){if(l===b&&e===c)continue;const f=4*(e*d+l);if(a[j]===a[f]&&a[j+1]===a[f+1]&&a[j+2]===a[f+2]&&a[j+3]===a[f+3]&&k++,2<k)return!0}return!1}function colorDelta(a,b,c,d,e){let f=a[c+0],g=a[c+1],h=a[c+2],j=a[c+3],k=b[d+0],l=b[d+1],m=b[d+2],n=b[d+3];if(j===n&&f===k&&g===l&&h===m)return 0;255>j&&(j/=255,f=blend(f,j),g=blend(g,j),h=blend(h,j)),255>n&&(n/=255,k=blend(k,n),l=blend(l,n),m=blend(m,n));const o=rgb2y(f,g,h)-rgb2y(k,l,m);if(e)return o;const p=rgb2i(f,g,h)-rgb2i(k,l,m),i=rgb2q(f,g,h)-rgb2q(k,l,m);return .5053*o*o+.299*p*p+.1957*i*i}function rgb2y(a,c,d){return .29889531*a+.58662247*c+.11448223*d}function rgb2i(a,c,d){return .59597799*a-.2741761*c-.32180189*d}function rgb2q(a,c,d){return .21147017*a-.52261711*c+.31114694*d}function blend(b,c){return 255+(b-255)*c}function drawPixel(a,c,d,e,f){a[c+0]=d,a[c+1]=e,a[c+2]=f,a[c+3]=255}function drawGrayPixel(a,c,d,e){const f=a[c+0],h=a[c+1],g=a[c+2],b=blend(rgb2y(f,h,g),d*a[c+3]/255);drawPixel(e,c,b,b,b)}self.onmessage=a=>{img1=new Uint8ClampedArray(a.data.img1),img2=new Uint8ClampedArray(a.data.img2),diff=new Uint8ClampedArray(img1),width=a.data.width,height=a.data.height,init=a.data.init,key=a.data.key;try{pixelmatch(img1,img2,diff,width,height,init),self.postMessage({diff:diff.buffer,key:key},[diff.buffer])}catch(a){console.warn(a),self.postMessage({diff:null,key:key})}};`)}`;
  let diffWorker;
  try {
    diffWorker = new Worker(workerDataURL);
    diffWorker.keyPool = {};
  }
  catch (e) {
    diffWorker = null;
  }

  // Title: Mousetrap Pause Plugin
  // Reference: https://github.com/ccampbell/mousetrap/tree/master/plugins/pause
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
  }

  // A global timeout ID holder
  let timeout;

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
  ];

  // Skip redirections
  const skipRedirLib = [
    [/^https?:\/\/anonym\.to\/\?(.*)$/, (_, p1) => decodeURIComponent(p1)],
    [/^https?:\/\/www\.dereferer\.org\/\?(.*)$/, (_, p1) => decodeURIComponent(p1)]
  ];

  // Probable original image selectors on a view page
  const guessSelectorLib = [
    '#image-viewer-container>img',
    '.image-container img',
    'div.img.big>img',
    'img.mainimage',
    'img#img'
  ];

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

  // Get image uint8 array buffer
  async function getImageBytesBuffer(src, fn) {
    const imageArrayBuffer = await new Promise((resolve) => {
      GM_xmlhttpRequest({
        url: src,
        method: 'GET',
        responseType: 'arraybuffer',
        onprogress: (e) => {
          if (e.total !== -1) {
            fn(e.loaded / e.total);
          }
          else {
            fn(-e.loaded);
          }
        },
        onload: (e) => {
          if (e.status === 200) {
            resolve(e.response);
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
    if (imageArrayBuffer) {
      /*
      const upngObj = UPNG.decode(imageArrayBuffer);
      console.log(upngObj);
      if(upngObj.data) {
        return {
          raw: upngObj.data,
          width: upngObj.width,
          height: upngObj.height
        };
      }
      else {
        return null;
      }
      */
      return new Promise(async (resolve) => {
        const url = await new Promise((resolve) => {
          const fr = new FileReader();
          fr.onload = e => resolve(fr.result);
          fr.readAsDataURL(new Blob([new Uint8Array(imageArrayBuffer)], { type: 'image/png' }));
        });
        const img = new Image();
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        img.onload = function () {
          const [width, height] = [this.width, this.height];
          canvas.width = width;
          canvas.height = height;
          context.drawImage(this, 0, 0, width, height);
          resolve({
            raw: context.getImageData(0, 0, width, height).data.buffer,
            width: width,
            height: height
          });
        };
        img.onerror = function () {
          resolve(null);
        };
        img.src = url;
      });
    }
    else {
      return null;
    }
  }

  // Diff images (async or sync)
  // input: src1, src2, on progress function, pixelmatch initilization object, web worker
  // ouput: diffsrc (dataURL)
  async function diffThem(src1, src2, onprogress, init = { alpha: 0.5, threshold: 0.007 }, worker = diffWorker) {
    const [img1, img2] = await Promise.all([
      getImageBytesBuffer(src1, (p) => onprogress(p, 0)),
      getImageBytesBuffer(src2, (p) => onprogress(p, 1))
    ]);
    if (
      img1 && img2 &&
      img1.width === img2.width &&
      img1.height === img2.height
    ) {
      onprogress(null, null);
      const [raw1, raw2, width, height] = [img1.raw, img2.raw, img1.width, img1.height];
      if (worker) {// async diff
        const key = '' + Date.now();
        worker.onmessage = (e) => {
          const returnKey = e.data.key;
          const resolve = worker.keyPool[returnKey];
          if (resolve) {
            const canvas = document.createElement('canvas');
            [canvas.width, canvas.height] = [width, height];
            const context = canvas.getContext('2d');
            context.putImageData(new ImageData(
              new Uint8ClampedArray(e.data.diff),
              width,
              height
            ), 0, 0);
            resolve(canvas.toDataURL('image/png', 1));
            delete worker.keyPool[returnKey];
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
        const [raw1, raw2, width, height] = [
          new Uint8ClampedArray(img1.raw),
          new Uint8ClampedArray(img2.raw),
          img1.width,
          img1.height
        ];
        const canvas = document.createElement('canvas');
        [canvas.width, canvas.height] = [width, height];
        const context = canvas.getContext('2d');
        const diff = context.createImageData(width, height);
        pixelmatch(raw1, raw2, diff.data, width, height, init);
        context.putImageData(diff, 0, 0);
        return canvas.toDataURL('image/png', 1);
      }
    }
    else {
      return null;
    }
  }

  // Virtual DOM for selection without fetching images
  function $$(htmlString) {
    return $(htmlString, document.implementation.createHTMLDocument('virtual'));
  }

  // Convert text to SVG image
  function text2SVGDataURL(text, width, height = 20) {
    return `data:image/svg+xml,${
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' height="${height}" width="${width}"><text x="0" y="15" fill="white">${text}</text></svg>`
    )}`;
  }

  // Function to make an <img/> element
  function makeImage(src, outlineColor = 'red') {
    return $(`<img src="${src}"/>`).css({
      'display': 'none',
      'top': '50%',
      'left': '50%',
      'position': 'fixed',
      'transform': 'translate(-50%, -50%)',
      'opacity': '1',
      'outline': '3px solid ' + outlineColor,
      'outline-offset': '2px',
      'vertical-align': 'middle'
    });
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
    const original = $overlay.find('img:visible').hide()[0];
    if (target || (original && (target = original.targetImage))) {
      $(target).css('box-shadow', target.boxShadow);
    }
  }

  // Function fired when compare button is clicked and toggled on
  function enterCompare($overlay, $images, $message) {
    if (Mousetrap) {
      Mousetrap.pause();
    }
    $overlay.show()[0].state = true;
    let colors = ['red', 'blue'];
    let step = 1, baseImage, threshold = 0.007;
    $images.toArray().forEach((target) => {
      target.boxShadow = $(target).css('box-shadow');
      Object.defineProperty(target, target.src, {
        get() {
          const hiddenProp = '_' + target.src;
          if (!target[hiddenProp]) {
            let realSrc = target.src;
            for (let pairs of t2oLib) {
              realSrc = realSrc.replace(pairs[0], pairs[1]);
              if (realSrc !== target.src) {
                break;
              }
            }
            const originalImage = makeImage(text2SVGDataURL(`Loading...`, 80), colors[0])[0];
            originalImage.ready = false;
            originalImage.targetImage = target;
            $overlay.append(originalImage);
            target[hiddenProp] = originalImage;
            let href, hrefOriginal;
            if (realSrc === target.src &&
                (hrefOriginal = target.parentElement.href, href = hrefOriginal) &&
                !href.match(/\.png$|\.jpe?g$|\.webp$/)) {
              for (let pairs of skipRedirLib) {
                href = href.replace(pairs[0], pairs[1]);
                if (href !== hrefOriginal) {
                  break;
                }
              }
              guessOriginalImage(href)
                .then(src => {
                originalImage.src = src || realSrc;
                originalImage.ready = true;
              });
            }
            else if (href && href.match(/\.png$|\.jpe?g$|\.webp$/)) {
              originalImage.src = href;
              originalImage.ready = true;
            }
            else {
              originalImage.src = realSrc;
              originalImage.ready = true;
            }
          }
          $(target[hiddenProp]).css({
            'outline-color': colors[0]
          });
          return target[hiddenProp];
        },
        configurable: true
      });
    });
    $images.on('mouseenter.compare', (e, triggeredShiftKey) => {
      const target = e.currentTarget;
      clearTimeout(timeout);
      leaveImage($overlay);
      $(target).css({
        'box-shadow': '0px 0px 8px ' + colors[0]
      });
      if ((e.shiftKey || triggeredShiftKey) &&
          baseImage &&
          baseImage[baseImage.src].ready &&
          target[target.src].ready) {
        const bimg = baseImage;
        if (!target[bimg.src]) {
          const diffImage = makeImage(text2SVGDataURL(`Loading ...`, 80), colors[0])[0];
          diffImage.threshold = -1;
          diffImage.step = 0.001;
          $overlay.append(diffImage);
          target[bimg.src] = diffImage;
          bimg[target.src] = diffImage;
          let progress = [0, 0];
          const updateProgress = (p, ind) => {
            if (p !== null && p >= 0 && ind !== null) {
              progress[ind] = p;
              diffImage.src = text2SVGDataURL(`Loading ${((progress[0] + progress[1]) * 50).toFixed(1)}%`, 120);
            }
            else if (p < 0) {
              diffImage.src = text2SVGDataURL(`Loading...`, 80);
            }
            else {
              diffImage.src = text2SVGDataURL(`Diffing...`, 80);
            }
          };
          diffThem(bimg[bimg.src].src, target[target.src].src, updateProgress, { alpha: 0.5, threshold: threshold })
            .then((diffSrc) => {
            if (diffSrc === null) {
              diffImage.src = text2SVGDataURL(`Sizes Not Match`, 120);
            } else {
              diffImage.src = diffSrc;
              diffImage.threshold = threshold;
            }
          });
        }
        target[bimg.src].baseImage = bimg;
        target[bimg.src].targetImage = target;
        $(target[bimg.src]).show();
      }
      else {
        $(target[target.src]).show();
      }
      colors.push(colors.shift());
    }).on('mouseleave.compare', (e) => {
      const target = e.currentTarget;
      timeout = setTimeout(() => {
        leaveImage($overlay, target);
      }, 200);
    });
    $(document).on('scroll.compare', (e) => {
      const temp = $overlay.find('img:visible')[0];
      if (temp) {
        const $prev = $(temp.targetImage);
        if (!$prev.is(':hover')) {
          $prev.trigger('mouseleave');
          $images.find('img:hover').trigger('mousenter');
        }
      }
    }).on('keydown.compare', (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      switch (e.key) {
        case 'Escape':
          exitCompare($overlay, $images);
          break;
        case 'Shift':
          try {
            const index = $images.index($overlay.find('img:visible')[0].targetImage);
            baseImage = $images[index];
          } catch (err) {
            baseImage = undefined;
            console.warn(err);
          }
          break;
        case 'I': case 'i': case 'ArrowUp':
          try {
            const target = $overlay.find('img:visible')[0];
            let threshold = target.threshold;
            if (threshold !== undefined && threshold >= 0) {
              const thresholdPrev = threshold;
              $message.text(`Threshold: ${thresholdPrev.toFixed(4)}`).css('opacity', '1');
              threshold += target.step;
              if (threshold > 1) {
                threshold = 1;
              }
              target.threshold = -1;
              diffThem(target.baseImage[target.baseImage.src].src,
                       target.targetImage[target.targetImage.src].src,
                       (a, b) => { },
                       { alpha: 0.5, threshold: threshold })
                .then((diffSrc) => {
                let temp;
                if (diffSrc === null) {
                  target.src = text2SVGDataURL(`Sizes Not Match`, 120);
                  temp = thresholdPrev;
                  setTimeout(() => { target.threshold = thresholdPrev; }, 300);
                } else {
                  target.src = diffSrc;
                  temp = threshold;
                  setTimeout(() => { target.threshold = threshold; }, 300);
                }
                $message.text(`Threshold: ${temp.toFixed(4)}`).css('opacity', '1');
                setTimeout(() => $message.css('opacity', '0'), 300);
              });
            }
          } catch (err) {
            console.warn(err);
          }
          break;
        case 'K': case 'k': case 'ArrowDown':
          try {
            const target = $overlay.find('img:visible')[0];
            let threshold = target.threshold;
            if (threshold !== undefined && threshold >= 0) {
              const thresholdPrev = threshold;
              $message.text(`Threshold: ${thresholdPrev.toFixed(4)}`).css('opacity', '1');
              threshold -= target.step;
              if (threshold < 0) {
                threshold = 0;
              }
              target.threshold = -1;
              diffThem(target.baseImage[target.baseImage.src].src,
                       target.targetImage[target.targetImage.src].src,
                       (a, b) => { },
                       { alpha: 0.5, threshold: threshold })
                .then((diffSrc) => {
                let temp;
                if (diffSrc === null) {
                  target.src = text2SVGDataURL(`Sizes Not Match`, 120);
                  temp = thresholdPrev;
                  setTimeout(() => { target.threshold = thresholdPrev; }, 300);
                } else {
                  target.src = diffSrc;
                  temp = threshold;
                  setTimeout(() => { target.threshold = threshold; }, 300);
                }
                $message.text(`Threshold: ${temp.toFixed(4)}`).css('opacity', '1');
                setTimeout(() => $message.css('opacity', '0'), 300);
              });
            }
          } catch (err) {
            console.warn(err);
          }
          break;
        case 'J': case 'j': case 'ArrowLeft':
          try {
            const target = $overlay.find('img:visible')[0];
            switch (target.step) {
              case 0.0001:
                target.step = 0.001;
                break;
              case 0.001:
                target.step = 0.01;
                break;
              case 0.01:
                target.step = 0.1;
                break;
              case 0.1:
                target.step = 1.0;
                break;
              default:
                break;
            }
            if (target.step) {
              $message.text(`Step: ${target.step.toFixed(4)}`).css('opacity', '1');
              setTimeout(() => $message.css('opacity', '0'), 300);
            }
          } catch (err) {
            console.warn(err);
          }
          break;
        case 'L': case 'l': case 'ArrowRight':
          try {
            const target = $overlay.find('img:visible')[0];
            switch (target.step) {
              case 1.0:
                target.step = 0.1;
                break;
              case 0.1:
                target.step = 0.01;
                break;
              case 0.01:
                target.step = 0.001;
                break;
              case 0.001:
                target.step = 0.0001;
                break;
              default:
                break;
            }
            if (target.step) {
              $message.text(`Step: ${target.step.toFixed(4)}`).css('opacity', '1');
              setTimeout(() => $message.css('opacity', '0'), 300);
            }
          } catch (err) {
            console.warn(err);
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
        case 'E': case 'e':
          try {
            const index = $images.index($overlay.find('img:visible')[0].targetImage);
            $($images[index]).trigger('mouseleave');
            const nextElem = $images[index + step] || $images[index];
            $(nextElem).trigger('mouseenter', [e.shiftKey]);
          }
          catch (err) {
            console.warn(err);
          }
          break;
        case 'W': case 'w':
          try {
            const index = $images.index($overlay.find('img:visible')[0].targetImage);
            $($images[index]).trigger('mouseleave');
            const nextElem = $images[index - step] || $images[index];
            $(nextElem).trigger('mouseenter', [e.shiftKey]);
          }
          catch (err) {
            console.warn(err);
          }
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

  // An overlay on the whole page
  const $overlay = $('<div/>').css({
    'position': 'fixed',
    'top': 0,
    'right': 0,
    'bottom': 0,
    'left': 0,
    'z-index': 2147483646,
    'background-color': 'rgba(0, 0, 0, 0.75)',
    'pointer-events': 'none',
    'display': 'none'
  });

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

  $overlay.append($message);

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
    'top': '15px',
    'right': '15px',
    'z-index': 2147483647,
    'paint-order': 'stroke',
    'opacity': 0,
    'transition': 'all 0.2s',
    'cursor': 'auto'
  }).on('mouseenter', (e) => {
    $(e.currentTarget).attr({
      'fill': 'gray'
    }).css({
      'opacity': 0.2
    });
    timeout = setTimeout(() => activateCompare($(e.currentTarget)), $overlay[0].state ? 0 : 1000);
  }).on('mouseleave', (e) => {
    clearTimeout(timeout);
    $(e.currentTarget).attr({
      'fill': 'gray'
    }).css({
      'cursor': 'auto',
      'opacity': 0
    })[0].state = false;
  }).click((e) => {
    if (e.currentTarget.state) {
      switch ($overlay[0].state) {
        case false:
          enterCompare($overlay, $('img'), $message);
          break;
        case true:
          exitCompare($overlay, $('img'));
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

  $overlay[0].state = false;
  $compareButton[0].state = false;
  $('body').append($compareButton).append($overlay);

})(window.$.noConflict(true),
   unsafeWindow.Mousetrap,
   window.pixelmatch,
   window.UPNG,
   unsafeWindow.URL.createObjectURL ?
   unsafeWindow.URL :
   unsafeWindow.webkitURL);