# Flight Schedule Generator Microservice

A standalone microservice that generates realistic, multi-day flight schedules for flight simulation enthusiasts. The service uses the Flight Routes API to create schedules that respect real-world operational constraints while providing an immersive experience.

## Features

- **Realistic Scheduling**: Generates schedules that follow real-world airline operations logic
- **Multi-Day Planning**: Supports multi-leg days and overnight stays with return-to-base logic
- **Customizable Preferences**: Configure haul types, region/country preferences, and more
- **Operational Constraints**: Respects operational hours, turnaround times, and rest periods
- **REST API**: Simple REST interface for integration with other applications

## Prerequisites

- Node.js v18 or higher
- npm or yarn
- Access to the Flight Routes API (https://flight-api.thesocialbutterflies.co)

## Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/flight-schedule-generator.git
cd flight-schedule-generator
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

Create a `.env` file in the root directory:

```
# API Configuration
API_BASE_URL=https://flight-api.thesocialbutterflies.co
API_TIMEOUT=30000

# Server Configuration
PORT=3001
NODE_ENV=development
```

4. Build the application:

```bash
npm run build
```

5. Start the server:

```bash
npm start
```

For development with auto-reload:

```bash
npm run dev
```

## API Endpoints

### `POST /api/schedule/generate`

Generate a new flight schedule.

**Request Body:**

```json
{
  "airline_id": 24,
  "airline_name": "British Airways",
  "start_airport": "LHR",
  "days": 3,
  "haul_preferences": {
    "short": true,
    "medium": true,
    "long": true
  },
  "haul_weighting": {
    "short": 0.5,
    "medium": 0.3,
    "long": 0.2
  },
  "prefer_single_leg_day_ratio": 0.4,
  "operating_hours": {
    "start": "06:00",
    "end": "23:00"
  },
  "turnaround_time_minutes": 45,
  "preferred_countries": ["Italy", "Spain", "France"],
  "preferred_regions": ["EU"],
  "minimum_rest_hours_between_long_haul": 8
}
```

**Response:**

```json
{
  "status": "success",
  "schedule": {
    "id": "uuid-string",
    "name": "British Airways 3-Day Schedule",
    "created_at": "2025-04-20T12:34:56.789Z",
    "config": { /* the original configuration */ },
    "days": [
      {
        "day": 1,
        "date": "2025-04-20",
        "legs": [
          {
            "departure_airport": "LHR",
            "arrival_airport": "FCO",
            "departure_time": "2025-04-20T08:00:00.000Z",
            "arrival_time": "2025-04-20T11:30:00.000Z",
            "haul_type": "short",
            "duration_min": 210,
            "route_id": 12345,
            "departure_city": "London",
            "departure_country": "United Kingdom",
            "arrival_city": "Rome",
            "arrival_country": "Italy",
            "airline_iata": "BA",
            "airline_name": "British Airways",
            "distance_km": 1435
          },
          /* More legs... */
        ],
        "overnight_location": "LHR",
        "notes": []
      },
      /* More days... */
    ]
  }
}
```

### `POST /api/schedule/validate`

Validate a schedule configuration without generating a schedule.

**Request Body:** Same as the generate endpoint.

**Response:**

```json
{
  "status": "success",
  "message": "Configuration is valid"
}
```

Or for invalid configurations:

```json
{
  "status": "error",
  "message": "Invalid configuration",
  "errors": [
    "At least one haul type must be allowed",
    "Days must be between 1 and 30"
  ]
}
```

### `GET /api/schedule/airlines`

Get a list of all airlines.

**Response:**

```json
{
  "status": "success",
  "airlines": [
    {
      "id": 24,
      "iata": "BA",
      "name": "British Airways"
    },
    /* More airlines... */
  ]
}
```

### `GET /api/schedule/airline/:id`

Get information about a specific airline by ID.

**Response:**

```json
{
  "status": "success",
  "airline": {
    "id": 24,
    "iata": "BA",
    "name": "British Airways"
  }
}
```

## Schedule Generator Rules

The schedule generator follows these key rules:

1. **Return-to-base**: Default behavior is to return to base daily, but overnight stays are allowed if a return is infeasible.
2. **Max destinations per day**: Maximum of 2 destination airports per day (e.g., A → B → C → A).
3. **Aircraft continuity**: Cannot switch haul type (and thus aircraft) mid-sequence. Change only allowed at base.
4. **Departure curfew**: No departures allowed outside of operating hours.
5. **Turnaround time**: Minimum time between consecutive flight arrivals and departures.
6. **One long-haul departure per day**: Long haul flights are limited to a single departure per calendar day.
7. **Minimum rest between long-hauls**: A minimum rest period must pass before another departure after a long-haul.
8. **Overnight flights allowed**: Flights departing late and arriving after midnight are permitted.
9. **Preferred destinations**: Bias route selection toward preferred countries/regions.
10. **Route repetition discouraged**: Prefer novel routes and destinations.

## Testing

For a simple test of the schedule generator, run:

```bash
NODE_PATH=./dist node dist/utils/testClient.js
```

## API Client Usage

Here's an example of how to use the API from a Node.js application:

```javascript
const axios = require('axios');

async function generateSchedule() {
  try {
    const response = await axios.post('http://localhost:3001/api/schedule/generate', {
      airline_id: 24,
      airline_name: "British Airways",
      start_airport: "LHR",
      days: 3,
      haul_preferences: {
        short: true,
        medium: true,
        long: true
      },
      haul_weighting: {
        short: 0.5,
        medium: 0.3,
        long: 0.2
      },
      prefer_single_leg_day_ratio: 0.4,
      operating_hours: {
        start: "06:00",
        end: "23:00"
      },
      turnaround_time_minutes: 45,
      preferred_countries: ["Italy", "Spain", "France"],
      preferred_regions: ["EU"],
      minimum_rest_hours_between_long_haul: 8
    });
    
    const schedule = response.data.schedule;
    console.log(`Generated a ${schedule.days.length}-day schedule for ${schedule.config.airline_name}`);
    
    return schedule;
  } catch (error) {
    console.error('Error generating schedule:', error.response?.data || error.message);
    throw error;
  }
}

generateSchedule().catch(console.error);
```

## License

MIT
