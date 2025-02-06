/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  testEnvironment: "jsdom",
  transform: {
    "^.+.tsx?$": ["ts-jest",{ diagnostics: false}],
  },
  moduleNameMapper: {
    "\\.(css|less|sass|scss)$": "<rootDir>/assets/__mocks__/styleMock.js",
    "\\.(gif|tff|eot|svg)$": "<rootDir>/assets/__mocks__/fileMock.js"
  },
};