import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get()
  find(
    @Query('q') q?: string,
    @Query('city') city?: string,
    @Query('category') category?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('minRating') minRating?: string,
    @Query('lng') lng?: string,
    @Query('lat') lat?: string,
    @Query('radiusKm') radiusKm?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const num = (v?: string) => (v == null || v === '' ? undefined : Number(v));
    return this.search.search({
      q,
      city,
      category,
      minPrice: num(minPrice),
      maxPrice: num(maxPrice),
      minRating: num(minRating),
      lng: num(lng),
      lat: num(lat),
      radiusKm: num(radiusKm),
      page: num(page),
      limit: num(limit),
    });
  }
}
