// 首次访问弹窗
const i18nData = (window.GLOBAL_CONFIG && GLOBAL_CONFIG.i18n) || {};
const getI18n = key => i18nData[key] || '';
const formatI18n = (template, vars) => {
    if (!template) return '';
    return template.replace(/\$\{(\w+)\}/g, (_, name) => (vars[name] ?? ''));
};

if (localStorage.getItem("popWelcomeWindow") != "0") {
    if(document.referrer==undefined||document.referrer.indexOf("blog.greglee.cn")!=-1||document.referrer.indexOf("greglee.cn")!=-1||document.referrer.indexOf("localhost:4000")!=-1){ //改成自己域名，注意是referrer!!! qwq
        Snackbar.show({
            pos: "top-right",
            showAction: false,
            text: getI18n('welcome')
        })
    }else{
        Snackbar.show({
            pos: "top-right",
            showAction: false,
            text: formatI18n(getI18n('welcome_from'), { referrer: document.referrer.split("://")[1].split("/")[0] }) || getI18n('welcome')
        })
        localStorage.setItem("popWelcomeWindow", "0");
    }
}
// 关于网站
if (sessionStorage.getItem("popCookieWindow") != "0") {
    setTimeout(function () {
        Snackbar.show({
            text: getI18n('about_browser'),
            pos: 'top-center',
            actionText: getI18n('about_license'),
            onActionClick: function (element) {
                window.open("/license")
            },
        })
    }, 3000)
}
//不在弹出Cookie提醒
sessionStorage.setItem("popCookieWindow", "0");

//自带上文浏览器提示
function browserTC() {
    btf.snackbarShow("");
    Snackbar.show({
        text: getI18n('lower_browser'),
        actionText: getI18n('close'),
        duration: '6000',
        pos: 'top-center'
    });
}
function browserVersion() {
    var userAgent = navigator.userAgent; //取得浏览器的userAgent字符串
    var isIE = userAgent.indexOf("compatible") > -1 && userAgent.indexOf("MSIE") > -1; //判断是否IE<11浏览器
    var isIE11 = userAgent.indexOf('Trident') > -1 && userAgent.indexOf("rv:11.0") > -1;
    var isEdge = userAgent.indexOf("Edge") > -1 && !isIE; //Edge浏览器
    var isFirefox = userAgent.indexOf("Firefox") > -1; //Firefox浏览器
    var isOpera = userAgent.indexOf("Opera")>-1 || userAgent.indexOf("OPR")>-1 ; //Opera浏览器
    var isChrome = userAgent.indexOf("Chrome")>-1 && userAgent.indexOf("Safari")>-1 && userAgent.indexOf("Edge")==-1 && userAgent.indexOf("OPR")==-1; //Chrome浏览器
    var isSafari = userAgent.indexOf("Safari")>-1 && userAgent.indexOf("Chrome")==-1 && userAgent.indexOf("Edge")==-1 && userAgent.indexOf("OPR")==-1; //Safari浏览器
    if(isEdge) {
        if(userAgent.split('Edge/')[1].split('.')[0]<90){
            browserTC()
        }
    } else if(isFirefox) {
        if(userAgent.split('Firefox/')[1].split('.')[0]<90){
            browserTC()
        }
    } else if(isOpera) {
        if(userAgent.split('OPR/')[1].split('.')[0]<80){
            browserTC()
        }
    } else if(isChrome) {
        if(userAgent.split('Chrome/')[1].split('.')[0]<90){
            browserTC()
        }
    } else if(isSafari) {
        //不知道Safari哪个版本是该淘汰的老旧版本
    }
}
//2022-10-29修正了一个错误：过期时间应使用toGMTString()，而不是toUTCString()，否则实际过期时间在中国差了8小时
function setCookies(obj, limitTime) {
    let data = new Date(new Date().getTime() + limitTime * 24 * 60 * 60 * 1000).toGMTString()
    for (let i in obj) {
        document.cookie = i + '=' + obj[i] + ';expires=' + data
    }
}
function getCookie(name) {
    var arr, reg = new RegExp("(^| )" + name + "=([^;]*)(;|$)");
    if (arr = document.cookie.match(reg))
        return unescape(arr[2]);
    else
        return null;
}
if(getCookie('browsertc')!=1){
    setCookies({
        browsertc: 1,
    }, 1);
    browserVersion();
}

// 过时浏览器提示
if(!!window.ActiveXObject || "ActiveXObject" in window){
    window.location.href="./noie.html";
}

// F12提示
(function () {
    'use strict';

    var MESSAGE_TEXT = getI18n('devtools_warning');
    var SIZE_THRESHOLD = 160; // outer - inner 超过此值，认为 DevTools 已打开
    var CHECK_INTERVAL = 500; // ms
    var lastState = false;

    // 显示 Snackbar 提示
    function showTip() {
        if (typeof Snackbar !== 'undefined' && Snackbar.show) {
            Snackbar.show({
                text: MESSAGE_TEXT,
                pos: 'top-right',
                showAction: false,
                duration: 4000
            });
        } else {
            // 兜底：如果 Snackbar 没有加载
            alert(MESSAGE_TEXT);
        }
    }

    // 快捷键监听
    function keyListener(e) {
        var isF12 = (e.key && e.key === 'F12') || e.keyCode === 123;
        var isCtrlShiftI = (e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i');
        var isCtrlShiftJ = (e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'J' || e.key === 'j');
        if (isF12 || isCtrlShiftI || isCtrlShiftJ) {
            setTimeout(showTip, 50);
        }
    }

    // 窗口尺寸差检测
    function isDevToolsOpenBySize() {
        var widthDiff = Math.abs(window.outerWidth - window.innerWidth);
        var heightDiff = Math.abs(window.outerHeight - window.innerHeight);
        return widthDiff > SIZE_THRESHOLD || heightDiff > SIZE_THRESHOLD;
    }

    function periodicCheck() {
        var open = isDevToolsOpenBySize();
        if (open && !lastState) {
            showTip();
        }
        lastState = open;
    }

    // 初始化
    function init() {
        if (window.top !== window.self) return;
        window.addEventListener('keydown', keyListener, false);
        window.addEventListener('resize', function () {
            setTimeout(periodicCheck, 50);
        }, false);
        setInterval(periodicCheck, CHECK_INTERVAL);
    }

    init();
})();

