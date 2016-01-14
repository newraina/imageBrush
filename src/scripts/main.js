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

    histogram(pixels, histogramCanvas);
};


/******************************
 *           历史纪录
 * *****************************/
var historyRecord = function () {
    var records = [];
    var renderContainer;

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

        if (records.length > 10) {
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

    return {
        add             : add,
        remove          : remove,
        getRecord       : getRecord,
        setRenderElement: setRenderElement,
        render          : render
    }

}();

historyRecord.setRenderElement(historyArea);

/******************************
 *          事件绑定
 * *****************************/
var toolArea = container.querySelector('.tool');
toolArea.addEventListener('click', function (event) {
    if (event.target.className.indexOf('restore') > -1) {

    }
    if (event.target.className.indexOf('color-inverse') > -1) {
        historyRecord.add('反色', canvas);
        historyRecord.render();
        colorInverse(pixels);
        ctx.putImageData(pixels, 0, 0);
    }
});

/******************************
 *            图像处理
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

// 生成直方图
function histogram(imgData, canvasElement) {
    var data        = imgData.data,
        len         = data.length,
        // 红绿蓝三种颜色各亮度值对应像素数目的计数数组
        rBrightness = new Array(256),
        gBrightness = new Array(256),
        bBrightness = new Array(256);

    // 初始化为零
    for (var k = 0; k < 256; k++) {
        rBrightness[k] = 0;
        gBrightness[k] = 0;
        bBrightness[k] = 0;
    }

    for (var i = 0; i < len; i += 4) {
        rBrightness[data[i]]++;
        gBrightness[data[i + 1]]++;
        bBrightness[data[i + 2]]++;

    }

    // 归一化
    for (var j = 0; j < 256; j++) {
        rBrightness[j] /= len / 4 / 5000;
        gBrightness[j] /= len / 4 / 5000;
        bBrightness[j] /= len / 4 / 5000;
    }

    var histogramCtx = canvasElement.getContext('2d');

    // 绘制直方图
    rBrightness.forEach(function (value, index) {
        var tempValue          = Math.round(value);
        histogramCtx.fillStyle = 'rgba(255, 0, 0, 0.55)';
        histogramCtx.fillRect(index, 100 - tempValue, 1, tempValue);
        histogramCtx.fillStyle = 'rgba(255, 0, 0, 0.7)';
        histogramCtx.fillRect(index, 100 - tempValue, 1, 1);
    });
    gBrightness.forEach(function (value, index) {
        var tempValue          = Math.round(value);
        histogramCtx.fillStyle = 'rgba(0, 255, 0, 0.55)';
        histogramCtx.fillRect(index, 100 - tempValue, 1, tempValue);
        histogramCtx.fillStyle = 'rgba(0, 255, 0, 0.7)';
        histogramCtx.fillRect(index, 100 - tempValue, 1, 1);
    });
    bBrightness.forEach(function (value, index) {
        var tempValue          = Math.round(value);
        histogramCtx.fillStyle = 'rgba(0, 0, 255, 0.55)';
        histogramCtx.fillRect(index, 100 - tempValue, 1, tempValue);
        histogramCtx.fillStyle = 'rgba(0, 0, 255, 0.7)';
        histogramCtx.fillRect(index, 100 - tempValue, 1, 1);
    });
}
