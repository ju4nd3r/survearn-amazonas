# 🌿 "survearn" — Edition: Amazonas Colombia (*Selva Viva*)

[![CI/CD Pipeline](https://img.shields.io/badge/CI-Vitest_%2B_Playwright_%2B_Docker-27ae60)](#)
[![Engine](https://img.shields.io/badge/Engine-Phaser_3_%2B_TypeScript_Strict-2980b9)](#)
[![PWA](https://img.shields.io/badge/PWA-Offline_Ready-e67e22)](#)

> **⚠️ EDUCATIONAL & SAFETY DISCLAIMER (ENGLISH):**  
> **"survearn" — Edition: Amazonas Colombia (*Selva Viva*)** is an educational survival game and work of interactive fiction. **It is NOT a real-world wilderness survival guide, medical manual, or botanical identification key.** Never consume, handle, or apply wild plants, fungi, insects, or animals in the real world based on this game alone. Many Amazonian species have lethal look-alikes or require specialized traditional detoxification.
>
> **⚠️ DESCARGO DE RESPONSABILIDAD EDUCATIVO Y DE SEGURIDAD (ESPAÑOL):**  
> **"survearn" — Edición: Amazonas Colombia (*Selva Viva*)** es un videojuego de entretenimiento educativo y ficción interactiva. **NO es una guía real de supervivencia en la selva, ni un manual médico o de identificación botánica.** Nunca consumas, manipules ni apliques plantas silvestres, hongos, insectos o animales en la vida real basándote únicamente en este juego. Muchas especies amazónicas tienen dobles mortales o requieren preparación tradicional especializada.

---

## 🇬🇧 English Overview

**survearn — Edition: Amazonas Colombia (*Selva Viva*)** is a 2D top-down pixel-art survival and ethnobotanical discovery game set in the Colombian Amazon rainforest (*Departamento del Amazonas*: Terra Firme upland forest, Várzea flooded forest, riverbanks, and oxbow lakes / *cochas*).

### Key Features
- **Character Creator & Layered Pixel-Art Sprites:** Customize your explorer's name, body type, skin tone, hair style/color, field attire, and starting backpack (*Botanist*, *River Fisher*, or *Pathfinder*).
- **Data-Driven Survival Simulation:** Manage Health, Hunger, Thirst, Stamina, Body Temperature (°C), and Wetness (%). Survive tropical downpours, nocturnal chill, waterborne parasites, plant toxins, and mosquito-borne fever.
- **Ethnobotanical Foraging & Processing:** Learn why raw **Asaí (*Euterpe precatoria*)** and **Copoazú (*Theobroma grandiflorum*)** are safe, whereas raw **Yuca Brava (*Manihot esculenta*)** is toxic unless grated, pressed with **Chambira fiber (*Astrocaryum chambira*)**, and toasted over a campfire into nourishing **Casabe**.
- **Searchable & Filterable Field Guide (*Bitácora*):** Contains **21 plants**, **15 animals**, **13 materials/items**, and **10 craftable recipes** with Latin scientific names and citations from **Instituto SINCHI**, **Instituto Humboldt**, **Parques Nacionales Naturales de Colombia**, and **IUCN**.
- **Wildlife AI & Fire Deterrence:** Finite State Machine (FSM) threats (`idle`, `wander`, `stalk`, `chase`, `attack`, `flee`) including the **Amazonian Jaguar (*Panthera onca*)**, **Black Caiman (*Melanosuchus niger*)**, and **Fer-de-Lance (*Bothrops atrox*)**. Build a **Capirona Campfire** or **Elevated Tambo Shelter** to stay safe at night.
- **Friendly Local Mentors:** Converse and barter with **Abuela Sabina** (Ethnobotanist Elder), **Mateo** (Riverine Fisher), and **Dra. Valentina Ruiz** (Field Biologist).
- **Offline-First Save System & PWA:** Autosave + 3 manual slots in IndexedDB, Zod schema validation, `v1 -> v2` migrations, checksum verification, and JSON file export/import.

### Quick Start (Single Command with Docker)

```bash
# Run production container (Multi-stage build -> Unprivileged Nginx on port 8080)
docker compose up --build
# Open http://localhost:8080

# Or run hot-reload development server on port 5173
docker compose --profile dev up
# Open http://localhost:5173
```

### Local Node.js Development & Testing

```bash
npm install
npm run validate:content   # Validate all JSON species/recipes/NPCs & EN/ES locale parity
npm run typecheck          # Strict TypeScript compiler check
npm run lint               # ESLint check
npm run test:unit          # Vitest unit tests (survival, crafting, AI, migrations, worldgen)
npm run build              # Production PWA build
npm run test:e2e           # Playwright E2E browser smoke test
```

### Controls
| Action | Desktop (Keyboard / Mouse) | Mobile / Touch |
| :--- | :--- | :--- |
| **Move** | `WASD` or `Arrow Keys` (`Shift` to Sprint) | Virtual D-Pad (Bottom-left; flips in Left-Handed Mode) |
| **Interact / Harvest / Talk** | `E` or `Space` | `🖐️ Action / Harvest` button |
| **Inspect Species (Bitácora)** | `I` | `🔍 Inspect` button |
| **Rest / Advance Time** | `R` | `⛺ Rest` button |
| **Open Bitácora (Field Guide)** | `B` | `📖 Field Guide` top button |
| **Open Crafting & Campfire** | `C` | `🔨 Craft / Cook` top button |
| **Save / Load Slots** | `G` | `💾 Save / Load` top button |
| **Consume Item** | Click item chip in HUD inventory bar | Tap item chip in HUD inventory bar |

---

## 🇨🇴 Descripción en Español (Colombia)

**survearn — Edición: Amazonas Colombia (*Selva Viva*)** es un juego de supervivencia 2D en pixel-art y descubrimiento etnobotánico ambientado en la selva amazónica colombiana (*bosque de tierra firme, bosque inundable de várzea/cananguchal, riberas y cochas*).

### Características Principales
- **Creación de Personaje con Sprites en Capas:** Personaliza nombre, complexión, tono de piel, estilo/color de cabello, vestimenta y mochila inicial (*Botánico*, *Pescador Ribereño* o *Trochero*).
- **Simulación de Supervivencia Basada en Datos:** Administra Salud, Alimento, Agua, Energía, Temperatura Corporal (°C) y Humedad (%).
- **Recolección, Procesamiento y Saberes Amazónicos:** Aprende a diferenciar frutos comestibles crudos como el **Asaí (*Euterpe precatoria*)** o la **Uva Caimarona (*Pourouma cecropiifolia*)** de la **Yuca Brava (*Manihot esculenta*)**, que debe procesarse en el fogón con **fibra de cumare** para elaborar **Casabe** libre de cianuro. Hierve el agua cruda del río en totuma para evitar parásitos.
- **Bitácora Etnobotánica y de Fauna:** Catálogo interactivo con buscador y filtros que documenta **21 plantas**, **15 animales**, **13 materiales** y **10 recetas artesanales**, con nombres científicos en latín y fuentes del **Instituto SINCHI**, **Instituto Humboldt**, **Parques Nacionales Naturales** e **IUCN**.
- **IA de Fauna y Refugio:** Máquinas de estados finitos para el **Jaguar (*Panthera onca*)**, **Caimán Negro (*Melanosuchus niger*)** y **Talla Equis (*Bothrops atrox*)**. Enciende una **Fogata de Capirona** o construye un **Tambo elevado** para protegerte de la lluvia y los depredadores nocturnos.
- **Mentores Locales Amigables:** Dialoga y haz trueque con la **Abuela Sabina**, **Mateo Ahuanari** y la **Dra. Valentina Ruiz** en tu camino hacia **Puerto Esperanza**.

### Ejecución Rápida con un Solo Comando (Docker)

```bash
# Levantar entorno de producción en Nginx sin privilegios (Puerto 8080)
docker compose up --build
# Abrir http://localhost:8080

# O levantar entorno de desarrollo con recarga en vivo (Puerto 5173)
docker compose --profile dev up
# Abrir http://localhost:5173
```

### Documentación Arquitectónica
- [Plan Completo de Implementación (`/docs/IMPLEMENTATION_PLAN.md`)](./docs/IMPLEMENTATION_PLAN.md)
- [Lista de Verificación Cultural y Biológica (`/docs/CULTURAL_ACCURACY_CHECKLIST.md`)](./docs/CULTURAL_ACCURACY_CHECKLIST.md)
- [Registros de Decisiones de Arquitectura (`ADR-001` a `ADR-008` en `/docs/adr/`)](./docs/adr/)
