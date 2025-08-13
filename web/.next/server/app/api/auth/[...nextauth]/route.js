/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "app/api/auth/[...nextauth]/route";
exports.ids = ["app/api/auth/[...nextauth]/route"];
exports.modules = {

/***/ "(rsc)/./app/api/auth/[...nextauth]/route.ts":
/*!*********************************************!*\
  !*** ./app/api/auth/[...nextauth]/route.ts ***!
  \*********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   GET: () => (/* binding */ GET),\n/* harmony export */   POST: () => (/* binding */ POST)\n/* harmony export */ });\n/* harmony import */ var _auth__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @/auth */ \"(rsc)/./auth.ts\");\n\nconst { GET, POST } = _auth__WEBPACK_IMPORTED_MODULE_0__.handlers;\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9hcHAvYXBpL2F1dGgvWy4uLm5leHRhdXRoXS9yb3V0ZS50cyIsIm1hcHBpbmdzIjoiOzs7Ozs7QUFBaUM7QUFFMUIsTUFBTSxFQUFFQyxHQUFHLEVBQUVDLElBQUksRUFBRSxHQUFHRiwyQ0FBUUEsQ0FBQSIsInNvdXJjZXMiOlsiL3Nydi9tYXRyaXgtZmxvdy1hcHAvd2ViL2FwcC9hcGkvYXV0aC9bLi4ubmV4dGF1dGhdL3JvdXRlLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGhhbmRsZXJzIH0gZnJvbSBcIkAvYXV0aFwiXG5cbmV4cG9ydCBjb25zdCB7IEdFVCwgUE9TVCB9ID0gaGFuZGxlcnMiXSwibmFtZXMiOlsiaGFuZGxlcnMiLCJHRVQiLCJQT1NUIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./app/api/auth/[...nextauth]/route.ts\n");

/***/ }),

