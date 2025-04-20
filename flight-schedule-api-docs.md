# Flight Schedule Generator API Documentation

## Overview

The Flight Schedule Generator API provides a way to generate realistic, multi-day flight schedules for flight simulation enthusiasts. It creates schedules that respect real-world operational constraints while offering customization options to tailor the experience.

**Base URL**: `http://localhost:3001/api/schedule`

## Authentication

Currently, the API does not require authentication.

## Response Format

All API responses follow a standard format:

For successful responses:

```json
{
  "status": "success",
  "message": "...",  // Optional
  "data": { ... }    // Varies based on endpoint
}
```

For error responses:

```json
{
  "status": "error",
  "message": "Error description",
  "errors": ["Specific error 1", "Specific error 2"]  // Optional
}
```

## Endpoints

### Generate Schedule
Generate a new flight schedule based on specified parameters.

**Endpoint**: `POST /api/schedule/generate`

**Request Body**:

| Field                            | Type    | Description                                                 | Required |
|----------------------------------|---------|-------------------------------------------------------------|----------|
| airline_id                       | integer | Identifier of the selected airline                          | Yes      |
| airline_name                     | string  | Name of the selected airline                                | Yes      |
| airline_iata                     | string  | IATA code of the airline (optional, derived from airline_id) | No       |
| start_airport                    | string  | IATA code of the base airport to start and return to        | Yes      |
| days                             | integer | Number of days to generate (1-30)                           | Yes      |
| haul_preferences                 | object  | Allowed haul types                                          | Yes      |
| haul_preferences.short           | boolean | Allow short-haul flights (0.5-3 hours)                      | Yes      |
| haul_preferences.medium          | boolean | Allow medium-haul flights (3-6 hours)                       | Yes      |
| haul_preferences.long            | boolean | Allow long-haul flights (6+ hours)                          | Yes      |
| haul_weighting                   | object  | Relative probability of choosing each haul type             | Yes      |
| haul_weighting.short             | number  | Weight for short-haul selection                             | Yes      |
| haul_weighting.medium            | number  | Weight for medium-haul selection                            | Yes      |
| haul_weighting.long              | number  | Weight for long-haul selection                              | Yes      |
| prefer_single_leg_day_ratio      | number  | Ratio to favor single-destination days (0.0-1.0)            | Yes      |
| operating_hours                  | object  | Local operating time window                                 | Yes      |
| operating_hours.start            | string  | Starting time in 24-hour format (HH:MM)                     | Yes      |
| operating_hours.end              | string  | Ending time in 24-hour format (HH:MM)                       | Yes      |
| turnaround_time_minutes          | integer | Minimum time between consecutive flights (30-180)           | Yes      |
| preferred_countries              | array   | List of countries to favor                                  | Yes      |
| preferred_regions                | array   | List of regions/continents to favor                         | Yes      |
| minimum_rest_hours_between_long_haul | integer | Minimum rest between long-haul flights (6-24)           | Yes      |
| repetition_mode                  | boolean | If true, repeats the same route multiple times per day      | Yes      |

