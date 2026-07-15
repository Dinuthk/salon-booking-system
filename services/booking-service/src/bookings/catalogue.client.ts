import { Injectable, Logger, NotFoundException } from '@nestjs/common';

export interface CatalogueService {
  serviceId: string;
  name: string;
  durationMinutes: number;
  bufferMinutes: number;
  price: number;
  assignedStaffIds: string[];
  active: boolean;
}

export interface CatalogueSalon {
  salonId: string;
  ownerId: string;
  name: string;
  status: string;
  openingHours: Record<string, { open: string; close: string } | null>;
  services: CatalogueService[];
}

/** Reads salon + service details from the Catalogue service over HTTP. */
@Injectable()
export class CatalogueClient {
  private readonly logger = new Logger(CatalogueClient.name);
  private readonly baseUrl = process.env.CATALOGUE_URL || 'http://catalogue-service:3002';

  async getSalon(salonId: string): Promise<CatalogueSalon> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/salons/${salonId}`);
    } catch (e) {
      this.logger.error(`Catalogue unreachable: ${e}`);
      throw new NotFoundException('Salon catalogue unavailable');
    }
    if (!res.ok) throw new NotFoundException('Salon not found');
    const raw: any = await res.json();
    return {
      salonId: raw._id ?? raw.id,
      ownerId: raw.ownerId,
      name: raw.name,
      status: raw.status,
      openingHours: raw.openingHours || {},
      services: (raw.services || []).map((s: any) => ({
        serviceId: s._id ?? s.serviceId,
        name: s.name,
        durationMinutes: s.durationMinutes,
        bufferMinutes: s.bufferMinutes ?? 0,
        price: s.price,
        assignedStaffIds: s.assignedStaffIds ?? [],
        active: s.active !== false,
      })),
    };
  }
}
