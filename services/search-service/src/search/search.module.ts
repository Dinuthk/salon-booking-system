import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SalonIndex, SalonIndexSchema } from './schemas/salon-index.schema';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: SalonIndex.name, schema: SalonIndexSchema }]),
  ],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
