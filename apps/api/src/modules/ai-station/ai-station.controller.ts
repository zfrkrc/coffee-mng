import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AiStationService } from './ai-station.service';

@ApiTags('ai-station')
@Controller('ai-station')
export class AiStationController {
  constructor(private readonly aiStation: AiStationService) {}

  @Get('snapshot')
  snapshot() {
    return this.aiStation.getSnapshot();
  }
}