**Example Request**:

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
  "minimum_rest_hours_between_long_haul": 8,
  "repetition_mode": false
}
```

**Response**:

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

**Error Responses**:

- `400 Bad Request`: Invalid configuration parameters
- `500 Internal Server Error`: Server error during generation

### Validate Configuration
Validate a schedule configuration without generating a schedule.

**Endpoint**: `POST /api/schedule/validate`

**Request Body**: Same as the generate endpoint.

**Response (Success)**:

```json
{
  "status": "success",
  "message": "Configuration is valid"
}
```

**Response (Error)**:

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

### Get Airlines List
Get a list of all available airlines.

**Endpoint**: `GET /api/schedule/airlines`

**Response**:

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

### Get Airline by ID
Get information about a specific airline by ID.

**Endpoint**: `GET /api/schedule/airline/:id`

**Path Parameters**:

| Parameter | Type    | Description                |
|-----------|---------|----------------------------|
| id        | integer | The airline's unique ID    |

**Response (Success)**:

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

**Response (Error)**:

```json
{
  "status": "error",
  "message": "Airline with ID 999 not found"
}
```

## Data Structures

### `HaulType`
- `short`: Flights lasting 0.5-3 hours
- `medium`: Flights lasting 3-6 hours
- `long`: Flights lasting 6+ hours

### `FlightLeg`

| Field             | Type    | Description                                       |
|-------------------|---------|---------------------------------------------------|
| departure_airport | string  | IATA code of departure airport                    |
| arrival_airport   | string  | IATA code of arrival airport                      |
| departure_time    | string  | ISO formatted departure time                      |
| arrival_time      | string  | ISO formatted arrival time                        |
| haul_type         | string  | One of: "short", "medium", "long"                 |
| duration_min      | integer | Flight duration in minutes                        |
| route_id          | integer | Unique identifier for this route                  |
| departure_city    | string  | Departure city name                               |
| departure_country | string  | Departure country name                            |
| arrival_city      | string  | Arrival city name                                 |
| arrival_country   | string  | Arrival country name                              |
| airline_iata      | string  | IATA code of the airline                          |
| airline_name      | string  | Name of the airline                               |
| distance_km       | integer | Distance in kilometers                            |

### `DaySchedule`

| Field              | Type    | Description                                       |
|--------------------|---------|---------------------------------------------------|
| day                | integer | Day number in the schedule (starting from 1)      |
| date               | string  | ISO formatted date                                |
| legs               | array   | Array of `FlightLeg` objects                      |
| overnight_location | string  | IATA code of the location for overnight stay      |
| notes              | array   | Array of string notes about the day's schedule    |

### `GeneratedSchedule`

| Field      | Type    | Description                                       |
|------------|---------|---------------------------------------------------|
| id         | string  | Unique identifier for the schedule (UUID)         |
| name       | string  | Human-readable name for the schedule              |
| created_at | string  | ISO timestamp when the schedule was created       |
| config     | object  | The original configuration object                 |
| days       | array   | Array of `DaySchedule` objects                    |

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
11. **Repetition mode**: When enabled, the generator selects a single destination for the day and repeats trips to that destination.

## Practical Usage Examples

### Basic Schedule Generation

```javascript
// Example using Axios
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
      minimum_rest_hours_between_long_haul: 8,
      repetition_mode: false
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

### Short-Haul Only Schedule

```javascript
// Example creating a short-haul only schedule
const config = {
  airline_id: 24,
  airline_name: "British Airways",
  start_airport: "LHR",
  days: 5,
  haul_preferences: {
    short: true,
    medium: false,
    long: false
  },
  haul_weighting: {
    short: 1.0,
    medium: 0.0,
    long: 0.0
  },
  prefer_single_leg_day_ratio: 0.7, // Prefer single-destination days
  operating_hours: {
    start: "06:00",
    end: "23:00"
  },
  turnaround_time_minutes: 45,
  preferred_countries: ["France", "Netherlands", "Belgium", "Germany"],
  preferred_regions: ["EU"],
  minimum_rest_hours_between_long_haul: 8,
  repetition_mode: false
};
```

### Repetitive Training Schedule

```javascript
// Example creating a repetitive schedule for training
const trainingConfig = {
  airline_id: 24,
  airline_name: "British Airways",
  start_airport: "LHR",
  days: 2,
  haul_preferences: {
    short: true,
    medium: false,
    long: false
  },
  haul_weighting: {
    short: 1.0,
    medium: 0.0,
    long: 0.0
  },
  prefer_single_leg_day_ratio: 1.0, // Always single-destination
  operating_hours: {
    start: "06:00",
    end: "22:00"
  },
  turnaround_time_minutes: 30, // Faster turnaround for training
  preferred_countries: ["France"],
  preferred_regions: ["EU"],
  minimum_rest_hours_between_long_haul: 8,
  repetition_mode: true // Enable repetition mode
};
```

## Error Handling

Common error cases and their meanings:

1. **No routes found for airline**: The specified airline doesn't have routes in the database or has an invalid ID.
2. **Configuration validation errors**: The provided configuration has invalid parameters.
3. **Server errors**: Internal server errors during schedule generation.

## Implementation Notes

- The API fetches routes from the Flight Routes API for the specified airline.
- Schedules are always generated starting from the current date.
- The generator tries to return to base daily but may schedule overnight layovers when necessary.
- Flight durations are based on real-world estimations for the routes.
- Country and region biasing increases the probability of selection but doesn't guarantee routes to those locations.