/***/ "(rsc)/./auth.ts":
/*!*****************!*\
  !*** ./auth.ts ***!
  \*****************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   auth: () => (/* binding */ auth),\n/* harmony export */   handlers: () => (/* binding */ handlers),\n/* harmony export */   signIn: () => (/* binding */ signIn),\n/* harmony export */   signOut: () => (/* binding */ signOut)\n/* harmony export */ });\n/* harmony import */ var next_auth__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next-auth */ \"(rsc)/./node_modules/next-auth/index.js\");\n/* harmony import */ var next_auth_providers_credentials__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next-auth/providers/credentials */ \"(rsc)/./node_modules/next-auth/providers/credentials.js\");\n/* harmony import */ var _auth_prisma_adapter__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @auth/prisma-adapter */ \"(rsc)/./node_modules/@auth/prisma-adapter/index.js\");\n/* harmony import */ var _lib_db__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @/lib/db */ \"(rsc)/./lib/db.ts\");\n/* harmony import */ var bcryptjs__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! bcryptjs */ \"bcryptjs\");\n/* harmony import */ var bcryptjs__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(bcryptjs__WEBPACK_IMPORTED_MODULE_4__);\n\n\n\n\n\nconst { handlers, auth, signIn, signOut } = (0,next_auth__WEBPACK_IMPORTED_MODULE_0__[\"default\"])({\n    adapter: (0,_auth_prisma_adapter__WEBPACK_IMPORTED_MODULE_2__.PrismaAdapter)(_lib_db__WEBPACK_IMPORTED_MODULE_3__.prisma),\n    session: {\n        strategy: \"database\",\n        maxAge: 12 * 60 * 60 // 12 hours\n    },\n    providers: [\n        (0,next_auth_providers_credentials__WEBPACK_IMPORTED_MODULE_1__[\"default\"])({\n            name: \"credentials\",\n            credentials: {\n                username: {\n                    label: \"Username\",\n                    type: \"text\"\n                },\n                password: {\n                    label: \"Password\",\n                    type: \"password\"\n                }\n            },\n            async authorize (credentials) {\n                if (!credentials?.username || !credentials?.password) return null;\n                const user = await _lib_db__WEBPACK_IMPORTED_MODULE_3__.prisma.user.findFirst({\n                    where: {\n                        OR: [\n                            {\n                                username: credentials.username\n                            },\n                            {\n                                email: credentials.username\n                            }\n                        ]\n                    }\n                });\n                if (!user || !user.isActive) return null;\n                const isValid = await bcryptjs__WEBPACK_IMPORTED_MODULE_4___default().compare(credentials.password, user.passwordHash);\n                if (!isValid) return null;\n                return {\n                    id: user.id.toString(),\n                    email: user.email || user.username,\n                    name: user.fullName,\n                    role: user.role\n                };\n            }\n        })\n    ],\n    callbacks: {\n        async session ({ session, user }) {\n            if (session.user && user) {\n                const dbUser = await _lib_db__WEBPACK_IMPORTED_MODULE_3__.prisma.user.findUnique({\n                    where: {\n                        id: parseInt(user.id)\n                    }\n                });\n                if (dbUser) {\n                    session.user.id = dbUser.id;\n                    session.user.role = dbUser.role;\n                    session.user.email = dbUser.email || dbUser.username;\n                    session.user.name = dbUser.fullName;\n                }\n            }\n            return session;\n        }\n    },\n    pages: {\n        signIn: \"/login\"\n    }\n});\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9hdXRoLnRzIiwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7QUFBZ0M7QUFDeUI7QUFDTDtBQUNuQjtBQUNKO0FBbUJ0QixNQUFNLEVBQUVLLFFBQVEsRUFBRUMsSUFBSSxFQUFFQyxNQUFNLEVBQUVDLE9BQU8sRUFBRSxHQUFHUixxREFBUUEsQ0FBQztJQUMxRFMsU0FBU1AsbUVBQWFBLENBQUNDLDJDQUFNQTtJQUM3Qk8sU0FBUztRQUNQQyxVQUFVO1FBQ1ZDLFFBQVEsS0FBSyxLQUFLLEdBQUcsV0FBVztJQUNsQztJQUNBQyxXQUFXO1FBQ1RaLDJFQUFXQSxDQUFDO1lBQ1ZhLE1BQU07WUFDTkMsYUFBYTtnQkFDWEMsVUFBVTtvQkFBRUMsT0FBTztvQkFBWUMsTUFBTTtnQkFBTztnQkFDNUNDLFVBQVU7b0JBQUVGLE9BQU87b0JBQVlDLE1BQU07Z0JBQVc7WUFDbEQ7WUFDQSxNQUFNRSxXQUFVTCxXQUFXO2dCQUN6QixJQUFJLENBQUNBLGFBQWFDLFlBQVksQ0FBQ0QsYUFBYUksVUFBVSxPQUFPO2dCQUU3RCxNQUFNRSxPQUFPLE1BQU1sQiwyQ0FBTUEsQ0FBQ2tCLElBQUksQ0FBQ0MsU0FBUyxDQUFDO29CQUN2Q0MsT0FBTzt3QkFDTEMsSUFBSTs0QkFDRjtnQ0FBRVIsVUFBVUQsWUFBWUMsUUFBUTs0QkFBVzs0QkFDM0M7Z0NBQUVTLE9BQU9WLFlBQVlDLFFBQVE7NEJBQVc7eUJBQ3pDO29CQUNIO2dCQUNGO2dCQUVBLElBQUksQ0FBQ0ssUUFBUSxDQUFDQSxLQUFLSyxRQUFRLEVBQUUsT0FBTztnQkFFcEMsTUFBTUMsVUFBVSxNQUFNdkIsdURBQWMsQ0FBQ1csWUFBWUksUUFBUSxFQUFZRSxLQUFLUSxZQUFZO2dCQUN0RixJQUFJLENBQUNGLFNBQVMsT0FBTztnQkFFckIsT0FBTztvQkFDTEcsSUFBSVQsS0FBS1MsRUFBRSxDQUFDQyxRQUFRO29CQUNwQk4sT0FBT0osS0FBS0ksS0FBSyxJQUFJSixLQUFLTCxRQUFRO29CQUNsQ0YsTUFBTU8sS0FBS1csUUFBUTtvQkFDbkJDLE1BQU1aLEtBQUtZLElBQUk7Z0JBQ2pCO1lBQ0Y7UUFDRjtLQUNEO0lBQ0RDLFdBQVc7UUFDVCxNQUFNeEIsU0FBUSxFQUFFQSxPQUFPLEVBQUVXLElBQUksRUFBRTtZQUM3QixJQUFJWCxRQUFRVyxJQUFJLElBQUlBLE1BQU07Z0JBQ3hCLE1BQU1jLFNBQVMsTUFBTWhDLDJDQUFNQSxDQUFDa0IsSUFBSSxDQUFDZSxVQUFVLENBQUM7b0JBQzFDYixPQUFPO3dCQUFFTyxJQUFJTyxTQUFTaEIsS0FBS1MsRUFBRTtvQkFBRTtnQkFDakM7Z0JBRUEsSUFBSUssUUFBUTtvQkFDVHpCLFFBQVFXLElBQUksQ0FBU1MsRUFBRSxHQUFHSyxPQUFPTCxFQUFFO29CQUNuQ3BCLFFBQVFXLElBQUksQ0FBU1ksSUFBSSxHQUFHRSxPQUFPRixJQUFJO29CQUN4Q3ZCLFFBQVFXLElBQUksQ0FBQ0ksS0FBSyxHQUFHVSxPQUFPVixLQUFLLElBQUlVLE9BQU9uQixRQUFRO29CQUNwRE4sUUFBUVcsSUFBSSxDQUFDUCxJQUFJLEdBQUdxQixPQUFPSCxRQUFRO2dCQUNyQztZQUNGO1lBQ0EsT0FBT3RCO1FBQ1Q7SUFDRjtJQUNBNEIsT0FBTztRQUNML0IsUUFBUTtJQUNWO0FBQ0YsR0FBRSIsInNvdXJjZXMiOlsiL3Nydi9tYXRyaXgtZmxvdy1hcHAvd2ViL2F1dGgudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IE5leHRBdXRoIGZyb20gXCJuZXh0LWF1dGhcIlxuaW1wb3J0IENyZWRlbnRpYWxzIGZyb20gXCJuZXh0LWF1dGgvcHJvdmlkZXJzL2NyZWRlbnRpYWxzXCJcbmltcG9ydCB7IFByaXNtYUFkYXB0ZXIgfSBmcm9tIFwiQGF1dGgvcHJpc21hLWFkYXB0ZXJcIlxuaW1wb3J0IHsgcHJpc21hIH0gZnJvbSBcIkAvbGliL2RiXCJcbmltcG9ydCBiY3J5cHQgZnJvbSBcImJjcnlwdGpzXCJcblxuZGVjbGFyZSBtb2R1bGUgXCJuZXh0LWF1dGhcIiB7XG4gIGludGVyZmFjZSBTZXNzaW9uIHtcbiAgICB1c2VyOiB7XG4gICAgICBpZDogbnVtYmVyXG4gICAgICBlbWFpbDogc3RyaW5nXG4gICAgICByb2xlOiBcImFkbWluXCIgfCBcInVzZXJcIiB8IFwidmlld2VyXCJcbiAgICAgIG5hbWU/OiBzdHJpbmcgfCBudWxsXG4gICAgfVxuICB9XG59XG5cbmRlY2xhcmUgbW9kdWxlIFwiQGF1dGgvY29yZS9hZGFwdGVyc1wiIHtcbiAgaW50ZXJmYWNlIEFkYXB0ZXJVc2VyIHtcbiAgICByb2xlOiBcImFkbWluXCIgfCBcInVzZXJcIiB8IFwidmlld2VyXCJcbiAgfVxufVxuXG5leHBvcnQgY29uc3QgeyBoYW5kbGVycywgYXV0aCwgc2lnbkluLCBzaWduT3V0IH0gPSBOZXh0QXV0aCh7XG4gIGFkYXB0ZXI6IFByaXNtYUFkYXB0ZXIocHJpc21hKSxcbiAgc2Vzc2lvbjoge1xuICAgIHN0cmF0ZWd5OiBcImRhdGFiYXNlXCIsXG4gICAgbWF4QWdlOiAxMiAqIDYwICogNjAgLy8gMTIgaG91cnNcbiAgfSxcbiAgcHJvdmlkZXJzOiBbXG4gICAgQ3JlZGVudGlhbHMoe1xuICAgICAgbmFtZTogXCJjcmVkZW50aWFsc1wiLFxuICAgICAgY3JlZGVudGlhbHM6IHtcbiAgICAgICAgdXNlcm5hbWU6IHsgbGFiZWw6IFwiVXNlcm5hbWVcIiwgdHlwZTogXCJ0ZXh0XCIgfSxcbiAgICAgICAgcGFzc3dvcmQ6IHsgbGFiZWw6IFwiUGFzc3dvcmRcIiwgdHlwZTogXCJwYXNzd29yZFwiIH1cbiAgICAgIH0sXG4gICAgICBhc3luYyBhdXRob3JpemUoY3JlZGVudGlhbHMpIHtcbiAgICAgICAgaWYgKCFjcmVkZW50aWFscz8udXNlcm5hbWUgfHwgIWNyZWRlbnRpYWxzPy5wYXNzd29yZCkgcmV0dXJuIG51bGxcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHVzZXIgPSBhd2FpdCBwcmlzbWEudXNlci5maW5kRmlyc3Qoe1xuICAgICAgICAgIHdoZXJlOiB7XG4gICAgICAgICAgICBPUjogW1xuICAgICAgICAgICAgICB7IHVzZXJuYW1lOiBjcmVkZW50aWFscy51c2VybmFtZSBhcyBzdHJpbmcgfSxcbiAgICAgICAgICAgICAgeyBlbWFpbDogY3JlZGVudGlhbHMudXNlcm5hbWUgYXMgc3RyaW5nIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICAgIFxuICAgICAgICBpZiAoIXVzZXIgfHwgIXVzZXIuaXNBY3RpdmUpIHJldHVybiBudWxsXG4gICAgICAgIFxuICAgICAgICBjb25zdCBpc1ZhbGlkID0gYXdhaXQgYmNyeXB0LmNvbXBhcmUoY3JlZGVudGlhbHMucGFzc3dvcmQgYXMgc3RyaW5nLCB1c2VyLnBhc3N3b3JkSGFzaClcbiAgICAgICAgaWYgKCFpc1ZhbGlkKSByZXR1cm4gbnVsbFxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBpZDogdXNlci5pZC50b1N0cmluZygpLFxuICAgICAgICAgIGVtYWlsOiB1c2VyLmVtYWlsIHx8IHVzZXIudXNlcm5hbWUsXG4gICAgICAgICAgbmFtZTogdXNlci5mdWxsTmFtZSxcbiAgICAgICAgICByb2xlOiB1c2VyLnJvbGVcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pXG4gIF0sXG4gIGNhbGxiYWNrczoge1xuICAgIGFzeW5jIHNlc3Npb24oeyBzZXNzaW9uLCB1c2VyIH0pIHtcbiAgICAgIGlmIChzZXNzaW9uLnVzZXIgJiYgdXNlcikge1xuICAgICAgICBjb25zdCBkYlVzZXIgPSBhd2FpdCBwcmlzbWEudXNlci5maW5kVW5pcXVlKHtcbiAgICAgICAgICB3aGVyZTogeyBpZDogcGFyc2VJbnQodXNlci5pZCkgfVxuICAgICAgICB9KVxuICAgICAgICBcbiAgICAgICAgaWYgKGRiVXNlcikge1xuICAgICAgICAgIChzZXNzaW9uLnVzZXIgYXMgYW55KS5pZCA9IGRiVXNlci5pZDtcbiAgICAgICAgICAoc2Vzc2lvbi51c2VyIGFzIGFueSkucm9sZSA9IGRiVXNlci5yb2xlO1xuICAgICAgICAgIHNlc3Npb24udXNlci5lbWFpbCA9IGRiVXNlci5lbWFpbCB8fCBkYlVzZXIudXNlcm5hbWU7XG4gICAgICAgICAgc2Vzc2lvbi51c2VyLm5hbWUgPSBkYlVzZXIuZnVsbE5hbWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBzZXNzaW9uXG4gICAgfVxuICB9LFxuICBwYWdlczoge1xuICAgIHNpZ25JbjogXCIvbG9naW5cIlxuICB9XG59KSJdLCJuYW1lcyI6WyJOZXh0QXV0aCIsIkNyZWRlbnRpYWxzIiwiUHJpc21hQWRhcHRlciIsInByaXNtYSIsImJjcnlwdCIsImhhbmRsZXJzIiwiYXV0aCIsInNpZ25JbiIsInNpZ25PdXQiLCJhZGFwdGVyIiwic2Vzc2lvbiIsInN0cmF0ZWd5IiwibWF4QWdlIiwicHJvdmlkZXJzIiwibmFtZSIsImNyZWRlbnRpYWxzIiwidXNlcm5hbWUiLCJsYWJlbCIsInR5cGUiLCJwYXNzd29yZCIsImF1dGhvcml6ZSIsInVzZXIiLCJmaW5kRmlyc3QiLCJ3aGVyZSIsIk9SIiwiZW1haWwiLCJpc0FjdGl2ZSIsImlzVmFsaWQiLCJjb21wYXJlIiwicGFzc3dvcmRIYXNoIiwiaWQiLCJ0b1N0cmluZyIsImZ1bGxOYW1lIiwicm9sZSIsImNhbGxiYWNrcyIsImRiVXNlciIsImZpbmRVbmlxdWUiLCJwYXJzZUludCIsInBhZ2VzIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./auth.ts\n");

