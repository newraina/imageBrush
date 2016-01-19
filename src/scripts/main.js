"use strict";

/******************************
 *         辅助工具模块
 * *****************************/
var tool = function () {

    // 临时canvas元素生成器
    // 参数可以是(width, height) 此时根据指定数字返回对应尺寸的canvas相关对象
    // 若参数为canvas对象或者canvas的ImageData对象，则根据传入对象的尺寸返回相关对象
    function canvasGenerator() {
        var width, height;
        if (typeof arguments[0] === 'undefined') {
            return {};
        } else if (arguments[0].toString().indexOf('HTMLCanvasElement') > -1 || arguments[0].toString().indexOf('ImageData') > -1) {
            width  = arguments[0].width;
            height = arguments[0].height;
        } else if (typeof arguments[0] === 'number') {
            width  = arguments[0];
            height = arguments[1];
        }

        var tempCanvas = document.createElement('canvas'),
            tempCtx    = tempCanvas.getContext('2d'),
            newImageData, newData, length;

        tempCanvas.width  = width;
        tempCanvas.height = height;
        newImageData      = tempCtx.createImageData(width, height);
        newData           = newImageData.data;
        length            = newData.length;

        // 通过将图像数据绘制在canvas上达到保存图像数据的目的
        function save() {
            tempCtx.putImageData(newImageData, 0, 0);
        }

        // 将指定canvas内容绘制在新创建的canvas上
        function copyFrom(canvasElement) {
            tempCtx.drawImage(canvasElement, 0, 0, canvasElement.width, canvasElement.height);
        }

        return {
            canvas   : tempCanvas,
            ctx      : tempCtx,
            imageData: newImageData,
            data     : newData,
            length   : length,
            save     : save,
            copyFrom : copyFrom
        }
    }

    // 输入canvas，返回对应canvas的相关属性和自定义方法
    function canvasHelper(sourceCanvas) {
        var ctx       = sourceCanvas.getContext('2d');
        var imageData = ctx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
        var data      = imageData.data;
        var length    = data.length;

        // 是否创建了新ImageData对象的标志变量
        var created = false;

        var tempHelper = {
            canvas   : sourceCanvas,
            ctx      : ctx,
            imageData: imageData,
            data     : data,
            length   : length
        };

        tempHelper.creat = function () {
            created = true;

            this.newImageData = this.ctx.createImageData(imageData);
            return this.newImageData;
        };

        tempHelper.update = function () {
            if (created) {
                this.ctx.putImageData(this.newImageData, 0, 0);
            } else {
                this.ctx.putImageData(this.imageData, 0, 0);
            }
        };

        tempHelper.applyTo = function (targetCanvas) {
            var ctx = targetCanvas.getContext('2d');
            if (created) {
                ctx.putImageData(this.newImageData, 0, 0);
            } else {
                ctx.putImageData(this.imageData, 0, 0);
            }
        };

        return tempHelper;
    }

    return {
        canvasGenerator: canvasGenerator,
        canvasHelper   : canvasHelper
    }
}();

/******************************
 *         历史纪录模块
 * *****************************/
var historyRecord = function () {
    var records   = [];
    var renderContainer;
    var maxLength = 10;

    // 添加历史纪录函数
    function add(title, canvasElement) {
        var temp = tool.canvasGenerator(canvasElement);
        temp.ctx.drawImage(canvasElement, 0, 0);

        var tempRecord = {
            title : title,
            canvas: temp.canvas,
            ctx   : temp.ctx,
            date  : new Date()
        };

        records.push(tempRecord);

        if (records.length > maxLength) {
            records.shift();
        }
    }

    // 移除历史纪录函数
    function remove(index) {
        // 不传入参数时默认删除最新一条记录
        index = index === undefined ? records.length - 1 : index;
        return records.splice(index, 1);
    }

    // 获取指定位置的历史纪录值
    function getRecord(index) {
        // 不传入参数时默认返回最新一条记录
        index = index === undefined ? records.length - 1 : index;
        return records[index];
    }

    // 设置需要显示历史纪录的DOM容器
    function setRenderElement(elementSecector) {
        renderContainer = typeof elementSecector === 'string' ? document.querySelector(elementSecector) : elementSecector;
    }

    // 显示历史纪录
    function render() {
        // 未指定DOM容器或者历史纪录为空时，直接返回
        if (!(renderContainer || records)) return false;
        var content = '<ul class="history">';
        for (var i = 0; i < records.length; i++) {
            content += '<li class="history-list">'
                + records[i].title
                + '<span class="history-time">'
                + records[i].date.getHours()
                + '点'
                + records[i].date.getMinutes()
                + '分'
                + records[i].date.getSeconds()
                + '秒'
                + '</span>'
                + '</li>';
        }
        content += '</ul>';
        renderContainer.innerHTML = content;
    }


    // 允许修改历史纪录的最大长度
    function changeMaxLength(num) {
        if (num > 0) {
            maxLength = num;
        }
    }

    return {
        add             : add,
        remove          : remove,
        getRecord       : getRecord,
        setRenderElement: setRenderElement,
        render          : render,
        changeMaxLength : changeMaxLength
    }

}();

