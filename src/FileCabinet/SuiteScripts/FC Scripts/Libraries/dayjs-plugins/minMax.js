!function(e,n){"object"==typeof exports&&"undefined"!=typeof module?module.exports=n():"function"==typeof define&&define.amd?define(n):e.dayjs_plugin_minMax=n()}(this,function(){"use strict";return function(e,n,t){var i=function(e,n){if(!n.length)return t();var i;1===n.length&&n[0].length>0&&(n=n[0]),i=n[0];for(var r=1;r<n.length;r+=1)n[r].isValid()&&!n[r][e](i)||(i=n[r]);return i};t.max=function(){var e=[].slice.call(arguments,0);return i("isAfter",e)},t.min=function(){var e=[].slice.call(arguments,0);return i("isBefore",e)}}});