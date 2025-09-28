module.exports = {
    env: {
        node: true,
        es2022: true,
    },
    extends: [
        "eslint:recommended",
        "@typescript-eslint/recommended",
        "prettier",
    ],
    parser: "@typescript-eslint/parser",
    parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
    },
    plugins: [
        "@typescript-eslint",
        "prettier",
    ],
    ignorePatterns: [
        "node_modules/",
        "dist/",
        ".database/",
        "build.ts",
        "eslint.config.js",
    ],
    rules: {
        "@typescript-eslint/no-unused-vars": [
            "error",
            {
                args: "all",
                argsIgnorePattern: "^_",
                caughtErrors: "all",
                caughtErrorsIgnorePattern: "^_",
                destructuredArrayIgnorePattern: "^_",
                varsIgnorePattern: "^_",
                ignoreRestSiblings: true,
            },
        ],
        "prettier/prettier": "error",
    },
};
