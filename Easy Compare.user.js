// ==UserScript==
// @name               Easy Compare
// @description        Compare images
// @version            0.6
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
// @grant              GM_download
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
// @connect            *

// ==/UserScript==

// # TODO List
// ☑ guess original images from hyper link
// ☑ redirect url chopper: deferer, anonymouse
// ☑ image diff by hold "Shift" and switch to another image: https://bundle.run/pixelmatch@5.1.0
// ☑ solar curve filter toggled by "s": see bandings clearly
// ☑ save current active image by "ctrl + s"
// ☑ clear caches by "ctrl + l"
// ☐ canvasless (async/sync)
// ☐ more sites support
// ☐ other filters?
// ☐ webgl acceleration (webgl in worker?)

// jshint esversion:8
(async function ($, Mousetrap, pixelmatch, UPNG, URL) {
  'use strict';
  // Solar Curve;
  const [Rc, Gc, Bc] = [
    new Uint8Array([128, 153, 177, 199, 218, 234, 245, 253, 255, 254, 248, 238, 225, 209, 190, 170, 148, 126, 105, 84, 64, 47, 32, 19, 10, 3, 0, 0, 3, 9, 17, 29, 42, 57, 73, 91, 109, 127, 145, 163, 180, 195, 209, 222, 233, 241, 248, 253, 255, 255, 254, 250, 244, 236, 227, 217, 205, 192, 179, 164, 150, 135, 120, 106, 92, 78, 65, 53, 42, 32, 24, 16, 10, 5, 2, 0, 0, 0, 2, 6, 10, 16, 23, 31, 39, 49, 59, 70, 81, 92, 104, 116, 128, 140, 152, 163, 174, 185, 195, 205, 213, 222, 229, 235, 241, 246, 250, 253, 254, 255, 255, 254, 253, 250, 246, 241, 236, 230, 223, 216, 207, 199, 189, 180, 170, 159, 149, 138, 128, 117, 106, 96, 85, 75, 66, 56, 48, 39, 32, 25, 19, 14, 9, 5, 2, 1, 0, 0, 1, 2, 5, 9, 14, 20, 26, 33, 42, 50, 60, 70, 81, 92, 103, 115, 127, 139, 151, 163, 174, 185, 196, 206, 216, 224, 232, 239, 245, 249, 253, 255, 255, 255, 253, 250, 245, 239, 231, 223, 213, 202, 190, 177, 163, 149, 135, 120, 105, 91, 76, 63, 50, 38, 28, 19, 11, 5, 1, 0, 0, 2, 7, 14, 22, 33, 46, 60, 75, 92, 110, 128, 146, 164, 182, 198, 213, 226, 238, 246, 252, 255, 255, 252, 245, 236, 223, 208, 191, 171, 150, 129, 107, 85, 65, 46, 30, 17, 7, 1, 0, 2, 10, 21, 37, 56, 78, 102]),
    new Uint8Array([18, 34, 54, 77, 102, 128, 153, 177, 199, 218, 234, 245, 253, 255, 254, 248, 238, 225, 209, 190, 170, 148, 126, 105, 84, 64, 47, 32, 19, 10, 3, 0, 0, 3, 9, 17, 29, 42, 57, 73, 91, 109, 127, 145, 163, 180, 195, 209, 222, 233, 241, 248, 253, 255, 255, 254, 250, 244, 236, 227, 217, 205, 192, 179, 164, 150, 135, 120, 106, 92, 78, 65, 53, 42, 32, 24, 16, 10, 5, 2, 0, 0, 0, 2, 6, 10, 16, 23, 31, 39, 49, 59, 70, 81, 92, 104, 116, 128, 140, 152, 163, 174, 185, 195, 205, 213, 222, 229, 235, 241, 246, 250, 253, 254, 255, 255, 254, 253, 250, 246, 241, 236, 230, 223, 216, 207, 199, 189, 180, 170, 159, 149, 138, 128, 117, 106, 96, 85, 75, 66, 56, 48, 39, 32, 25, 19, 14, 9, 5, 2, 1, 0, 0, 1, 2, 5, 9, 14, 20, 26, 33, 42, 50, 60, 70, 81, 92, 103, 115, 127, 139, 151, 163, 174, 185, 196, 206, 216, 224, 232, 239, 245, 249, 253, 255, 255, 255, 253, 250, 245, 239, 231, 223, 213, 202, 190, 177, 163, 149, 135, 120, 105, 91, 76, 63, 50, 38, 28, 19, 11, 5, 1, 0, 0, 2, 7, 14, 22, 33, 46, 60, 75, 92, 110, 128, 146, 164, 182, 198, 213, 226, 238, 246, 252, 255, 255, 252, 245, 236, 223, 208, 191, 171, 150, 129, 107, 85, 65, 46, 30, 17, 7, 1, 0, 2, 10]),
    new Uint8Array([234, 245, 253, 255, 254, 248, 238, 225, 209, 190, 170, 148, 126, 105, 84, 64, 47, 32, 19, 10, 3, 0, 0, 3, 9, 17, 29, 42, 57, 73, 91, 109, 127, 145, 163, 180, 195, 209, 222, 233, 241, 248, 253, 255, 255, 254, 250, 244, 236, 227, 217, 205, 192, 179, 164, 150, 135, 120, 106, 92, 78, 65, 53, 42, 32, 24, 16, 10, 5, 2, 0, 0, 0, 2, 6, 10, 16, 23, 31, 39, 49, 59, 70, 81, 92, 104, 116, 128, 140, 152, 163, 174, 185, 195, 205, 213, 222, 229, 235, 241, 246, 250, 253, 254, 255, 255, 254, 253, 250, 246, 241, 236, 230, 223, 216, 207, 199, 189, 180, 170, 159, 149, 138, 128, 117, 106, 96, 85, 75, 66, 56, 48, 39, 32, 25, 19, 14, 9, 5, 2, 1, 0, 0, 1, 2, 5, 9, 14, 20, 26, 33, 42, 50, 60, 70, 81, 92, 103, 115, 127, 139, 151, 163, 174, 185, 196, 206, 216, 224, 232, 239, 245, 249, 253, 255, 255, 255, 253, 250, 245, 239, 231, 223, 213, 202, 190, 177, 163, 149, 135, 120, 105, 91, 76, 63, 50, 38, 28, 19, 11, 5, 1, 0, 0, 2, 7, 14, 22, 33, 46, 60, 75, 92, 110, 128, 146, 164, 182, 198, 213, 226, 238, 246, 252, 255, 255, 252, 245, 236, 223, 208, 191, 171, 150, 129, 107, 85, 65, 46, 30, 17, 7, 1, 0, 2, 10, 21, 37, 56, 78, 102, 127, 153, 178, 201, 221])
  ];
  async function loadBuffer(worker) {
    return new Promise((resolve) => {
      rainbowWorker.onmessage = (e) => { resolve(e.data.result); };
      rainbowWorker.postMessage({
        Rc: Rc.buffer,
        Gc: Gc.buffer,
        Bc: Bc.buffer
      }, [Rc.buffer, Gc.buffer, Bc.buffer]);
    });
  }
  // Diff, Rainbow Worker Initialization
  let diffWorker, rainbowWorker;
  const diffWorkerScript = `const defaultOptions={threshold:.1,includeAA:!1,alpha:.1,aaColor:[255,255,0],diffColor:[255,0,0],diffMask:!1};function pixelmatch(a,b,c,d,e,f){if(!isPixelData(a)||!isPixelData(b)||c&&!isPixelData(c))throw new Error("Image data: Uint8Array, Uint8ClampedArray or Buffer expected.");if(a.length!==b.length||c&&c.length!==a.length)throw new Error("Image sizes do not match.");if(a.length!==4*(d*e))throw new Error("Image data size does not match width/height.");f=Object.assign({},defaultOptions,f);const g=d*e,h=new Uint32Array(a.buffer,a.byteOffset,g),j=new Uint32Array(b.buffer,b.byteOffset,g);let k=!0;for(let l=0;l<g;l++)if(h[l]!==j[l]){k=!1;break}if(k){if(c&&!f.diffMask)for(let b=0;b<g;b++)drawGrayPixel(a,4*b,f.alpha,c);return 0}const l=35215*f.threshold*f.threshold;let m=0;const[n,o,p]=f.aaColor,[q,r,s]=f.diffColor;for(let g=0;g<e;g++)for(let h=0;h<d;h++){const i=4*(g*d+h),j=colorDelta(a,b,i,i);j>l?!f.includeAA&&(antialiased(a,h,g,d,e,b)||antialiased(b,h,g,d,e,a))?c&&!f.diffMask&&drawPixel(c,i,n,o,p):(c&&drawPixel(c,i,q,r,s),m++):c&&!f.diffMask&&drawGrayPixel(a,i,f.alpha,c)}return m}function isPixelData(a){return ArrayBuffer.isView(a)&&1===a.constructor.BYTES_PER_ELEMENT}function antialiased(a,b,c,d,e,f){const g=Math.max(b-1,0),h=Math.max(c-1,0),i=Math.min(b+1,d-1),j=Math.min(c+1,e-1);let k,l,m,n,o=b===g||b===i||c===h||c===j?1:0,p=0,q=0;for(let r=g;r<=i;r++)for(let e=h;e<=j;e++){if(r===b&&e===c)continue;const f=colorDelta(a,a,4*(c*d+b),4*(e*d+r),!0);if(0!==f)f<p?(p=f,k=r,l=e):f>q&&(q=f,m=r,n=e);else if(o++,2<o)return!1}return 0!==p&&0!==q&&(hasManySiblings(a,k,l,d,e)&&hasManySiblings(f,k,l,d,e)||hasManySiblings(a,m,n,d,e)&&hasManySiblings(f,m,n,d,e))}function hasManySiblings(a,b,c,d,e){const f=Math.max(b-1,0),g=Math.max(c-1,0),h=Math.min(b+1,d-1),i=Math.min(c+1,e-1),j=4*(c*d+b);let k=b===f||b===h||c===g||c===i?1:0;for(let l=f;l<=h;l++)for(let e=g;e<=i;e++){if(l===b&&e===c)continue;const f=4*(e*d+l);if(a[j]===a[f]&&a[j+1]===a[f+1]&&a[j+2]===a[f+2]&&a[j+3]===a[f+3]&&k++,2<k)return!0}return!1}function colorDelta(a,b,c,d,e){let f=a[c+0],g=a[c+1],h=a[c+2],j=a[c+3],k=b[d+0],l=b[d+1],m=b[d+2],n=b[d+3];if(j===n&&f===k&&g===l&&h===m)return 0;255>j&&(j/=255,f=blend(f,j),g=blend(g,j),h=blend(h,j)),255>n&&(n/=255,k=blend(k,n),l=blend(l,n),m=blend(m,n));const o=rgb2y(f,g,h)-rgb2y(k,l,m);if(e)return o;const p=rgb2i(f,g,h)-rgb2i(k,l,m),i=rgb2q(f,g,h)-rgb2q(k,l,m);return .5053*o*o+.299*p*p+.1957*i*i}function rgb2y(a,c,d){return .29889531*a+.58662247*c+.11448223*d}function rgb2i(a,c,d){return .59597799*a-.2741761*c-.32180189*d}function rgb2q(a,c,d){return .21147017*a-.52261711*c+.31114694*d}function blend(b,c){return 255+(b-255)*c}function drawPixel(a,c,d,e,f){a[c+0]=d,a[c+1]=e,a[c+2]=f,a[c+3]=255}function drawGrayPixel(a,c,d,e){const f=a[c+0],h=a[c+1],g=a[c+2],b=blend(rgb2y(f,h,g),d*a[c+3]/255);drawPixel(e,c,b,b,b)}self.onmessage=a=>{img1=new Uint8ClampedArray(a.data.img1),img2=new Uint8ClampedArray(a.data.img2),diff=new Uint8ClampedArray(img1),width=a.data.width,height=a.data.height,init=a.data.init,key=a.data.key;try{pixelmatch(img1,img2,diff,width,height,init),self.postMessage({diff:diff.buffer,width:width,height:height,key:key},[diff.buffer])}catch(a){console.warn(a),self.postMessage({diff:null,key:key})}};`;
  const rainbowWorkerScript = `let Rc,Gc,Bc;self.onmessage=a=>{const b=a.data.key;if(a.data.Rc&&a.data.Gc&&a.data.Bc)Rc=new Uint8ClampedArray(a.data.Rc),Gc=new Uint8ClampedArray(a.data.Gc),Bc=new Uint8ClampedArray(a.data.Bc),self.postMessage({result:!0});else{const c=new Uint8ClampedArray(a.data.img),d=new Uint8ClampedArray(c),e=a.data.width,f=a.data.height;try{for(let a=0;a<f;++a)for(let b,f=0;f<e;++f)b=4*f+4*(a*e),d[b]=Rc[c[b]],d[b+1]=Gc[c[b+1]],d[b+2]=Bc[c[b+2]],d[b+3]=c[b+3];self.postMessage({filter:d.buffer,width:e,height:f,key:b},[d.buffer])}catch(a){console.warn(a),self.postMessage({filter:null,key:b})}}};`;
  try {
    const diffWorkerBlob = new Blob([diffWorkerScript], { type: 'application/javascript' });
    diffWorker = new Worker(URL.createObjectURL(diffWorkerBlob));
    diffWorker.keyPool = {};
    URL.revokeObjectURL(diffWorkerBlob);
    const rainbowWorkerBlob = new Blob([rainbowWorkerScript], { type: 'application/javascript' });
    rainbowWorker = new Worker(URL.createObjectURL(rainbowWorkerBlob));
    rainbowWorker.keyPool = {};
    URL.revokeObjectURL(rainbowWorkerBlob);
    await loadBuffer(rainbowWorker);
  } catch (e) {
    try {
      const diffWorkerDataURI = `data:application/javascript,${encodeURIComponent(diffWorkerScript)}`;
      diffWorker = new Worker(diffWorkerDataURI);
      diffWorker.keyPool = {};
      const rainbowWorkerDataURI = `data:application/javascript,${encodeURIComponent(rainbowWorkerScript)}`;
      rainbowWorker = new Worker(rainbowWorkerDataURI);
      rainbowWorker.keyPool = {};
      await loadBuffer(rainbowWorker);
    } catch (e) {
      diffWorker = null;
      rainbowWorker = null;
    }
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

  function solarCurve(raw, filter, width, height) {
    for (let row = 0; row < height; ++row) {
      for (let col = 0; col < width; ++col) {
        let ind = col * 4 + row * width * 4;
        filter[ind] = Rc[raw[ind]];
        filter[ind + 1] = Gc[raw[ind + 1]];
        filter[ind + 2] = Bc[raw[ind + 2]];
        filter[ind + 3] = raw[ind + 3];
      }
    }
  }

  async function rainbowImage(src, onprogress, worker = rainbowWorker) {
    const img = await getImageBytesBuffer(src, onprogress);
    if (img) {
      onprogress(null);
      if (worker) {
        const [raw, width, height] = [img.raw, img.width, img.height];
        const key = '' + Date.now();
        worker.onmessage = (e) => {
          const returnKey = e.data.key;
          const resolve = worker.keyPool[returnKey];
          if (resolve) {
            const canvas = document.createElement('canvas');
            const [width, height] = [e.data.width, e.data.height];
            [canvas.width, canvas.height] = [width, height];
            const context = canvas.getContext('2d');
            context.putImageData(new ImageData(
              new Uint8ClampedArray(e.data.filter),
              width,
              height
            ), 0, 0);
            canvas.toBlob((blob) => {
              resolve(URL.createObjectURL(blob));
              delete worker.keyPool[returnKey];
            }, 'image/png', 1);
          }
        };
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
        const [raw, width, height] = [new Uint8ClampedArray(img.raw), img.width, img.height];
        const canvas = document.createElement('canvas');
        [canvas.width, canvas.height] = [width, height];
        const context = canvas.getContext('2d');
        const rainbow = context.createImageData(width, height);
        solarCurve(raw, rainbow.data, width, height);
        context.putImageData(rainbow, 0, 0);
        return new Promise((resolve) => {
          canvas.toBlob((blob) => {
            resolve(URL.createObjectURL(blob));
          }, 'image/png', 1);
        });
      }
    }
  }

  // Diff images (async or sync)
  // input: src1, src2, on progress function, pixelmatch initilization object, web worker
  // ouput: diffsrc (dataURL)
  async function diffImage(src1, src2, onprogress, init = { alpha: 0.5, threshold: 0.007 }, worker = diffWorker) {
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

      if (worker) {// async diff
        const [raw1, raw2, width, height] = [img1.raw, img2.raw, img1.width, img1.height];
        const key = '' + Date.now();
        worker.onmessage = (e) => {
          const returnKey = e.data.key;
          const resolve = worker.keyPool[returnKey];
          if (resolve) {
            const canvas = document.createElement('canvas');
            const [width, height] = [e.data.width, e.data.height];
            [canvas.width, canvas.height] = [width, height];
            const context = canvas.getContext('2d');
            context.putImageData(new ImageData(
              new Uint8ClampedArray(e.data.diff),
              width,
              height
            ), 0, 0);
            canvas.toBlob((blob) => {
              resolve(URL.createObjectURL(blob));
              delete worker.keyPool[returnKey];
            }, 'image/png', 1);
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
        return new Promise((resolve) => {
          canvas.toBlob((blob) => {
            resolve(URL.createObjectURL(blob));
          }, 'image/png', 1);
        });
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
    return $(`<img src="${src}"/>`).attr({
      'class': 'easy-compare-image'
    }).css({
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
    if (((original && (target = original.targetImage)) || target) &&
      target.easyCompare && target.easyCompare.boxShadow !== undefined) {
      $(target).css('box-shadow', target.easyCompare.boxShadow);
    }
  }

  // Filter function mapping
  const filterImage = {
    'rainbow': rainbowImage
  };

  // Get original image function
  function getOriginalImage(target, $overlay) {
    if (target.easyCompare && target.easyCompare.originalImage) {
      return (target.easyCompare.originalImage);
    } else {
      const originalImage = makeImage(text2SVGDataURL(`Loading...`, 80))[0];
      originalImage.targetImage = target;
      $overlay.append(originalImage);
      if (!target.easyCompare) {
        target.easyCompare = {};
      }
      target.easyCompare.originalImage = originalImage;
      target.easyCompare.originalImagePromise = new Promise((resolve) => {
        let realSrc = target.src;
        // Parse original src from thumb src
        for (let pairs of t2oLib) {
          realSrc = realSrc.replace(pairs[0], pairs[1]);
          if (realSrc !== target.src) {
            originalImage.src = realSrc;
            resolve(originalImage);
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
            originalImage.src = href;
            resolve(originalImage);
          } else {
            guessOriginalImage(href).then(src => {
              originalImage.src = src || realSrc;
              resolve(originalImage);
            });
          }
        } else {
          originalImage.src = realSrc;
          resolve(originalImage);
        }
      });
      return originalImage;
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
      return target.easyCompare[base.src];
    } else {
      const diffedImage = makeImage(text2SVGDataURL(`Loading...`, 80))[0];
      diffedImage.targetImage = target;
      diffedImage.baseImage = base;
      diffedImage.threshold = -1;
      diffedImage.step = 0.001;
      $overlay.append(diffedImage);
      if (!target.easyCompare) {
        target.easyCompare = {};
      }
      target.easyCompare[base.src] = diffedImage;
      if (!base.easyCompare) {
        base.easyCompare = {};
      }
      base.easyCompare[target.src] = diffedImage;

      let progress = [0, 0];
      // Progress update function
      const updateProgress = (p, ind) => {
        if (p !== null && p >= 0 && ind !== null) {
          progress[ind] = p;
          diffedImage.src = text2SVGDataURL(`Loading ${((progress[0] + progress[1]) * 50).toFixed(1)}%`, 120);
        }
        else if (p < 0) {
          diffedImage.src = text2SVGDataURL(`Loading...`, 80);
        }
        else {
          diffedImage.src = text2SVGDataURL(`Diffing...`, 80);
        }
      };
      getOriginalImage(target, $overlay);
      getOriginalImage(base, $overlay);
      Promise.all([
        target.easyCompare.originalImagePromise,
        base.easyCompare.originalImagePromise
      ]).then(([{ src: src1 }, { src: src2 }]) => diffImage(src1, src2, updateProgress, {
        alpha: 0.5,
        threshold: 0.007
      })).then((diffedSrc) => {
        if (diffedSrc === null) {
          diffedImage.src = text2SVGDataURL(`Sizes Not Match`, 120);
        } else {
          diffedImage.src = diffedSrc;
          diffedImage.threshold = 0.007;
        }
      }).catch((err) => {
        console.warn(err);
        diffedImage.src = text2SVGDataURL(`Sth. Went Wrong`, 120);
      });

      return diffedImage;
    }
  }

  // Get filtered image function
  function getFilteredImage(target, ftType, $overlay) {
    if (target.easyCompare && target.easyCompare[ftType]) {
      return target.easyCompare[ftType];
    } else {
      const filteredImage = makeImage(text2SVGDataURL(`Loading...`, 80))[0];
      filteredImage.targetImage = target;
      $overlay.append(filteredImage);
      if (!target.easyCompare) {
        target.easyCompare = {};
      }
      target.easyCompare[ftType] = filteredImage;
      // Progress Update Function
      const updateProgress = (p) => {
        if (p !== null && p >= 0) {
          filteredImage.src = text2SVGDataURL(`Loading ${(p * 100).toFixed(1)}%`, 120);
        } else if (p < 0) {
          filteredImage.src = text2SVGDataURL(`Loading...`, 80);
        } else {
          filteredImage.src = text2SVGDataURL(`Filtering...`, 80);
        }
      };
      // Wait original image and filter the original image
      getOriginalImage(target, $overlay);
      target.easyCompare.originalImagePromise.then(originalImage => {
        filterImage[ftType](originalImage.src, updateProgress).then(filterdSrc => {
          filteredImage.src = filterdSrc;
        });
      });
      return filteredImage;
    }
  }

  // Function fired when compare button is clicked and toggled on
  function enterCompare($overlay, $images, $message) {
    if (Mousetrap) {
      Mousetrap.pause();
    }
    $overlay.show()[0].state = true;
    let colors = ['red', 'blue'];
    let step = 1, baseImage;
    let ftType = 'none';

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

    // Scroll event
    $(document).on('scroll.compare', (e) => {
      const temp = $overlay.find('img:visible')[0];
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
          try {
            const index = $images.index($overlay.find('img:visible')[0].targetImage);
            baseImage = $images[index];
          } catch (err) {
            baseImage = undefined;
            if (!(err instanceof TypeError)) {
              console.warn(err);
            }
          }
          break;
        case 'S': case 's':
          if (e.ctrlKey) {
            try {
              const target = $overlay.find('img:visible')[0];
              GM_download({
                url: target.src,
                name: 'easycompare.png',
                onerror: (e) => {
                  if (e.error === 'Invalid scheme') {
                    const a = document.createElement('a');
                    a.href = target.src;
                    a.download = 'easycompare.png';
                    a.click();
                  }
                }
              });
            } catch (err) {
              if (!(err instanceof TypeError)) {
                console.warn(err);
              }
            }
          } else {
            ftType = (ftType === 'rainbow' ? 'none' : 'rainbow');
            try {
              const target = $overlay.find('img:visible').hide()[0];
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
              diffImage(target.baseImage.easyCompare.originalImage.src,
                target.targetImage.easyCompare.originalImage.src,
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
              diffImage(target.baseImage.easyCompare.originalImage.src,
                target.targetImage.easyCompare.originalImage.src,
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
          if (e.ctrlKey) {
            try {
              leaveImage($overlay, $overlay.find('img:visible')[0].targetImage);
            } catch (err) {
              if (!(err instanceof TypeError)) {
                console.warn(err);
              }
            }
            $overlay.find('img').toArray().forEach(e => {
              const target = e.targetImage;
              delete target.easyCompare;
              URL.revokeObjectURL(e.src);
              e.remove();
            });
          } else {
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
            const targetImage = $overlay.find('img:visible')[0].targetImage;
            const index = $images.index(targetImage);
            leaveImage($overlay, targetImage);
            const nextElem = $images[index + step] || $images[index];
            $(nextElem).trigger('mouseenter', [e.shiftKey]);
          }
          catch (err) {
            console.warn(err);
          }
          break;
        case 'W': case 'w':
          try {
            const targetImage = $overlay.find('img:visible')[0].targetImage;
            const index = $images.index(targetImage);
            leaveImage($overlay, targetImage);
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
          enterCompare($overlay, $('img:visible:not(.easy-compare-image)'), $message);
          break;
        case true:
          exitCompare($overlay, $('img:visible:not(.easy-compare-image)'));
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