/******************************
 *          直方图模块
 * *****************************/
var histogram = function () {

    var renderTarget,
        targetCtx,
        renderSource,
        sourceCtx,
        sourceImgData;

    // 红绿蓝三种颜色各亮度值对应像素数目的计数对象
    var count   = {};
    count.red   = new Array(256);
    count.green = new Array(256);
    count.blue  = new Array(256);
    count.rMax  = 0;
    count.gMax  = 0;
    count.bMax  = 0;
    count.max   = 0;

    // 设置直方图绘制在哪个canvas中
    function setRenderTarget(canvasElement) {
        renderTarget        = canvasElement;
        renderTarget.width  = 256;
        renderTarget.height = 100;
    }

    // 设置要绘制哪个canvas的直方图
    function setRenderSource(canvasElement) {
        renderSource = canvasElement;
    }

    function render() {
        // 清空canvas
        renderTarget.width = renderTarget.width;

        targetCtx     = renderTarget.getContext('2d');
        sourceCtx     = renderSource.getContext('2d');
        sourceImgData = sourceCtx.getImageData(0, 0, renderSource.width, renderSource.height);

        // 初始化为零
        for (var k = 0; k < 256; k++) {
            count.red[k]   = 0;
            count.green[k] = 0;
            count.blue[k]  = 0;
        }
        count.rMax = 0;
        count.gMax = 0;
        count.bMax = 0;
        count.max  = 0;

        var data = sourceImgData.data,
            len  = data.length;

        for (var i = 0; i < len; i += 4) {
            count.red[data[i]]++;
            count.green[data[i + 1]]++;
            count.blue[data[i + 2]]++;
        }

        // 找出三个通道各亮度像素数中的最大值
        for (var j = 0; j < 256; j++) {
            count.rMax = count.rMax < count.red[j] ? count.red[j] : count.rMax;
            count.gMax = count.gMax < count.green[j] ? count.green[j] : count.gMax;
            count.bMax = count.bMax < count.blue[j] ? count.blue[j] : count.bMax;
        }

        //        // 避免最大值超限
        //        for (var n = 0; n < 256; n++) {
        //            count.rMax = count.rMax < 100 ? count.rMax : 100;
        //            count.gMax = count.gMax < 100 ? count.gMax : 100;
        //            count.bMax = count.bMax < 100 ? count.bMax : 100;
        //        }

        count.max = count.rMax > count.max ? count.rMax : count.max;
        count.max = count.gMax > count.max ? count.gMax : count.max;
        count.max = count.bMax > count.max ? count.bMax : count.max;

        // 归一化
        for (var m = 0; m < 256; m++) {
            count.red[m] /= count.rMax / 100;
            count.green[m] /= count.gMax / 100;
            count.blue[m] /= count.bMax / 100;
        }

        // 绘制直方图
        count.red.forEach(function (value, index) {
            var tempValue       = Math.round(value);
            targetCtx.fillStyle = 'rgba(255, 0, 0, 0.55)';
            targetCtx.fillRect(index, 100 - tempValue, 1, tempValue);
            targetCtx.fillStyle = 'rgba(255, 0, 0, 0.35)';
            targetCtx.fillRect(index, 100 - tempValue, 1, 1);
        });
        count.green.forEach(function (value, index) {
            var tempValue       = Math.round(value);
            targetCtx.fillStyle = 'rgba(0, 255, 0, 0.55)';
            targetCtx.fillRect(index, 100 - tempValue, 1, tempValue);
            targetCtx.fillStyle = 'rgba(0, 255, 0, 0.35)';
            targetCtx.fillRect(index, 100 - tempValue, 1, 1);
        });
        count.blue.forEach(function (value, index) {
            var tempValue       = Math.round(value);
            targetCtx.fillStyle = 'rgba(0, 0, 255, 0.55)';
            targetCtx.fillRect(index, 100 - tempValue, 1, tempValue);
            targetCtx.fillStyle = 'rgba(0, 0, 255, 0.35)';
            targetCtx.fillRect(index, 100 - tempValue, 1, 1);
        });
    }

    return {
        setRenderTarget: setRenderTarget,
        setRenderSource: setRenderSource,
        render         : render
    }
}();

