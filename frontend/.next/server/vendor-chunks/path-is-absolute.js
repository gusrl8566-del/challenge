"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/path-is-absolute";
exports.ids = ["vendor-chunks/path-is-absolute"];
exports.modules = {

/***/ "(ssr)/./node_modules/path-is-absolute/index.js":
/*!************************************************!*\
  !*** ./node_modules/path-is-absolute/index.js ***!
  \************************************************/
/***/ ((module) => {

eval("\nfunction posix(path) {\n    return path.charAt(0) === \"/\";\n}\nfunction win32(path) {\n    // https://github.com/nodejs/node/blob/b3fcc245fb25539909ef1d5eaa01dbf92e168633/lib/path.js#L56\n    var splitDeviceRe = /^([a-zA-Z]:|[\\\\\\/]{2}[^\\\\\\/]+[\\\\\\/]+[^\\\\\\/]+)?([\\\\\\/])?([\\s\\S]*?)$/;\n    var result = splitDeviceRe.exec(path);\n    var device = result[1] || \"\";\n    var isUnc = Boolean(device && device.charAt(1) !== \":\");\n    // UNC paths are always absolute\n    return Boolean(result[2] || isUnc);\n}\nmodule.exports = process.platform === \"win32\" ? win32 : posix;\nmodule.exports.posix = posix;\nmodule.exports.win32 = win32;\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHNzcikvLi9ub2RlX21vZHVsZXMvcGF0aC1pcy1hYnNvbHV0ZS9pbmRleC5qcyIsIm1hcHBpbmdzIjoiQUFBQTtBQUVBLFNBQVNBLE1BQU1DLElBQUk7SUFDbEIsT0FBT0EsS0FBS0MsTUFBTSxDQUFDLE9BQU87QUFDM0I7QUFFQSxTQUFTQyxNQUFNRixJQUFJO0lBQ2xCLCtGQUErRjtJQUMvRixJQUFJRyxnQkFBZ0I7SUFDcEIsSUFBSUMsU0FBU0QsY0FBY0UsSUFBSSxDQUFDTDtJQUNoQyxJQUFJTSxTQUFTRixNQUFNLENBQUMsRUFBRSxJQUFJO0lBQzFCLElBQUlHLFFBQVFDLFFBQVFGLFVBQVVBLE9BQU9MLE1BQU0sQ0FBQyxPQUFPO0lBRW5ELGdDQUFnQztJQUNoQyxPQUFPTyxRQUFRSixNQUFNLENBQUMsRUFBRSxJQUFJRztBQUM3QjtBQUVBRSxPQUFPQyxPQUFPLEdBQUdDLFFBQVFDLFFBQVEsS0FBSyxVQUFVVixRQUFRSDtBQUN4RFUsb0JBQW9CLEdBQUdWO0FBQ3ZCVSxvQkFBb0IsR0FBR1AiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9pbmJvZHktZnJvbnRlbmQvLi9ub2RlX21vZHVsZXMvcGF0aC1pcy1hYnNvbHV0ZS9pbmRleC5qcz85ZDJkIl0sInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gcG9zaXgocGF0aCkge1xuXHRyZXR1cm4gcGF0aC5jaGFyQXQoMCkgPT09ICcvJztcbn1cblxuZnVuY3Rpb24gd2luMzIocGF0aCkge1xuXHQvLyBodHRwczovL2dpdGh1Yi5jb20vbm9kZWpzL25vZGUvYmxvYi9iM2ZjYzI0NWZiMjU1Mzk5MDllZjFkNWVhYTAxZGJmOTJlMTY4NjMzL2xpYi9wYXRoLmpzI0w1NlxuXHR2YXIgc3BsaXREZXZpY2VSZSA9IC9eKFthLXpBLVpdOnxbXFxcXFxcL117Mn1bXlxcXFxcXC9dK1tcXFxcXFwvXStbXlxcXFxcXC9dKyk/KFtcXFxcXFwvXSk/KFtcXHNcXFNdKj8pJC87XG5cdHZhciByZXN1bHQgPSBzcGxpdERldmljZVJlLmV4ZWMocGF0aCk7XG5cdHZhciBkZXZpY2UgPSByZXN1bHRbMV0gfHwgJyc7XG5cdHZhciBpc1VuYyA9IEJvb2xlYW4oZGV2aWNlICYmIGRldmljZS5jaGFyQXQoMSkgIT09ICc6Jyk7XG5cblx0Ly8gVU5DIHBhdGhzIGFyZSBhbHdheXMgYWJzb2x1dGVcblx0cmV0dXJuIEJvb2xlYW4ocmVzdWx0WzJdIHx8IGlzVW5jKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBwcm9jZXNzLnBsYXRmb3JtID09PSAnd2luMzInID8gd2luMzIgOiBwb3NpeDtcbm1vZHVsZS5leHBvcnRzLnBvc2l4ID0gcG9zaXg7XG5tb2R1bGUuZXhwb3J0cy53aW4zMiA9IHdpbjMyO1xuIl0sIm5hbWVzIjpbInBvc2l4IiwicGF0aCIsImNoYXJBdCIsIndpbjMyIiwic3BsaXREZXZpY2VSZSIsInJlc3VsdCIsImV4ZWMiLCJkZXZpY2UiLCJpc1VuYyIsIkJvb2xlYW4iLCJtb2R1bGUiLCJleHBvcnRzIiwicHJvY2VzcyIsInBsYXRmb3JtIl0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(ssr)/./node_modules/path-is-absolute/index.js\n");

/***/ })

};
;