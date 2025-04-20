/**
 * Types for the Flight Routes API responses
 */

export interface Route {
  route_id: number;
  departure_iata: string;
  departure_city: string;
  departure_country: string;
  arrival_iata: string;
  arrival_city: string;
  arrival_country: string;
  distance_km: number;
  duration_min: number;
  airline_iata: string;
  airline_name: string;
}

export interface RoutesResponse {
  routes: Route[];
  pagination: {
    total: number;
    returnedCount: number;
    limit: number;
    offset: number;
    all: boolean;
  };
}

export interface Airport {
  iata: string;
  name: string;
  city_name: string;
  country: string;
  country_code: string;
  continent: string;
  latitude: number;
  longitude: number;
}

export interface AirportsResponse {
  airports: Airport[];
}

export interface Airline {
  id: number;
  iata: string;
  name: string;
}

export interface AirlinesResponse {
  airlines: Airline[];
}

export interface Country {
  country: string;
  country_code: string;
  continent: string;
}

export interface CountriesResponse {
  countries: Country[];
}

export interface Stats {
  counts: {
    airports: number;
    airlines: number;
    routes: number;
    countries: number;
  };
  top_airlines: {
    name: string;
    route_count: number;
  }[];
  top_departure_airports: {
    name: string;
    city_name: string;
    country: string;
    route_count: number;
  }[];
}

export interface AirportRoutesResponse {
  airport: string;
  direction: string;
  total: number;
  returnedCount: number;
  all: boolean;
  routes: Route[];
}

export interface CountryRoutesResponse {
  country: string;
  direction: string;
  destination_country?: string;
  total: number;
  returnedCount: number;
  all: boolean;
  routes: Route[];
}