/***/ }),

/***/ "(rsc)/./lib/db.ts":
/*!*******************!*\
  !*** ./lib/db.ts ***!
  \*******************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   prisma: () => (/* binding */ prisma)\n/* harmony export */ });\n/* harmony import */ var _prisma_client__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @prisma/client */ \"@prisma/client\");\n/* harmony import */ var _prisma_client__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_prisma_client__WEBPACK_IMPORTED_MODULE_0__);\n\nconst prisma = global.prisma ?? new _prisma_client__WEBPACK_IMPORTED_MODULE_0__.PrismaClient();\nif (true) global.prisma = prisma;\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9saWIvZGIudHMiLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQzZDO0FBRXRDLE1BQU1DLFNBQVNDLE9BQU9ELE1BQU0sSUFBSSxJQUFJRCx3REFBWUEsR0FBRTtBQUN6RCxJQUFJRyxJQUFxQyxFQUFFRCxPQUFPRCxNQUFNLEdBQUdBIiwic291cmNlcyI6WyIvc3J2L21hdHJpeC1mbG93LWFwcC93ZWIvbGliL2RiLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIlxuaW1wb3J0IHsgUHJpc21hQ2xpZW50IH0gZnJvbSAnQHByaXNtYS9jbGllbnQnXG5kZWNsYXJlIGdsb2JhbCB7IHZhciBwcmlzbWE6IFByaXNtYUNsaWVudCB8IHVuZGVmaW5lZCB9XG5leHBvcnQgY29uc3QgcHJpc21hID0gZ2xvYmFsLnByaXNtYSA/PyBuZXcgUHJpc21hQ2xpZW50KClcbmlmIChwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nKSBnbG9iYWwucHJpc21hID0gcHJpc21hXG4iXSwibmFtZXMiOlsiUHJpc21hQ2xpZW50IiwicHJpc21hIiwiZ2xvYmFsIiwicHJvY2VzcyJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./lib/db.ts\n");