/******************************
 *          图像处理模块
 * *****************************/
var adjust = function () {
    // 各处理函数共享的对象
    var share = function () {
        var current = {};

        current.canvas   = null;
        current.operator = null;

        function setCurrentCanvas(canvasElement) {
            var temp = tool.canvasGenerator(canvasElement);
            temp.copyFrom(canvasElement);
            current.canvas = temp.canvas;
        }

        function setOperator(id) {
            current.operator = id;
        }

        function getCurrentCanvas() {
            return current.canvas;
        }

        function getOperator() {
            return current.operator;
        }

        return {
            setCurrentCanvas: setCurrentCanvas,
            setOperator     : setOperator,
            getCurrentCanvas: getCurrentCanvas,
            getOperator     : getOperator
        }
    }();

    var origin = function () {
        // 用于保存原始图像
        var canvas = null;

        // 将指定的初始化canvas元素保存以备用
        function save(canvasElement) {
            var temp = tool.canvasGenerator(canvasElement);
            temp.copyFrom(canvasElement);
            canvas = temp.canvas;
        }

        // 将已保存的初始图像恢复到指定的canvas中
        function restore(canvasElement) {
            var id = 'restoreOrigin';
            if (share.getOperator() !== id) {
                share.setCurrentCanvas(canvas);
                share.setOperator(id);
            }

            var currentCanvas = share.getCurrentCanvas();

            historyRecord.add('撤销所有修改', currentCanvas);
            historyRecord.render();

            var temp = tool.canvasHelper(currentCanvas);
            temp.applyTo(canvasElement);
        }

        return {
            save   : save,
            restore: restore
        }
    }();

    // 参考：http://blog.csdn.net/xdrt81y/article/details/8289963
    function RGB2Gray(sourceCanvas) {
        var source = tool.canvasHelper(sourceCanvas);
        var temp   = tool.canvasGenerator(sourceCanvas);

        for (var i = 0; i < temp.length; i += 4) {
            temp.data[i] = temp.data[i + 1] = temp.data[i + 2] = Math.round((source.data[i] * 299 + source.data[i + 1] * 587 + source.data[i + 2] * 114) / 1000);
            temp.data[i + 3] = source.data[i + 3];
        }

        temp.save();

        return temp;
    }

    // http://poster469.blog.163.com/blog/static/13191134201443743082/
    function RGB2HSL(color) {
        var r = color[0] / 255;
        var g = color[1] / 255;
        var b = color[2] / 255;

        var max = Math.max(r, g, b), min = Math.min(r, g, b);
        var h, s, l;

        l = (max + min) / 2;

        if (max == min) {
            h = s = 0;
        } else {
            var d = max - min;
            s     = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r:
                    h = (g - b) / d + (g < b ? 6 : 0);
                    break;
                case g:
                    h = (b - r) / d + 2;
                    break;
                case b:
                    h = (r - g) / d + 4;
                    break;
            }
            h /= 6;
        }

        return [h, s, l];
    }

    // http://poster469.blog.163.com/blog/static/13191134201443743082/
    function HSL2RGB(color) {
        var h = color[0];
        var s = color[1];
        var l = color[2];
        var r, g, b;

        function hue2rgb(p, q, t) {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        }

        if (s == 0) {
            r = g = b = l;
        } else {
            var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            var p = 2 * l - q;
            r     = hue2rgb(p, q, h + 1 / 3);
            g     = hue2rgb(p, q, h);
            b     = hue2rgb(p, q, h - 1 / 3);
        }

        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }

    // 从指定的canvas计算灰度平均值
    function getGrayAverage(sourceCanvas) {
        // 由彩色图像生成灰度图
        var grayImg = RGB2Gray(sourceCanvas);
        // 计算灰度图的灰度平均值
        var sum = 0;
        for (var i = 0, len = grayImg.data.length; i < len; i += 4) {
            sum += grayImg.data[i];
        }
        return sum / (grayImg.data.length / 4);
    }

    // 反色处理
    function colorInverse(targetCanvas) {
        var id = 'colorInverse';

        share.setCurrentCanvas(targetCanvas);
        share.setOperator(id);

        historyRecord.add('反色', mainCanvas);
        historyRecord.render();

        var source = tool.canvasHelper(share.getCurrentCanvas());

        source.creat();

        for (var i = 0; i < source.length; i += 4) {
            for (var j = 0; j < 3; j++) {
                source.newImageData.data[i + j] = 255 - source.data[i + j];
            }
            source.newImageData.data[i + 3] = source.data[i + 3];
        }

        source.applyTo(targetCanvas);
    }

    function brightAndContrast(sourceCanvas, bright, contrast) {

    }

    // 对比度调节 level：-100 ~ 100
    function contrast(targetCanvas, level) {
        var id = 'contrast';

        if (share.getOperator() !== id) {
            share.setCurrentCanvas(targetCanvas);
            share.setOperator(id);
        }

        historyRecord.add('调节对比度', mainCanvas);
        historyRecord.render();

        var source = tool.canvasHelper(share.getCurrentCanvas());
        // 为保证调整后平均亮度不变，引入灰度平均值
        var grayAverage = getGrayAverage(RGB2Gray(source.canvas).canvas);

        var values = new Array(256);
        for (var k = 0, len = values.length; k < len; k++) {
            if (level > 0) {
                values[k] = k + (k - grayAverage) * (1 / (1 - (level / 100)) - 1);
            } else {
                values[k] = k + (k - grayAverage) * level / 100;
            }
        }

        source.creat();

        for (var i = 0; i < source.length; i += 4) {
            for (var j = 0; j < 3; j++) {
                source.newImageData.data[i + j] = values[source.data[i + j]];
                // 验证值是否越界
                source.newImageData.data[i + j] = source.newImageData.data[i + j] > 255 ? 255 : source.newImageData.data[i + j] < 0 ? 0 : source.newImageData.data[i + j];
            }
            source.newImageData.data[i + 3] = source.data[i + 3];
        }

        source.applyTo(targetCanvas);


    }

    // 亮度调节 level：-100 ~ 100
    function bright(targetCanvas, level) {
        // 运行时先检查上一个图像处理操作是不是本函数发出
        // 是，则继续运行
        // 若不是，则更新current，而后继续运行
        var id = 'bright';
        if (share.getOperator() !== id) {
            share.setCurrentCanvas(targetCanvas);
            share.setOperator(id);
        }
        historyRecord.add('调节亮度', mainCanvas);
        historyRecord.render();

        var source = tool.canvasHelper(share.getCurrentCanvas());
        var delta  = level * 0.9;

        var values = new Array(256);
        for (var k = 0, len = values.length; k < len; k++) {
            values[k] = k + delta;
        }

        source.creat();

        for (var i = 0; i < source.length; i += 4) {
            for (var j = 0; j < 3; j++) {
                source.newImageData.data[i + j] = values[source.data[i + j]];
                // 验证值是否越界
                source.newImageData.data[i + j] = source.newImageData.data[i + j] > 255 ? 255 : source.newImageData.data[i + j] < 0 ? 0 : source.newImageData.data[i + j];
            }
            source.newImageData.data[i + 3] = source.data[i + 3];
        }

        source.applyTo(targetCanvas);
    }

    // 色彩平衡
    // RGB的不同相加组合可以产生CMYK中的任意一种，而相应CMYK空间中各种色彩的缺失组合也可以产生RGB色彩空间中任意一种颜色。
    // r g b : -100 ~ 100
    function colorBalance(targetCanvas, r, g, b) {
        var id = 'colorBalance';

        if (share.getOperator() !== id) {
            share.setCurrentCanvas(targetCanvas);
            share.setOperator(id);
        }

        historyRecord.add('调节色彩平衡', mainCanvas);
        historyRecord.render();

        var source = tool.canvasHelper(share.getCurrentCanvas());

        var rValues = new Array(256);
        var gValues = new Array(256);
        var bValues = new Array(256);

        for (var k = 0, len = 256; k < len; k++) {
            rValues[k] = k + r * 0.9;
            gValues[k] = k + g * 0.9;
            bValues[k] = k + b * 0.9;

            // 避免越界
            rValues[k] = rValues[k] > 255 ? 255 : rValues[k];
            gValues[k] = rValues[k] > 255 ? 255 : gValues[k];
            bValues[k] = rValues[k] > 255 ? 255 : bValues[k];
        }

        source.creat();

        for (var i = 0; i < source.length; i += 4) {
            source.newImageData.data[i]     = rValues[source.data[i]];
            source.newImageData.data[i + 1] = gValues[source.data[i + 1]];
            source.newImageData.data[i + 2] = bValues[source.data[i + 2]];
            source.newImageData.data[i + 3] = source.data[i + 3];

            // 保持明度
            var oldColor = RGB2HSL([source.data[i], source.data[i + 1], source.data[i + 2]]);
            var color    = RGB2HSL([source.newImageData.data[i], source.newImageData.data[i + 1], source.newImageData.data[i + 2]]);
            color[2]     = oldColor[2];
            var newColor = HSL2RGB(color);

            source.newImageData.data[i]     = newColor[0];
            source.newImageData.data[i + 1] = newColor[1];
            source.newImageData.data[i + 2] = newColor[2];
        }

        source.applyTo(targetCanvas);
    }

    return {
        origin      : origin,
        RGB2Gray    : RGB2Gray,
        colorInverse: colorInverse,
        bright      : bright,
        contrast    : contrast,
        colorBalance: colorBalance
    }
}();

