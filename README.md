# Realms

**A Dungeons & Dragons 5th Edition (2024) character manager.**

Realms is a character management application designed to help players create, organize, and maintain their D&D characters. It focuses on character data, derived statistics, spells, equipment-related rules, and character resources rather than dice rolling.

## Features

- **Character management** — Create, store, and manage D&D characters.
- **Character statistics** — Track ability scores, modifiers, armor class, and other character information.
- **Rules-based calculations** — Support derived values and D&D 5e (2024) mechanics.
- **Spells and spell slots** — Organize spells by level and manage available spell slots.
- **Character resources** — Track class features and limited-use resources, including their recovery on short and long rests.
- **Portraits** — Associate an image with a character.
- **Import and export** — Export characters as JSON and import them later, including embedded portrait data for portability.
- **Persistent storage** — Keep character data available between app sessions.

## Tech Stack

- **React Native** — Cross-platform application framework.
- **Expo** — Development tooling and native API integration.
- **Expo Router** — File-based application navigation.
- **TypeScript** — Type-safe application development.
- **Expo Document Picker** — Select character JSON files for import.
- **Expo FileSystem** — Read, write, and manage character files and portrait images.
- **Expo Crypto** — Generate unique character identifiers.

## Getting Started

### Prerequisites

- Node.js compatible with the installed Expo SDK
- npm
- Expo Go for compatible-device testing, or an appropriate native development build

### Installation

Clone the repository and install its dependencies:

```bash
git clone https://github.com/AlirezaDa-jc/realms-dnd.git
cd Realms
npm install
```

If you already have the project locally, open the project directory and run `npm install` when needed.

### Run the application

Start the Expo development server:

```bash
npx expo start
```

Follow the terminal instructions to launch the app on a compatible device or emulator.

## Character Import and Export

Realms uses JSON to make character data portable between app installations.

### Export

A character is serialized into JSON. Portrait image data is embedded in the exported file so the character does not depend on the original device's local image path.

### Import

When a character is imported:

1. The JSON file is selected using the native file picker.
2. The character data is parsed and reconstructed.
3. A new unique ID is generated for the imported character.
4. Embedded portrait data is restored to the app's local document storage.
5. The character is saved to the application's character storage.

This approach allows imported characters to use their own locally stored portraits rather than relying on file paths from another device.

## Project Goals

Realms aims to provide a focused character-management experience with:

- Reliable character data persistence.
- Clear separation between character data and game-rule calculations.
- Automatic calculations where appropriate, with support for manual overrides.
- Flexible spell and resource management.
- Portable character backups.
- A maintainable architecture that can evolve as the application grows.

## Scope

Realms is a character manager, **not a dice-rolling application**. Its focus is on maintaining character information and supporting relevant D&D rules.

## Development

Install dependencies before starting development:

```bash
npm install
npx expo start
```

When changing Expo or React Native dependencies, prefer Expo's version-aware installer:

```bash
npx expo install <package-name>
```

## License

No license has been specified yet. All rights are reserved by default unless a license is added to this repository.
