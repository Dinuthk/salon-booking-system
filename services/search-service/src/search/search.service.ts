import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SalonIndex, SalonIndexDocument } from './schemas/salon-index.schema';
import { EventBusService } from '../events/event-bus.service';

export interface SearchQuery {
  q?: string;
  city?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  lng?: number;
  lat?: number;
  radiusKm?: number;
  page?: number;
  limit?: number;
}

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    @InjectModel(SalonIndex.name) private readonly model: Model<SalonIndexDocument>,
    private readonly bus: EventBusService,
  ) {}

  async onModuleInit() {
    // Build/maintain the read model from catalogue events.
    await this.bus.subscribe('search.salon-index', ['salon.upserted', 'salon.removed'], async (rk, p) => {
      if (rk === 'salon.removed') {
        await this.model.deleteOne({ salonId: p.salonId });
        return;
      }
      await this.upsert(p);
    });
  }

  private async upsert(p: any) {
    const activeServices = (p.services || []).filter((s: any) => s.active);
    const prices = activeServices.map((s: any) => s.price);
    await this.model.updateOne(
      { salonId: p.salonId },
      {
        $set: {
          salonId: p.salonId,
          name: p.name,
          description: p.description,
          address: p.address,
          city: p.city,
          location: p.location ?? { type: 'Point', coordinates: [0, 0] },
          photos: p.photos ?? [],
          status: p.status,
          ratingAvg: p.ratingAvg ?? 0,
          ratingCount: p.ratingCount ?? 0,
          services: p.services ?? [],
          minPrice: prices.length ? Math.min(...prices) : 0,
          categories: [...new Set(activeServices.map((s: any) => s.category))],
        },
      },
      { upsert: true },
    );
    this.logger.debug(`Indexed salon ${p.salonId}`);
  }

  async search(query: SearchQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, query.limit || 20);
    const filter: any = { status: 'active' };

    if (query.q) filter.$text = { $search: query.q };
    if (query.city) filter.city = new RegExp(`^${query.city}$`, 'i');
    if (query.category) filter.categories = query.category;
    if (query.minRating) filter.ratingAvg = { $gte: query.minRating };
    if (query.minPrice != null || query.maxPrice != null) {
      filter.minPrice = {};
      if (query.minPrice != null) filter.minPrice.$gte = query.minPrice;
      if (query.maxPrice != null) filter.minPrice.$lte = query.maxPrice;
    }

    // Geo search takes precedence when coordinates provided.
    if (query.lng != null && query.lat != null) {
      const radiusKm = query.radiusKm || 10;
      filter.location = {
        $geoWithin: {
          $centerSphere: [[query.lng, query.lat], radiusKm / 6378.1],
        },
      };
    }

    const [items, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ ratingAvg: -1, ratingCount: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.model.countDocuments(filter),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }
}
