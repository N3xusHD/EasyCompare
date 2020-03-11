# Easy Compare ![icon](https://raw.githubusercontent.com/Sec-ant/Easy-Compare/master/icon.svg?sanitize=true)

## 介绍 Introduction

一个作用于任何页面的、用于方便地比较截图的用户脚本。多用于各大PT站点的对比截图比较，灵感来自于PTP的截图比较脚本，但源码完全不同。

**Easy Compare** is a userscript, that applied to any page, aiming to make screenshot comparison handy. This can be widely used in many PT sites. The idea comes from the official **PTP Show comparison** script, but the code is completely original.

## 特性 Features

- 可以在任何页面“就地”进行截图对比，无需重新下载上传；

    Compare screenshots in place without downloading/uploading images to other sites;

- 可用于不同的图床，有可扩展性；

    Support multiple image hosts, which can be configured and extended;

- 进入截图比较模式后，鼠标悬浮在页面图片上方，即可在浏览器中央显示该图的原图。将鼠标在不同的图片上悬停，即可在浏览器中央切换不同图片的原图；

    When activated, hover your mouse above an image on the page, the original image of which will be displayed over the center of the page. Move your mouse among different images on the page and you can switch different original images of them over the center of the page;

- 配合快捷键可以很方便地比较不相邻的图片；
  
    Non-adjacent images can be compared easily when using hot-keys;