/***/ }),

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute&page=%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute.ts&appDir=%2Fsrv%2Fmatrix-flow-app%2Fweb%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2Fsrv%2Fmatrix-flow-app%2Fweb&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=standalone&preferredRegion=&middlewareConfig=e30%3D!":
/*!********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute&page=%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute.ts&appDir=%2Fsrv%2Fmatrix-flow-app%2Fweb%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2Fsrv%2Fmatrix-flow-app%2Fweb&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=standalone&preferredRegion=&middlewareConfig=e30%3D! ***!
  \********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   patchFetch: () => (/* binding */ patchFetch),\n/* harmony export */   routeModule: () => (/* binding */ routeModule),\n/* harmony export */   serverHooks: () => (/* binding */ serverHooks),\n/* harmony export */   workAsyncStorage: () => (/* binding */ workAsyncStorage),\n/* harmony export */   workUnitAsyncStorage: () => (/* binding */ workUnitAsyncStorage)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/route-modules/app-route/module.compiled */ \"(rsc)/./node_modules/next/dist/server/route-modules/app-route/module.compiled.js\");\n/* harmony import */ var next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/dist/server/route-kind */ \"(rsc)/./node_modules/next/dist/server/route-kind.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/dist/server/lib/patch-fetch */ \"(rsc)/./node_modules/next/dist/server/lib/patch-fetch.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var _srv_matrix_flow_app_web_app_api_auth_nextauth_route_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./app/api/auth/[...nextauth]/route.ts */ \"(rsc)/./app/api/auth/[...nextauth]/route.ts\");\n\n\n\n\n// We inject the nextConfigOutput here so that we can use them in the route\n// module.\nconst nextConfigOutput = \"standalone\"\nconst routeModule = new next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppRouteRouteModule({\n    definition: {\n        kind: next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_ROUTE,\n        page: \"/api/auth/[...nextauth]/route\",\n        pathname: \"/api/auth/[...nextauth]\",\n        filename: \"route\",\n        bundlePath: \"app/api/auth/[...nextauth]/route\"\n    },\n    resolvedPagePath: \"/srv/matrix-flow-app/web/app/api/auth/[...nextauth]/route.ts\",\n    nextConfigOutput,\n    userland: _srv_matrix_flow_app_web_app_api_auth_nextauth_route_ts__WEBPACK_IMPORTED_MODULE_3__\n});\n// Pull out the exports that we need to expose from the module. This should\n// be eliminated when we've moved the other routes to the new format. These\n// are used to hook into the route.\nconst { workAsyncStorage, workUnitAsyncStorage, serverHooks } = routeModule;\nfunction patchFetch() {\n    return (0,next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__.patchFetch)({\n        workAsyncStorage,\n        workUnitAsyncStorage\n    });\n}\n\n\n//# sourceMappingURL=app-route.js.map//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvbmV4dC9kaXN0L2J1aWxkL3dlYnBhY2svbG9hZGVycy9uZXh0LWFwcC1sb2FkZXIvaW5kZXguanM/bmFtZT1hcHAlMkZhcGklMkZhdXRoJTJGJTVCLi4ubmV4dGF1dGglNUQlMkZyb3V0ZSZwYWdlPSUyRmFwaSUyRmF1dGglMkYlNUIuLi5uZXh0YXV0aCU1RCUyRnJvdXRlJmFwcFBhdGhzPSZwYWdlUGF0aD1wcml2YXRlLW5leHQtYXBwLWRpciUyRmFwaSUyRmF1dGglMkYlNUIuLi5uZXh0YXV0aCU1RCUyRnJvdXRlLnRzJmFwcERpcj0lMkZzcnYlMkZtYXRyaXgtZmxvdy1hcHAlMkZ3ZWIlMkZhcHAmcGFnZUV4dGVuc2lvbnM9dHN4JnBhZ2VFeHRlbnNpb25zPXRzJnBhZ2VFeHRlbnNpb25zPWpzeCZwYWdlRXh0ZW5zaW9ucz1qcyZyb290RGlyPSUyRnNydiUyRm1hdHJpeC1mbG93LWFwcCUyRndlYiZpc0Rldj10cnVlJnRzY29uZmlnUGF0aD10c2NvbmZpZy5qc29uJmJhc2VQYXRoPSZhc3NldFByZWZpeD0mbmV4dENvbmZpZ091dHB1dD1zdGFuZGFsb25lJnByZWZlcnJlZFJlZ2lvbj0mbWlkZGxld2FyZUNvbmZpZz1lMzAlM0QhIiwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBQStGO0FBQ3ZDO0FBQ3FCO0FBQ1k7QUFDekY7QUFDQTtBQUNBO0FBQ0Esd0JBQXdCLHlHQUFtQjtBQUMzQztBQUNBLGNBQWMsa0VBQVM7QUFDdkI7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBLFlBQVk7QUFDWixDQUFDO0FBQ0Q7QUFDQTtBQUNBO0FBQ0EsUUFBUSxzREFBc0Q7QUFDOUQ7QUFDQSxXQUFXLDRFQUFXO0FBQ3RCO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDMEY7O0FBRTFGIiwic291cmNlcyI6WyIiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQXBwUm91dGVSb3V0ZU1vZHVsZSB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL3JvdXRlLW1vZHVsZXMvYXBwLXJvdXRlL21vZHVsZS5jb21waWxlZFwiO1xuaW1wb3J0IHsgUm91dGVLaW5kIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvcm91dGUta2luZFwiO1xuaW1wb3J0IHsgcGF0Y2hGZXRjaCBhcyBfcGF0Y2hGZXRjaCB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL2xpYi9wYXRjaC1mZXRjaFwiO1xuaW1wb3J0ICogYXMgdXNlcmxhbmQgZnJvbSBcIi9zcnYvbWF0cml4LWZsb3ctYXBwL3dlYi9hcHAvYXBpL2F1dGgvWy4uLm5leHRhdXRoXS9yb3V0ZS50c1wiO1xuLy8gV2UgaW5qZWN0IHRoZSBuZXh0Q29uZmlnT3V0cHV0IGhlcmUgc28gdGhhdCB3ZSBjYW4gdXNlIHRoZW0gaW4gdGhlIHJvdXRlXG4vLyBtb2R1bGUuXG5jb25zdCBuZXh0Q29uZmlnT3V0cHV0ID0gXCJzdGFuZGFsb25lXCJcbmNvbnN0IHJvdXRlTW9kdWxlID0gbmV3IEFwcFJvdXRlUm91dGVNb2R1bGUoe1xuICAgIGRlZmluaXRpb246IHtcbiAgICAgICAga2luZDogUm91dGVLaW5kLkFQUF9ST1VURSxcbiAgICAgICAgcGFnZTogXCIvYXBpL2F1dGgvWy4uLm5leHRhdXRoXS9yb3V0ZVwiLFxuICAgICAgICBwYXRobmFtZTogXCIvYXBpL2F1dGgvWy4uLm5leHRhdXRoXVwiLFxuICAgICAgICBmaWxlbmFtZTogXCJyb3V0ZVwiLFxuICAgICAgICBidW5kbGVQYXRoOiBcImFwcC9hcGkvYXV0aC9bLi4ubmV4dGF1dGhdL3JvdXRlXCJcbiAgICB9LFxuICAgIHJlc29sdmVkUGFnZVBhdGg6IFwiL3Nydi9tYXRyaXgtZmxvdy1hcHAvd2ViL2FwcC9hcGkvYXV0aC9bLi4ubmV4dGF1dGhdL3JvdXRlLnRzXCIsXG4gICAgbmV4dENvbmZpZ091dHB1dCxcbiAgICB1c2VybGFuZFxufSk7XG4vLyBQdWxsIG91dCB0aGUgZXhwb3J0cyB0aGF0IHdlIG5lZWQgdG8gZXhwb3NlIGZyb20gdGhlIG1vZHVsZS4gVGhpcyBzaG91bGRcbi8vIGJlIGVsaW1pbmF0ZWQgd2hlbiB3ZSd2ZSBtb3ZlZCB0aGUgb3RoZXIgcm91dGVzIHRvIHRoZSBuZXcgZm9ybWF0LiBUaGVzZVxuLy8gYXJlIHVzZWQgdG8gaG9vayBpbnRvIHRoZSByb3V0ZS5cbmNvbnN0IHsgd29ya0FzeW5jU3RvcmFnZSwgd29ya1VuaXRBc3luY1N0b3JhZ2UsIHNlcnZlckhvb2tzIH0gPSByb3V0ZU1vZHVsZTtcbmZ1bmN0aW9uIHBhdGNoRmV0Y2goKSB7XG4gICAgcmV0dXJuIF9wYXRjaEZldGNoKHtcbiAgICAgICAgd29ya0FzeW5jU3RvcmFnZSxcbiAgICAgICAgd29ya1VuaXRBc3luY1N0b3JhZ2VcbiAgICB9KTtcbn1cbmV4cG9ydCB7IHJvdXRlTW9kdWxlLCB3b3JrQXN5bmNTdG9yYWdlLCB3b3JrVW5pdEFzeW5jU3RvcmFnZSwgc2VydmVySG9va3MsIHBhdGNoRmV0Y2gsICB9O1xuXG4vLyMgc291cmNlTWFwcGluZ1VSTD1hcHAtcm91dGUuanMubWFwIl0sIm5hbWVzIjpbXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute&page=%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute.ts&appDir=%2Fsrv%2Fmatrix-flow-app%2Fweb%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2Fsrv%2Fmatrix-flow-app%2Fweb&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=standalone&preferredRegion=&middlewareConfig=e30%3D!\n");

