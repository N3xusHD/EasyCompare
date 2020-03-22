// ==UserScript==
// @name               Easy Compare
// @description        Compare images
// @version            0.8.2
// @author             Secant (TYT@NexusHD)
// @license            GPL-3.0-or-later
// @supportURL         zzwu@zju.edu.cn
// @contributionURL    https://i.loli.net/2020/02/28/JPGgHc3UMwXedhv.jpg
// @contributionAmount 10
// @include            *
// @require            https://cdn.staticfile.org/jquery/3.4.1/jquery.min.js
// @require            https://bundle.run/pixelmatch@5.1.0
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
  }

  /*--- Global Contexts ---*/
  // A global timeout ID holder
  let timeout;
  // A global scale factor
  let scale = 1;
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
  // Filter function mapping
  const filterImage = {
    'solar': (src, onprogress) => rgbImage(src, onprogress, solarWorker || [Rso, Gso, Bso]),
    's2lar': (src, onprogress) => rgbImage(src, onprogress, s2larWorker || [Rs2, Gs2, Bs2])
  };

  /*--- Workers Initialization ---*/
  // Solar Curve
  const [Rso, Gso, Bso] = [
    new Uint8Array([0, 2, 9, 21, 37, 56, 78, 101, 125, 149, 172, 193, 212, 228, 241, 250, 254, 255, 252, 246, 235, 222, 206, 188, 168, 148, 127, 106, 86, 67, 49, 34, 22, 12, 5, 1, 0, 1, 6, 14, 24, 36, 50, 66, 82, 100, 118, 136, 154, 171, 188, 203, 216, 228, 238, 245, 251, 254, 255, 254, 251, 246, 239, 230, 219, 207, 194, 180, 165, 149, 134, 118, 103, 88, 73, 60, 48, 36, 26, 18, 11, 6, 2, 0, 0, 1, 4, 8, 14, 22, 30, 40, 51, 63, 75, 88, 102, 115, 129, 143, 156, 170, 182, 194, 205, 216, 225, 233, 240, 246, 250, 253, 255, 255, 254, 252, 248, 243, 237, 230, 221, 212, 201, 190, 179, 166, 154, 141, 128, 114, 101, 89, 76, 65, 54, 43, 34, 25, 18, 12, 7, 3, 1, 0, 0, 2, 5, 9, 15, 22, 30, 39, 50, 61, 73, 85, 99, 112, 126, 140, 153, 167, 180, 192, 204, 215, 225, 233, 241, 247, 251, 254, 255, 255, 253, 249, 244, 237, 229, 219, 207, 195, 182, 167, 152, 137, 121, 106, 90, 75, 61, 48, 36, 25, 16, 9, 4, 1, 0, 1, 4, 10, 17, 27, 39, 52, 67, 84, 101, 119, 137, 155, 173, 189, 205, 219, 231, 241, 249, 254, 255, 254, 250, 243, 233, 221, 206, 188, 169, 149, 128, 107, 87, 67, 49, 33, 20, 9, 3, 0, 1, 5, 14, 27, 43, 62, 83, 106, 130, 154, 177, 199, 218, 234, 246, 253]),
    new Uint8Array([60, 39, 22, 10, 2, 0, 2, 9, 21, 37, 56, 78, 101, 125, 149, 172, 193, 212, 228, 241, 250, 254, 255, 252, 246, 235, 222, 206, 188, 168, 148, 127, 106, 86, 67, 49, 34, 22, 12, 5, 1, 0, 1, 6, 14, 24, 36, 50, 66, 82, 100, 118, 136, 154, 171, 188, 203, 216, 228, 238, 245, 251, 254, 255, 254, 251, 246, 239, 230, 219, 207, 194, 180, 165, 149, 134, 118, 103, 88, 73, 60, 48, 36, 26, 18, 11, 6, 2, 0, 0, 1, 4, 8, 14, 22, 30, 40, 51, 63, 75, 88, 102, 115, 129, 143, 156, 170, 182, 194, 205, 216, 225, 233, 240, 246, 250, 253, 255, 255, 254, 252, 248, 243, 237, 230, 221, 212, 201, 190, 179, 166, 154, 141, 128, 114, 101, 89, 76, 65, 54, 43, 34, 25, 18, 12, 7, 3, 1, 0, 0, 2, 5, 9, 15, 22, 30, 39, 50, 61, 73, 85, 99, 112, 126, 140, 153, 167, 180, 192, 204, 215, 225, 233, 241, 247, 251, 254, 255, 255, 253, 249, 244, 237, 229, 219, 207, 195, 182, 167, 152, 137, 121, 106, 90, 75, 61, 48, 36, 25, 16, 9, 4, 1, 0, 1, 4, 10, 17, 27, 39, 52, 67, 84, 101, 119, 137, 155, 173, 189, 205, 219, 231, 241, 249, 254, 255, 254, 250, 243, 233, 221, 206, 188, 169, 149, 128, 107, 87, 67, 49, 33, 20, 9, 3, 0, 1, 5, 14, 27, 43, 62, 83, 106, 130, 154, 177]),
    new Uint8Array([56, 78, 101, 125, 149, 172, 193, 212, 228, 241, 250, 254, 255, 252, 246, 235, 222, 206, 188, 168, 148, 127, 106, 86, 67, 49, 34, 22, 12, 5, 1, 0, 1, 6, 14, 24, 36, 50, 66, 82, 100, 118, 136, 154, 171, 188, 203, 216, 228, 238, 245, 251, 254, 255, 254, 251, 246, 239, 230, 219, 207, 194, 180, 165, 149, 134, 118, 103, 88, 73, 60, 48, 36, 26, 18, 11, 6, 2, 0, 0, 1, 4, 8, 14, 22, 30, 40, 51, 63, 75, 88, 102, 115, 129, 143, 156, 170, 182, 194, 205, 216, 225, 233, 240, 246, 250, 253, 255, 255, 254, 252, 248, 243, 237, 230, 221, 212, 201, 190, 179, 166, 154, 141, 128, 114, 101, 89, 76, 65, 54, 43, 34, 25, 18, 12, 7, 3, 1, 0, 0, 2, 5, 9, 15, 22, 30, 39, 50, 61, 73, 85, 99, 112, 126, 140, 153, 167, 180, 192, 204, 215, 225, 233, 241, 247, 251, 254, 255, 255, 253, 249, 244, 237, 229, 219, 207, 195, 182, 167, 152, 137, 121, 106, 90, 75, 61, 48, 36, 25, 16, 9, 4, 1, 0, 1, 4, 10, 17, 27, 39, 52, 67, 84, 101, 119, 137, 155, 173, 189, 205, 219, 231, 241, 249, 254, 255, 254, 250, 243, 233, 221, 206, 188, 169, 149, 128, 107, 87, 67, 49, 33, 20, 9, 3, 0, 1, 5, 14, 27, 43, 62, 83, 106, 130, 154, 177, 199, 218, 234, 246, 253, 255, 253, 245, 233, 216])
  ];
  // S2lar Curve
  const [Rs2, Gs2, Bs2] = [
    new Uint8Array([0, 9, 149, 222, 1, 251, 26, 170, 166, 22, 255, 25, 173, 169, 5, 177, 246, 253, 218, 83, 33, 250, 67, 90, 241, 15, 141, 225, 4, 180, 171, 5, 206, 212, 56, 2, 0, 2, 78, 241, 168, 0, 188, 194, 2, 156, 237, 34, 73, 254, 90, 27, 231, 169, 3, 62, 199, 246, 253, 246, 199, 83, 0, 128, 254, 84, 16, 207, 215, 22, 54, 237, 194, 14, 88, 251, 154, 0, 127, 252, 193, 78, 9, 0, 0, 2, 37, 125, 241, 206, 49, 24, 203, 230, 60, 14, 182, 252, 114, 0, 99, 251, 182, 16, 52, 231, 221, 67, 1, 83, 177, 234, 253, 253, 246, 218, 130, 27, 9, 128, 254, 173, 10, 61, 219, 225, 73, 3, 128, 254, 170, 22, 48, 207, 238, 66, 5, 148, 252, 212, 101, 21, 2, 0, 0, 9, 56, 149, 250, 206, 49, 14, 188, 246, 88, 1, 143, 255, 154, 7, 61, 233, 207, 36, 39, 219, 221, 67, 5, 106, 199, 246, 253, 253, 234, 154, 43, 9, 149, 254, 84, 9, 182, 233, 50, 25, 212, 225, 30, 60, 246, 154, 0, 148, 254, 149, 37, 2, 0, 2, 37, 172, 255, 106, 14, 216, 180, 0, 170, 230, 25, 85, 255, 75, 52, 254, 107, 5, 154, 246, 253, 246, 177, 27, 67, 254, 67, 90, 247, 22, 128, 233, 8, 180, 171, 12, 235, 149, 21, 0, 2, 56, 241, 106, 66, 239, 0, 225, 101, 73, 237, 1, 249, 49, 83, 234]),
    new Uint8Array([245, 5, 255, 56, 22, 60, 22, 37, 254, 22, 203, 88, 102, 221, 0, 233, 90, 84, 243, 20, 62, 154, 177, 106, 5, 128, 241, 10, 167, 192, 0, 201, 170, 6, 239, 82, 67, 255, 101, 0, 39, 60, 39, 2, 149, 246, 34, 100, 246, 36, 88, 255, 89, 22, 225, 167, 0, 155, 243, 67, 1, 83, 154, 177, 154, 83, 5, 49, 221, 205, 17, 75, 249, 153, 0, 114, 255, 129, 0, 165, 245, 66, 34, 222, 228, 78, 2, 22, 60, 60, 39, 2, 21, 149, 255, 148, 1, 118, 255, 134, 0, 115, 250, 179, 18, 39, 215, 237, 75, 4, 155, 255, 169, 33, 5, 62, 130, 177, 177, 154, 106, 27, 3, 87, 221, 231, 84, 4, 137, 253, 167, 22, 34, 190, 246, 102, 0, 118, 251, 171, 6, 67, 235, 228, 101, 9, 10, 39, 60, 60, 22, 0, 37, 172, 255, 148, 5, 100, 251, 165, 11, 75, 233, 212, 43, 15, 180, 249, 106, 1, 137, 255, 169, 20, 14, 83, 154, 177, 177, 130, 43, 0, 87, 233, 205, 17, 61, 237, 180, 9, 76, 248, 170, 1, 134, 251, 66, 34, 235, 193, 37, 2, 39, 60, 39, 2, 56, 212, 206, 5, 136, 239, 18, 102, 254, 76, 30, 241, 152, 4, 205, 206, 20, 43, 154, 177, 154, 62, 3, 169, 231, 10, 167, 204, 0, 190, 182, 2, 239, 82, 86, 250, 37, 10, 60, 39, 0, 149, 206, 6, 254, 26, 170, 166, 22, 255]),
    new Uint8Array([246, 0, 225, 101, 73, 237, 0, 241, 67, 83, 253, 233, 216, 253, 199, 1, 188, 155, 25, 255, 61, 76, 253, 40, 103, 238, 14, 106, 255, 172, 78, 56, 78, 193, 246, 67, 36, 245, 118, 8, 216, 190, 3, 140, 244, 25, 101, 254, 67, 27, 177, 255, 233, 216, 233, 255, 199, 43, 33, 233, 173, 1, 137, 251, 73, 12, 190, 240, 63, 26, 207, 228, 36, 34, 188, 254, 193, 101, 56, 56, 78, 149, 228, 246, 106, 1, 100, 251, 165, 11, 63, 233, 221, 54, 15, 167, 249, 106, 1, 137, 254, 128, 3, 62, 199, 253, 245, 216, 216, 233, 253, 234, 130, 14, 33, 206, 241, 67, 9, 152, 254, 140, 5, 65, 230, 225, 75, 6, 134, 254, 154, 14, 49, 188, 255, 212, 125, 78, 56, 56, 101, 172, 241, 235, 106, 1, 82, 245, 194, 26, 30, 205, 243, 89, 2, 126, 255, 137, 1, 119, 255, 128, 3, 83, 218, 255, 233, 216, 216, 245, 246, 154, 14, 49, 233, 173, 4, 106, 255, 112, 1, 154, 253, 88, 11, 194, 228, 36, 49, 222, 241, 149, 78, 56, 78, 149, 250, 206, 22, 82, 254, 103, 22, 225, 179, 1, 153, 229, 16, 137, 233, 20, 83, 246, 233, 216, 233, 253, 130, 3, 206, 155, 25, 253, 73, 65, 255, 51, 103, 238, 6, 148, 241, 125, 56, 78, 172, 246, 22, 154, 180, 14, 253, 43, 140, 182, 39, 243, 0, 199, 245, 216, 245, 177, 3, 254])
  ];
  async function loadBuffer(worker, R, G, B) {
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
  let diffWorker, solarWorker, s2larWorker;
  let loadBufferPromise;
  const diffWorkerScript = `const defaultOptions={threshold:.1,includeAA:!1,alpha:.1,aaColor:[255,255,0],diffColor:[255,0,0],diffMask:!1};function pixelmatch(a,b,c,d,e,f){if(!isPixelData(a)||!isPixelData(b)||c&&!isPixelData(c))throw new Error("Image data: Uint8Array, Uint8ClampedArray or Buffer expected.");if(a.length!==b.length||c&&c.length!==a.length)throw new Error("Image sizes do not match.");if(a.length!==4*(d*e))throw new Error("Image data size does not match width/height.");f=Object.assign({},defaultOptions,f);const g=d*e,h=new Uint32Array(a.buffer,a.byteOffset,g),j=new Uint32Array(b.buffer,b.byteOffset,g);let k=!0;for(let l=0;l<g;l++)if(h[l]!==j[l]){k=!1;break}if(k){if(c&&!f.diffMask)for(let b=0;b<g;b++)drawGrayPixel(a,4*b,f.alpha,c);return 0}const l=35215*f.threshold*f.threshold;let m=0;const[n,o,p]=f.aaColor,[q,r,s]=f.diffColor;for(let g=0;g<e;g++)for(let h=0;h<d;h++){const i=4*(g*d+h),j=colorDelta(a,b,i,i);j>l?!f.includeAA&&(antialiased(a,h,g,d,e,b)||antialiased(b,h,g,d,e,a))?c&&!f.diffMask&&drawPixel(c,i,n,o,p):(c&&drawPixel(c,i,q,r,s),m++):c&&!f.diffMask&&drawGrayPixel(a,i,f.alpha,c)}return m}function isPixelData(a){return ArrayBuffer.isView(a)&&1===a.constructor.BYTES_PER_ELEMENT}function antialiased(a,b,c,d,e,f){const g=Math.max(b-1,0),h=Math.max(c-1,0),i=Math.min(b+1,d-1),j=Math.min(c+1,e-1);let k,l,m,n,o=b===g||b===i||c===h||c===j?1:0,p=0,q=0;for(let r=g;r<=i;r++)for(let e=h;e<=j;e++){if(r===b&&e===c)continue;const f=colorDelta(a,a,4*(c*d+b),4*(e*d+r),!0);if(0!==f)f<p?(p=f,k=r,l=e):f>q&&(q=f,m=r,n=e);else if(o++,2<o)return!1}return 0!==p&&0!==q&&(hasManySiblings(a,k,l,d,e)&&hasManySiblings(f,k,l,d,e)||hasManySiblings(a,m,n,d,e)&&hasManySiblings(f,m,n,d,e))}function hasManySiblings(a,b,c,d,e){const f=Math.max(b-1,0),g=Math.max(c-1,0),h=Math.min(b+1,d-1),i=Math.min(c+1,e-1),j=4*(c*d+b);let k=b===f||b===h||c===g||c===i?1:0;for(let l=f;l<=h;l++)for(let e=g;e<=i;e++){if(l===b&&e===c)continue;const f=4*(e*d+l);if(a[j]===a[f]&&a[j+1]===a[f+1]&&a[j+2]===a[f+2]&&a[j+3]===a[f+3]&&k++,2<k)return!0}return!1}function colorDelta(a,b,c,d,e){let f=a[c+0],g=a[c+1],h=a[c+2],j=a[c+3],k=b[d+0],l=b[d+1],m=b[d+2],n=b[d+3];if(j===n&&f===k&&g===l&&h===m)return 0;255>j&&(j/=255,f=blend(f,j),g=blend(g,j),h=blend(h,j)),255>n&&(n/=255,k=blend(k,n),l=blend(l,n),m=blend(m,n));const o=rgb2y(f,g,h)-rgb2y(k,l,m);if(e)return o;const p=rgb2i(f,g,h)-rgb2i(k,l,m),i=rgb2q(f,g,h)-rgb2q(k,l,m);return .5053*o*o+.299*p*p+.1957*i*i}function rgb2y(a,c,d){return .29889531*a+.58662247*c+.11448223*d}function rgb2i(a,c,d){return .59597799*a-.2741761*c-.32180189*d}function rgb2q(a,c,d){return .21147017*a-.52261711*c+.31114694*d}function blend(b,c){return 255+(b-255)*c}function drawPixel(a,c,d,e,f){a[c+0]=d,a[c+1]=e,a[c+2]=f,a[c+3]=255}function drawGrayPixel(a,c,d,e){const f=a[c+0],h=a[c+1],g=a[c+2],b=blend(rgb2y(f,h,g),d*a[c+3]/255);drawPixel(e,c,b,b,b)}self.onmessage=a=>{img1=new Uint8ClampedArray(a.data.img1),img2=new Uint8ClampedArray(a.data.img2),diff=new Uint8ClampedArray(img1),width=a.data.width,height=a.data.height,init=a.data.init,key=a.data.key;try{pixelmatch(img1,img2,diff,width,height,init),self.postMessage({diff:diff.buffer,width:width,height:height,key:key},[diff.buffer])}catch(a){console.warn(a),self.postMessage({diff:null,key:key})}};`;
  const rgbWorkerScript = `let R,G,B;self.onmessage=(e=>{const a=e.data.key;if(e.data.R&&e.data.G&&e.data.B)R=new Uint8ClampedArray(e.data.R),G=new Uint8ClampedArray(e.data.G),B=new Uint8ClampedArray(e.data.B),self.postMessage({result:!0});else{const t=new Uint8ClampedArray(e.data.img),l=new Uint8ClampedArray(t),s=e.data.width,r=e.data.height;try{for(let e=0;e<r;++e)for(let a=0;a<s;++a){let r=4*a+e*s*4;l[r]=R[t[r]],l[r+1]=G[t[r+1]],l[r+2]=B[t[r+2]],l[r+3]=t[r+3]}self.postMessage({filter:l.buffer,width:s,height:r,key:a},[l.buffer])}catch(e){console.warn(e),self.postMessage({filter:null,key:a})}}});`;
  try {
    const diffWorkerBlob = new Blob([diffWorkerScript], { type: 'application/javascript' });
    diffWorker = new Worker(URL.createObjectURL(diffWorkerBlob));
    diffWorker.keyPool = {};
    URL.revokeObjectURL(diffWorkerBlob);
    const rgbWorkerBlob = new Blob([rgbWorkerScript], { type: 'application/javascript' });
    const rgbWorkerURL = URL.createObjectURL(rgbWorkerBlob);
    solarWorker = new Worker(rgbWorkerURL);
    solarWorker.keyPool = {};
    const transSo = loadBuffer(solarWorker, Rso, Gso, Bso);
    s2larWorker = new Worker(rgbWorkerURL);
    s2larWorker.keyPool = {};
    const transS2 = loadBuffer(s2larWorker, Rs2, Gs2, Bs2);
    URL.revokeObjectURL(rgbWorkerURL);
    loadBufferPromise = Promise.all([transSo, transS2]);
  } catch (e) {
    try {
      const diffWorkerDataURI = `data:application/javascript,${encodeURIComponent(diffWorkerScript)}`;
      diffWorker = new Worker(diffWorkerDataURI);
      diffWorker.keyPool = {};
      const rgbWorkerDataURI = `data:application/javascript,${encodeURIComponent(rgbWorkerScript)}`;
      solarWorker = new Worker(rgbWorkerDataURI);
      solarWorker.keyPool = {};
      const transSo = loadBuffer(solarWorker, Rso, Gso, Bso);
      s2larWorker = new Worker(rgbWorkerDataURI);
      s2larWorker.keyPool = {};
      const transS2 = loadBuffer(s2larWorker, Rs2, Gs2, Bs2);
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
  // Convert text to SVG image
  function text2SVGDataURL(text, width, height = 20) {
    return `data:image/svg+xml,${
      encodeURIComponent(
        `<svg xmlns='http://www.w3.org/2000/svg' height="${height}" width="${width}">` +
        `<text x="0" y="15" fill="white" font-family="sans serif">${text}</text>` +
        `</svg>`
      )}`;
  }
  // Function to make an <img/> element
  function makeImage(src, outlineColor = 'red') {
    const $figure = $('<figure/>').css({
      'width': 'fit-content',
      'position': 'fixed',
      'top': '50%',
      'left': '50%',
      'margin': '0',
      'vertical-align': 'middle'
    });
    const $image = $(`<img src="${src}"/>`).css({
      'display': 'none',
      'transform': 'translate(-50%, -50%)',
      'opacity': '1',
      'outline': '3px solid ' + outlineColor,
      'outline-offset': '2px',
    });
    $figure.append($image);
    return $image;
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
    const canvas = $canvas[0];
    const context = canvas.getContext('2d');
    return {
      canvas: canvas,
      context: context
    }
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
            const type = (e.responseHeaders.match(/content\-type: *(.+)(\n|$)/) || [, 'image/png'])[1];
            createImageBitmap(new Blob([bytes], { type: type }))
              .then((e) => {
                const [width, height] = [e.width, e.height];
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const context = canvas.getContext('2d');
                context.drawImage(e, 0, 0);
                e.close();
                resolve(
                  new ImageData(
                    context.getImageData(0, 0, width, height).data,
                    width,
                    height
                  )
                );
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
  async function diffImage(src1, src2, onprogress, init = { alpha: 0.5, threshold: 0.007 }, worker = diffWorker) {
    const [img1, img2] = await Promise.all([
      GM_getImageData(src1, (p) => onprogress(p, 0)),
      GM_getImageData(src2, (p) => onprogress(p, 1))
    ]);
    if (
      img1 && img2 &&
      img1.width === img2.width &&
      img1.height === img2.height
    ) {
      onprogress(null, null);
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
                width,
                height
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
  async function rgbImage(src, onprogress, argument) {
    const img = await GM_getImageData(src, onprogress);
    if (img) {
      onprogress(null);
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
                width,
                height
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
        originalImage.style.width = `${scale * 100}%`;
      }
      return originalImage;
    } else {
      const {
        canvas: originalCanvas,
        context: originalContext
      } = makeCanvas();
      const updateProgress = (p) => {
        if (p !== null && p >= 0) {
          originalCanvas.width = 120;
          originalContext.font = '16px sans serif';
          originalContext.fillStyle = 'rgba(255, 255, 255, 255)';
          originalContext.fillText(`Loading ${(p * 100).toFixed(1)}%`, 0, 15);
        } else if (p < 0) {
          originalCanvas.width = 80;
          originalContext.font = '16px sans serif';
          originalContext.fillStyle = 'rgba(255, 255, 255, 255)';
          originalContext.fillText('Loading...', 0, 15);
        }
      };
      const resolveOriginal = (src, resolve) => {
        GM_getImageData(src, updateProgress).then((originalImageData) => {
          originalCanvas.src = src;
          originalCanvas.width = originalImageData.width;
          originalCanvas.height = originalImageData.height;
          originalContext.putImageData(originalImageData, 0, 0);
          originalCanvas.style.width = `${scale * 100}%`;
          originalCanvas.ready = true;
          resolve(originalCanvas);
        });
      };
      originalCanvas.width = 80;
      originalCanvas.height = 20;
      originalContext.font = '16px sans serif';
      originalContext.fillStyle = 'rgba(255, 255, 255, 255)';
      originalContext.fillText('Loading...', 0, 15);
      originalCanvas.ready = false;
      originalCanvas.targetImage = target;
      $overlay.append(originalCanvas.parentElement);
      if (!target.easyCompare) {
        target.easyCompare = {};
      }
      target.easyCompare.originalImage = originalCanvas;
      target.easyCompare.originalImagePromise = new Promise(async (resolve) => {
        let realSrc = target.src;
        // Parse original src from thumb src
        for (let pairs of t2oLib) {
          realSrc = realSrc.replace(pairs[0], pairs[1]);
          if (realSrc !== target.src) {
            resolveOriginal(realSrc, resolve);
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
            resolveOriginal(href, resolve);
            return;
          } else {
            guessOriginalImage(href).then(src => {
              resolveOriginal(src || realSrc, resolve);
              return;
            });
          }
        } else {
          resolveOriginal(realSrc, resolve);
          return;
        }
      });
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
        diffedCanvas.style.width = `${scale * 100}%`;
      }
      return diffedCanvas;
    } else {
      const {
        canvas: diffedCanvas,
        context: diffedContext
      } = makeCanvas();
      diffedCanvas.width = 80;
      diffedCanvas.height = 20;
      diffedContext.font = '16px sans serif';
      diffedContext.fillStyle = 'rgba(255, 255, 255, 255)';
      diffedContext.fillText('Loading...', 0, 15);
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
          diffedCanvas.width = 120;
          diffedContext.font = '16px sans serif';
          diffedContext.fillStyle = 'rgba(255, 255, 255, 255)';
          diffedContext.fillText(`Loading ${((progress[0] + progress[1]) * 50).toFixed(1)}%`, 0, 15);
        }
        else if (p < 0) {
          diffedCanvas.width = 80;
          diffedContext.font = '16px sans serif';
          diffedContext.fillStyle = 'rgba(255, 255, 255, 255)';
          diffedContext.fillText('Loading...', 0, 15);
        }
        else {
          diffedCanvas.width = 80;
          diffedContext.font = '16px sans serif';
          diffedContext.fillStyle = 'rgba(255, 255, 255, 255)';
          diffedContext.fillText('Diffing...', 0, 15);
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
      })).then((diffedImageData) => {
        if (diffedImageData === null) {
          diffedCanvas.width = 120;
          diffedContext.font = '16px sans serif';
          diffedContext.fillStyle = 'rgba(255, 255, 255, 255)';
          diffedContext.fillText('Sizes Not Match', 0, 15);
        } else {
          diffedCanvas.width = diffedImageData.width;
          diffedCanvas.height = diffedImageData.height;
          diffedContext.putImageData(diffedImageData, 0, 0);
          diffedCanvas.threshold = 0.007;
          diffedCanvas.style.width = `${scale * 100}%`;
          diffedCanvas.ready = true;
        }
      }).catch((err) => {
        console.warn(err);
        diffedCanvas.width = 120;
        diffedContext.font = '16px sans serif';
        diffedContext.fillStyle = 'rgba(255, 255, 255, 255)';
        diffedContext.fillText('Sth. Went Wrong', 0, 15);
      });
      return diffedCanvas;
    }
  }
  // Get filtered image function
  function getFilteredImage(target, ftType, $overlay) {
    if (target.easyCompare && target.easyCompare[ftType]) {
      const filteredCanvas = target.easyCompare[ftType];
      if (filteredCanvas.ready) {
        filteredCanvas.style.width = `${scale * 100}%`;
      }
      return filteredCanvas;
    } else {
      const {
        canvas: filteredCanvas,
        context: filteredContext
      } = makeCanvas();
      filteredCanvas.width = 80;
      filteredCanvas.height = 20;
      filteredContext.font = '16px sans serif';
      filteredContext.fillStyle = 'rgba(255, 255, 255, 255)';
      filteredContext.fillText('Loading...', 0, 15);
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
          filteredCanvas.width = 120;
          filteredContext.font = '16px sans serif';
          filteredContext.fillStyle = 'rgba(255, 255, 255, 255)';
          filteredContext.fillText(`Loading ${(p * 100).toFixed(1)}%`, 0, 15);
        } else if (p < 0) {
          filteredCanvas.width = 80;
          filteredContext.font = '16px sans serif';
          filteredContext.fillStyle = 'rgba(255, 255, 255, 255)';
          filteredContext.fillText('Loading...', 0, 15);
        } else {
          filteredCanvas.width = 80;
          filteredContext.font = '16px sans serif';
          filteredContext.fillStyle = 'rgba(255, 255, 255, 255)';
          filteredContext.fillText('Filtering...', 0, 15);
        }
      };
      // Wait original image and filter the original image
      getOriginalImage(target, $overlay);
      target.easyCompare.originalImagePromise.then(originalImage => {
        filterImage[ftType](originalImage.src, updateProgress).then(filterdImageData => {
          filteredCanvas.width = filterdImageData.width;
          filteredCanvas.height = filterdImageData.height;
          filteredContext.putImageData(filterdImageData, 0, 0);
          filteredCanvas.style.width = `${scale * 100}%`;
          filteredCanvas.ready = true;
        });
      });
      return filteredCanvas;
    }
  }

  /*--- UI Response Functions ---*/
  // Function to acquire active image
  function getActive($overlay) {
    return $overlay.find('img:visible,canvas:visible');
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
          try {
            const index = $images.index(getActive($overlay)[0].targetImage);
            baseImage = $images[index];
          } catch (err) {
            baseImage = undefined;
            if (!(err instanceof TypeError)) {
              console.warn(err);
            }
          }
          break;
        case '+': case '=':
          if (e.ctrlKey) {
            try {
              if (scale <= 0.9) {
                scale = scale + 0.1;
              } else {
                scale = 1;
              }
              const target = getActive($overlay)[0];
              if (target.ready) {
                target.style.width = `${scale * 100}%`;
              }
            } catch (err) {
              if (!(err instanceof TypeError)) {
                console.warn(err);
              }
            }
          }
          break;
        case '-': case '_':
          if (e.ctrlKey) {
            try {
              if (scale >= 0.2) {
                scale = scale - 0.1;
              } else {
                scale = 0.1;
              }
              const target = getActive($overlay)[0];
              if (target.ready) {
                target.style.width = `${scale * 100}%`;
              }
            } catch (err) {
              if (!(err instanceof TypeError)) {
                console.warn(err);
              }
            }
          }
          break;
        case 'O': case 'o':
          if (e.ctrlKey) {
            try {
              if (scale !== 1) {
                scale = 1;
                const target = getActive($overlay)[0];
                if (target.ready) {
                  target.style.width = `${scale * 100}%`;
                }
              }
            } catch (err) {
              if (!(err instanceof TypeError)) {
                console.warn(err);
              }
            }
          }
          break;
        case 'S': case 's':
          if (e.ctrlKey) {
            try {
              const target = getActive($overlay)[0];
              let url;
              switch (target.nodeName) {
                case 'IMG':
                  url = target.src;
                  break;
                case 'CANVAS':
                  url = target
                    .toDataURL('image/png')
                    .replace(/^data:image\/[^;]/, 'data:application/octet-stream');
                  break;
              }
              GM_download({
                url: url,
                name: 'easycompare.png'
              });
            } catch (err) {
              if (!(err instanceof TypeError)) {
                console.warn(err);
              }
            }
          } else {
            ftType = (ftType === 'solar' ? 'none' : 'solar');
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
          break;
        case 'A': case 'a':
          ftType = (ftType === 's2lar' ? 'none' : 's2lar');
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
          break;
        case 'I': case 'i': case 'ArrowUp':
          try {
            const target = getActive($overlay)[0];
            let threshold = target.threshold;
            if (threshold !== undefined && threshold >= 0) {
              const thresholdPrev = threshold;
              $message.text(`Threshold: ${thresholdPrev.toFixed(4)}`).css('opacity', '1');
              threshold += target.step;
              if (threshold > 1) {
                threshold = 1;
              }
              target.threshold = -1;
              diffImage(
                target.baseImage.easyCompare.originalImage.src,
                target.targetImage.easyCompare.originalImage.src,
                () => { },
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
                }, 300);
              });
            }
          } catch (err) {
            if (!(err instanceof TypeError)) {
              console.warn(err);
            }
          }
          break;
        case 'K': case 'k': case 'ArrowDown':
          try {
            const target = getActive($overlay)[0];
            let threshold = target.threshold;
            if (threshold !== undefined && threshold >= 0) {
              const thresholdPrev = threshold;
              $message.text(`Threshold: ${thresholdPrev.toFixed(4)}`).css('opacity', '1');
              threshold -= target.step;
              if (threshold < 0) {
                threshold = 0;
              }
              target.threshold = -1;
              diffImage(
                target.baseImage.easyCompare.originalImage.src,
                target.targetImage.easyCompare.originalImage.src,
                () => { },
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
                }, 300);
              });
            }
          } catch (err) {
            if (!(err instanceof TypeError)) {
              console.warn(err);
            }
          }
          break;
        case 'J': case 'j': case 'ArrowLeft':
          try {
            const target = getActive($overlay)[0];
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
            if (!(err instanceof TypeError)) {
              console.warn(err);
            }
          }
          break;
        case 'L': case 'l': case 'ArrowRight':
          if (e.ctrlKey) {
            try {
              leaveImage($overlay, getActive($overlay)[0].targetImage);
            } catch (err) {
              if (!(err instanceof TypeError)) {
                console.warn(err);
              }
            }
            $overlay.find('img,canvas').toArray().forEach(e => {
              const target = e.targetImage;
              delete target.easyCompare;
              e.parentElement.remove();
            });
          } else {
            try {
              const target = getActive($overlay)[0];
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
              if (!(err instanceof TypeError)) {
                console.warn(err);
              }
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
            const targetImage = getActive($overlay)[0].targetImage;
            const index = $images.index(targetImage);
            leaveImage($overlay, targetImage);
            const nextElem = $images[index + step] || $images[index];
            $(nextElem).trigger('mouseenter', [e.shiftKey]);
          } catch (err) {
            if (!(err instanceof TypeError)) {
              console.warn(err);
            }
          }
          break;
        case 'W': case 'w':
          try {
            const targetImage = getActive($overlay)[0].targetImage;
            const index = $images.index(targetImage);
            leaveImage($overlay, targetImage);
            const nextElem = $images[index - step] || $images[index];
            $(nextElem).trigger('mouseenter', [e.shiftKey]);
          } catch (err) {
            if (!(err instanceof TypeError)) {
              console.warn(err);
            }
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