"use strict";

/******************************
 *           主逻辑
 * *****************************/
var container       = document.querySelector('.container'),
    canvas          = container.querySelector('#main_canvas'),
    histogramCanvas = container.querySelector('#histogram_canvas'),
    historyArea     = container.querySelector('.history-container'),
    ctx             = canvas.getContext('2d'),
    pixels,
    canvasWidth     = 800,
    canvasHeight    = 449,
    demoImg         = new Image();

demoImg.src = './src/images/demo.jpg';

demoImg.onload = function () {
    ctx.drawImage(demoImg, 0, 0, canvasWidth, canvasHeight);
    pixels = ctx.getImageData(0, 0, canvasWidth, canvasHeight);

    historyRecord.saveOrigin(canvas);

    histogram.setRenderSource(canvas);
    histogram.setRenderTarget(histogramCanvas);
    histogram.render();
};


/******************************
 *         历史纪录模块
 * *****************************/
var historyRecord = function () {
    var records   = [];
    var renderContainer;
    var maxLength = 10;

    // 用于保存原始图像
    var originalRecord = function () {
        var canvas = document.createElement('canvas');
        var ctx    = canvas.getContext('2d');
        return {
            canvas: canvas,
            ctx   : ctx
        }
    }();

    // 添加历史纪录函数
    function add(title, canvasElement) {
        var tempCanvas = document.createElement('canvas');
        var tempCtx    = tempCanvas.getContext('2d');

        tempCanvas.width  = canvasElement.width;
        tempCanvas.height = canvasElement.height;
        tempCtx.drawImage(canvasElement, 0, 0);

        var tempRecord = {
            title : title,
            canvas: tempCanvas,
            ctx   : tempCtx,
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

    // 将指定的初始化canvas元素保存以备用
    function saveOrigin(canvasElement) {
        originalRecord.canvas.width  = canvasElement.width;
        originalRecord.canvas.height = canvasElement.height;
        originalRecord.ctx.drawImage(canvasElement, 0, 0);
    }

    // 将已保存的初始图像恢复到指定的canvas中
    function restoreOrigin(canvasElement) {
        var ctx = canvasElement.getContext('2d');

        canvasElement.width  = originalRecord.canvas.width;
        canvasElement.height = originalRecord.canvas.height;

        ctx.drawImage(originalRecord.canvas, 0, 0);
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
        saveOrigin      : saveOrigin,
        restoreOrigin   : restoreOrigin,
        changeMaxLength : changeMaxLength
    }

}();

historyRecord.setRenderElement(historyArea);


/******************************
 *          直方图模块
 * *****************************/
var histogram = function () {

    var renderTarget,
        targetCtx,
        targetImgData,
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

//反色处理
function colorInverse(imgData) {
    var data = imgData.data;
    for (var i = 0, len = data.length; i < len; i += 4) {
        for (var j = 0; j < 3; j++) {
            data[i + j] = 255 - data[i + j];
        }
    }
}

/******************************
 *          事件绑定
 * *****************************/
var toolArea = container.querySelector('.tool');
toolArea.addEventListener('click', function (event) {
    if (event.target.className.indexOf('restore') > -1) {
        historyRecord.restoreOrigin(canvas);
        historyRecord.add('撤销所有修改', canvas);
        historyRecord.render();
    }
    if (event.target.className.indexOf('color-inverse') > -1) {
        historyRecord.add('反色', canvas);
        historyRecord.render();
        colorInverse(pixels);
        ctx.putImageData(pixels, 0, 0);
    }
});

