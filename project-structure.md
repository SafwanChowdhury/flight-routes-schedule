# Flight Schedule Generator - Project Structure

```
flight-schedule-generator/
│
├── package.json            # Project configuration and dependencies
├── tsconfig.json           # TypeScript configuration
├── .env                    # Environment variables (API URL, port, etc.)
├── .gitignore              # Git ignore file
│
├── src/
│   ├── server.ts           # Express server setup
│   ├── config.ts           # Configuration and environment setup
│   │
│   ├── types/              # TypeScript type definitions
│   │   ├── inputTypes.ts   # Schedule configuration types
│   │   ├── outputTypes.ts  # Generated schedule types
│   │   └── apiTypes.ts     # Flight Routes API types
│   │
│   ├── routes/
│   │   └── scheduleRoutes.ts  # Express routes for the generator
│   │
│   ├── services/
│   │   ├── apiClient.ts    # Flight Routes API client
│   │   ├── routeClassifier.ts  # Classifies routes by haul type
│   │   ├── timingService.ts    # Time calculation utilities
│   │   └── biasService.ts      # Route biasing utilities
│   │
│   ├── algorithm/
│   │   ├── scheduleGenerator.ts  # Main schedule generation algorithm
│   │   ├── dailyScheduler.ts     # Daily schedule generation
│   │   ├── legSelector.ts        # Flight leg selection logic
│   │   └── returnPlanner.ts      # Return-to-base planning logic
│   │
│   └── utils/
│       ├── dateTimeHelper.ts     # Date & time manipulation utilities
│       ├── randomizationHelper.ts # Randomization utilities
│       ├── validationHelper.ts   # Input validation utilities
│       └── debugHelper.ts        # Debugging utilities
│
└── tests/                       # Unit and integration tests
    ├── unit/                    # Unit tests
    └── integration/             # Integration tests
```