/******************************
 *           主逻辑
 * *****************************/
var container       = document.querySelector('.container'),
    mainCanvas      = container.querySelector('#main_canvas'),
    histogramCanvas = container.querySelector('#histogram_canvas'),
    historyArea     = container.querySelector('.history-container'),
    mainCtx         = mainCanvas.getContext('2d'),
    pixels,
    canvasWidth     = 800,
    canvasHeight    = 449,
    demoImg         = new Image();

demoImg.src = './src/images/demo.jpg';

demoImg.onload = function () {
    mainCtx.drawImage(demoImg, 0, 0, canvasWidth, canvasHeight);
    pixels = mainCtx.getImageData(0, 0, canvasWidth, canvasHeight);

    // 设置历史纪录模块
    // 保存原始图像 便于还原操作
    historyRecord.setRenderElement(historyArea);
    adjust.origin.save(mainCanvas);

    // 设置直方图模块
    // 绘制直方图
    histogram.setRenderSource(mainCanvas);
    histogram.setRenderTarget(histogramCanvas);
    histogram.render();
};

/******************************
 *          事件绑定
 * *****************************/
window.onload = function () {
    var toolArea = container.querySelector('.tool');
    toolArea.addEventListener('click', function (event) {
        if (event.target.className.indexOf('restore') > -1) {
            adjust.origin.restore(mainCanvas);
            brightArea.value    = 0;
            contrastArea.value  = 0;
            colorBalanceR.value = 0;
            colorBalanceG.value = 0;
            colorBalanceB.value = 0;
            histogram.render();
        }
        if (event.target.className.indexOf('color-inverse') > -1) {
            adjust.colorInverse(mainCanvas);
            histogram.render();
        }
    });

    var brightArea = container.querySelector('.bright');
    brightArea.addEventListener('change', function (event) {
        adjust.bright(mainCanvas, event.target.value);
        histogram.render();
    });

    var contrastArea = container.querySelector('.contrast');
    contrastArea.addEventListener('change', function (event) {
        adjust.contrast(mainCanvas, event.target.value);
        histogram.render();
    });

    var colorBalanceR = container.querySelector('.color-balance-r');
    colorBalanceR.addEventListener('change', function (event) {
        adjust.colorBalance(mainCanvas, event.target.value, 0, 0);
        histogram.render();
    });

    var colorBalanceG = container.querySelector('.color-balance-g');
    colorBalanceG.addEventListener('change', function (event) {
        adjust.colorBalance(mainCanvas, 0, event.target.value, 0);
        histogram.render();
    });

    var colorBalanceB = container.querySelector('.color-balance-b');
    colorBalanceB.addEventListener('change', function (event) {
        adjust.colorBalance(mainCanvas, 0, 0, event.target.value);
        histogram.render();
    });
};
