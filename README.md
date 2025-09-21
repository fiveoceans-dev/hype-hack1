
# ts-template 🛠️

**ts-template** is your minimalist TypeScript starter for Node.js projects. No fluff, just the essentials to get you up and running with TypeScript, ESLint, Prettier, and more. Perfect for initiating any TypeScript project, whether it's a CLI tool, library, or something entirely different.

## Features ✨

- **TypeScript**: Strongly typed JavaScript for the win.
- **ESLint**: Keep your code clean and consistent.
- **Prettier**: Automatic code formatting to keep everything looking sharp.
- **VSCode Settings**: Optimized workspace settings out of the box.
- **pnpm**: Fast, disk space-efficient package manager.
- **ts-node-dev**: Instant feedback with autoreload on save.
- **tsup**: Super fast TypeScript bundler.
- **Zod**: Type-safe schema validation made easy.

## Getting Started 🚀

### 1. Clone the Repository

```bash
git clone https://github.com/xdlol-gg/ts-template.git
cd ts-template
```

### 2. Install Dependencies

Make sure you have [Yarn](https://yarnpkg.com/) installed (this project is configured for Yarn Berry). Then, run:

```bash
yarn install
```

### 3. Configure Hyperliquid Credentials

Copy the example environment file and provide your Hyperliquid testnet details:

```bash
cp .env.example .env
```

Set the following variables in `.env`:

- `HYPERLIQUID_PRIVATE_KEY` – Vault signer private key as a 0x-prefixed 64 character hex string.
- `HYPERLIQUID_TESTNET_RPC_URL` – HTTP RPC endpoint for the Hyperliquid testnet.
- `HYPERLIQUID_TESTNET_WS_URL` – WebSocket endpoint for the Hyperliquid testnet.
- `HYPERLIQUID_VAULT_ADDRESS` – Vault contract address you plan to publish.

The CLI validates these values on start-up and exits with a helpful error message if anything is missing or malformed.

### 4. Run the Hyperliquid deployment script

With your environment configured, trigger a deployment attempt against the Hyperliquid testnet:

```bash
yarn deploy:hyperliquid
```

Expected logs include the vault being targeted, the client method signature that succeeded, and any response returned by the SDK:

```text
Preparing Hyperliquid deployment for vault 0xabc123...
Hyperliquid deployment succeeded using deploy(payload, signer).
Hyperliquid response: { "txHash": "0x..." }
```

If deployment fails you will see `Hyperliquid deployment failed:` followed by detailed method attempts, and the command exits with status code `1`.

### 5. Start Developing

Kickstart your development with autoreload on save:

```bash
yarn dev
```

### 6. Build for Production

Ready to ship? Build your project with:

```bash
yarn build
```

### Project Structure 📁

```bash
ts-template/
├── src/
│   └── index.ts      	# Entry point for your TypeScript project
├── .vscode/
│   └── settings.json 	# VSCode workspace settings
│   └── extensions.json # Recommended VSCode extensions
├── eslint.config.mjs   # ESLint configuration
├── build.ts      	# Build configurations for tsup
├── .prettierrc      	# Prettier configuration
├── tsconfig.json    	# TypeScript configuration
├── package.json     	# Project metadata and scripts
└── yarn.lock   	    # Dependency lockfile
```

### Scripts 📝

* **yarn dev:** Run your project with autoreload.
* **yarn deploy:hyperliquid:** Load `.env`, validate your Hyperliquid credentials, and attempt a testnet deployment using the SDK. Successful runs log the method used and response payload; failures print detailed rejection reasons and exit with code `1`.
* **yarn start:** Run your build.
* **yarn lint:** Lint your TypeScript code using ESLint.
* **yarn lint:fix:** Lint and fix your TypeScript code using ESLint.
* **yarn format:** Format your code with Prettier.
* **yarn build:** Bundle your project using tsup.

### Why ts-easy? 🤔

* **Minimal:** Just the essentials, no bloat.
* **Flexible:** Use it for any TypeScript-based project.
* **Modern:** Includes the latest and greatest tools like tsup and Zod.

### License 📄

This project is licensed under the MIT License.
