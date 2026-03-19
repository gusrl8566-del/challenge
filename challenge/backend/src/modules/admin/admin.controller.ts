import { Controller, Get, Put, Param, Body } from '@nestjs/common';
import { AdminService } from './admin.service';
import { UpdateScoreDto } from '../../dto/score.dto';
import { UpdateSponsorDto } from '../../dto/participant.dto';
import { Participant } from '../../entities/participant.entity';
import { Score } from '../../entities/score.entity';

@Controller('admin')
export class AdminController {
  constructor(private readonly service: AdminService) {}

  @Get('participants')
  async getAll(): Promise<Participant[]> {
    return this.service.getAllParticipants();
  }

  @Get('participants/:id')
  async getOne(@Param('id') id: string): Promise<Participant> {
    return this.service.getParticipant(id);
  }

  @Put('participants/:id/scores')
  async updateScores(
    @Param('id') id: string,
    @Body() dto: UpdateScoreDto,
  ): Promise<Score> {
    return this.service.updateScores(id, dto);
  }

  @Put('participants/:id/sponsor')
  async updateSponsor(
    @Param('id') id: string,
    @Body() dto: UpdateSponsorDto,
  ): Promise<Participant> {
    return this.service.updateSponsor(id, dto);
  }
}
