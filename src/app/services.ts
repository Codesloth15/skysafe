import { StaticAirportRepository } from '../infrastructure/repositories/airport-repository';
import { GeoJSONAirspaceRepository } from '../infrastructure/repositories/airspace-repository';
import { PhotonGeocodingRepository } from '../infrastructure/repositories/geocoding-repository';
import { OverpassAirportRepository } from '../infrastructure/repositories/overpass-repository';
import {
  GetPhilippineAirports,
  GetAirspaceZones,
  SearchLocation,
  CheckFlightLocation,
} from '../application/use-cases';
export const services = {
  airports: new GetPhilippineAirports(new StaticAirportRepository()),
  airspace: new GetAirspaceZones(new GeoJSONAirspaceRepository()),
  search: new SearchLocation(new PhotonGeocodingRepository()),
  check: new CheckFlightLocation(),
  overpass: new OverpassAirportRepository(),
};