/***/ }),

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true!":
/*!******************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true! ***!
  \******************************************************************************************************/
/***/ (() => {



/***/ }),

/***/ "(ssr)/./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true!":
/*!******************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true! ***!
  \******************************************************************************************************/
/***/ (() => {



/***/ }),

/***/ "../app-render/action-async-storage.external":
/*!*******************************************************************************!*\
  !*** external "next/dist/server/app-render/action-async-storage.external.js" ***!
  \*******************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/action-async-storage.external.js");

/***/ }),

/***/ "../app-render/after-task-async-storage.external":
/*!***********************************************************************************!*\
  !*** external "next/dist/server/app-render/after-task-async-storage.external.js" ***!
  \***********************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/after-task-async-storage.external.js");

/***/ }),

/***/ "../app-render/work-async-storage.external":
/*!*****************************************************************************!*\
  !*** external "next/dist/server/app-render/work-async-storage.external.js" ***!
  \*****************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/work-async-storage.external.js");

/***/ }),

/***/ "./work-unit-async-storage.external":
/*!**********************************************************************************!*\
  !*** external "next/dist/server/app-render/work-unit-async-storage.external.js" ***!
  \**********************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/work-unit-async-storage.external.js");

/***/ }),

/***/ "@prisma/client":
/*!*********************************!*\
  !*** external "@prisma/client" ***!
  \*********************************/
