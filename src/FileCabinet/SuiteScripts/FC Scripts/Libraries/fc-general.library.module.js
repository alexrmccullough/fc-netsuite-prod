var none;

define([
], main);

function main() {
    
    var exports = {
        Misc: {
            FORM_MULTISELECT_DELIMITER: /\u0005/,
        }
    };


    function looksLikeYes(val) {
        if (val === true || ((typeof val == 'number') && (val !== 0))) { return true; }
        if (val === false || val === 0) { return false; }
        return val.match(/^(?:y(?:es)?|t(?:rue)?)$/i) !== null;
    }
    exports.looksLikeYes = looksLikeYes;

    function looksLikeNo(val) {
        if (val === false || val === 0) { return true; }
        if (val === true || ((typeof val == 'number') && (val !== 0))) { return false; }
        return val.match(/^(?:n(?:o)?|f(?:alse)?)$/i) !== null;
    }
    exports.looksLikeNo = looksLikeNo;
  
    return exports;
}
