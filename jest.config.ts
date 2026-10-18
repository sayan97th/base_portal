import type { Config } from "jest";

const config: Config = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: {
          jsx: "react-jsx",
        },
      },
    ],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "\\.(css|less|scss|sass)$": "<rootDir>/test/__mocks__/styleMock.ts",
    "\\.(png|jpg|jpeg|gif|svg|ico|webp)$": "<rootDir>/test/__mocks__/fileMock.ts",
  },
  // Every test lives in test/, mirroring the location of the file it covers
  // (test/components/admin/... tests src/components/admin/...).
  roots: ["<rootDir>/test"],
  testMatch: ["<rootDir>/test/**/*.(test|spec).(ts|tsx)"],
  collectCoverageFrom: [
    "src/components/**/*.{ts,tsx}",
    "src/utils/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
  ],
};

export default config;