- 支持 **Image Diff**，即像素级别比较两张图片中的差异并通过颜色标出。该功能需配合 `Shift` 键使用，按下 `Shift` 键时，当前活动图片会作为基准图片，通过鼠标或键盘快捷键移动到其他图片上时（移动时需按住 `Shift` 不放），便会将基准图片与该图片进行比较，比较结束后结果会显示在浏览器中央，并可通过 `ArrowUp`、`ArrowDown`、`ArrowLeft`、`ArrowRight` 或 `I/i`、`K/k`、`J/j`、`L/l` 快捷键调整该比较的阈值/敏感度。该功能核心代码来自于[mapbox/pixelmatch](https://github.com/mapbox/pixelmatch)；

    注意：
    - Image Diff 使用 `<canvas>` 元素实现 PNG 的解码，目前尚不支持 10bit；
    - 部分网站安全设定严格限定 `<canvas>` 上所绘制的内容来源，因此会无法使用此功能；
    - Image Diff 支持 DataURL Web Worker，但与站点的安全设定有关。若站点不支持，则会退化为单线程阻塞模式。
  
    **Image Diff** is supported, which is comparing two images pixel-wisely and marking all the different pixels with colors. This feature requires the `Shift` key. When `Shift` is pressed down, the active image will be used as the base image. When users move the cursor to another image or use the hot-keys to focus on another image (`Shift` needs holding meanwhile), the base image will be compared to that image, and the result will be displayed over the center of the page when diffing is finished. Users can use `↑`, `↓`, `←`, `→` or `I/i`, `K/k`, `J/j`, `L/l` hot-keys to adjust the threshold/sensitivity of the diffing result. The image diff core function is from [mapbox/pixelmatch](https://github.com/mapbox/pixelmatch);

    Notes:
    - Image Diff uses `<canvas>` element to decode PNG format, so 10bit hasn't been supported yet;
    - Some sites will restrict the origin of the content painted on the `<canvas>`. Image Diff cannot work on these sites;
    - Web worker is used on Image Diff, but the site sercurity configuration can block dataURL web workers. So when it does, single thread blocking mode is used.

- 配合快捷键可以进行一些便捷操作，包括：

    Several hot-keys are supported for better user experience, including:
    
    | 键 Key | 功能 | Function |
    | :---: | ------------- | ----------------------- |
    | `Esc` | 退出截图比较模式 | Deactivate compare mode |
    | `Q/q` | 半透明化截图比较界面，以便显示出原页面中的元素 | Semi-transparentize the interface, allowing user to view the elements on the page |
    | `W/w` | 跳到往前数第 `num` 张图片显示原图 | Jump to the nth previous image and display the original image of it |
    | `E/e` | 跳到往后数第 `num` 张图片显示原图 | Jump to the nth next image and display the original image of it |
    | `Num Key` | `num` 的值，默认是 `1`，有效值为 `0`-`9`，`0` 代表 `10` | The value of `n` in "nth". `0`-`9` are valid numbers and `0` is recognized as `10` |
    | `Shift` | 用于激活 Image Diff | Activate Image Diff |
    | `ArrowUp/I/i` | 增加 Image Diff 阈值（0-1），降低敏感度 | Increase Image Diff threshold and decrease sensitivity |
    | `ArrowDown/K/k` | 降低 Image Diff 阈值（0-1），增加敏感度 | Decrease Image Diff threshold and increase sensitivity |
    | `ArrowLeft/J/j` | 增加阈值调整步长 | Increase the step when adjusting the threshold |
    | `ArrowRight/L/l` | 减小阈值调整步长 | Decrease the step when adjusting the threshold |

## 待办 TODOs

- 支持更多图床，持续更新；

    Support more image hosts and keep updated;

- <s>对于不支持缩略图转原图的链接，通过请求超链接后猜测原图，或根据超链接站点做匹配；</s>
    
    已实现；

    <s>For thumb images whose sources cannot be converted to original ones, make an HTTP request of the hyper link and guess (or match according to the link) the original image source;</s> 
    
    Implemented;

- <s>若需实现上条情况，还需要处理匿名跳转链接；</s>

    已实现部分，持续更新；

    <s>In order to implement the feature above, anonymous redirection prefixes need to be handled;</s>

    Partialy implemented;

- <s>支持一些轻量化的本地图片处理操作，包括图片 Diff 等，以增加脚本实用性；</s>

    已实现部分，更多图像操作待更新；

    <s>Support some light-weight image processing operations，including **Image Diff**, in order to make the script more practical;</s>

    Partialy implemented;

- 不依赖 `<canvas>` 解码；
    
    Stop using `<canvas>`;

- 支持更多快捷键操作。

    Support more hot-key operations.

## 演示 Demo

   ![Demo](https://github.com/Sec-ant/Easy-Compare/blob/master/demo1.gif?raw=true)

## 安装 Installation

请到 [Greasy Fork](https://greasyfork.org/zh-CN/scripts/397200-easy-compare) 页面，配合 [TamperMonkey](https://www.tampermonkey.net/) 浏览器扩展安装使用。

Please go to [Greasy Fork](https://greasyfork.org/zh-CN/scripts/397200-easy-compare) and install the usersript with [TamperMonkey](https://www.tampermonkey.net/) extension.

## 贡献 Contribution

本脚本暂时不开放多人编辑权限，如有问题和想法请先到[Greasy Fork反馈页面](https://greasyfork.org/zh-CN/scripts/397200-easy-compare/feedback)或[Github Issues页面](https://github.com/Sec-ant/Easy-Compare/issues)提交。

The script is not open for contribution for now. Please refer to the [Greasy Fork feedback page](https://greasyfork.org/zh-CN/scripts/397200-easy-compare/feedback) or [Github Issues](https://github.com/Sec-ant/Easy-Compare/issues) in case of any problems or suggestions.

## 许可 License

[GNU General Public License v3.0 or later](https://spdx.org/licenses/GPL-3.0-or-later.html)

## 邮箱 Email

zzwu@zju.edu.cn

## 捐赠 Donation

<table><tbody><tr><td>支付宝 Alipay</td><td>微信 Wechat</td></tr>
<tr><td><img width="200" src="https://i.loli.net/2020/02/28/JPGgHc3UMwXedhv.jpg"></td><td><img width="200" src="https://i.loli.net/2020/03/02/qDQ9Xk8uCHwcaLZ.png"></td></tr></tbody></table>