/***/ ((module) => {

"use strict";
module.exports = require("@prisma/client");

/***/ }),

/***/ "bcryptjs":
/*!***************************!*\
  !*** external "bcryptjs" ***!
  \***************************/
/***/ ((module) => {

"use strict";
module.exports = require("bcryptjs");

/***/ }),

/***/ "crypto":
/*!*************************!*\
  !*** external "crypto" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("crypto");

/***/ }),

/***/ "next/dist/compiled/next-server/app-page.runtime.dev.js":
/*!*************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-page.runtime.dev.js" ***!
  \*************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/compiled/next-server/app-page.runtime.dev.js");

/***/ }),

/***/ "next/dist/compiled/next-server/app-route.runtime.dev.js":
/*!**************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-route.runtime.dev.js" ***!
  \**************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/compiled/next-server/app-route.runtime.dev.js");

/***/ }),

/***/ "node:buffer":
/*!******************************!*\
  !*** external "node:buffer" ***!
  \******************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:buffer");

/***/ }),

/***/ "node:crypto":
/*!******************************!*\
  !*** external "node:crypto" ***!
  \******************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:crypto");

/***/ }),

/***/ "node:util":
/*!****************************!*\
  !*** external "node:util" ***!
  \****************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:util");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next","vendor-chunks/next-auth","vendor-chunks/@panva","vendor-chunks/@auth","vendor-chunks/cookie"], () => (__webpack_exec__("(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute&page=%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute.ts&appDir=%2Fsrv%2Fmatrix-flow-app%2Fweb%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2Fsrv%2Fmatrix-flow-app%2Fweb&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=standalone&preferredRegion=&middlewareConfig=e30%3D!")));
module.exports = __webpack_exports__;

})();