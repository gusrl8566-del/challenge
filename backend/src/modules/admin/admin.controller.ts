import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminUpdateScoresDto } from '../../dto/inbody-data.dto';
import { Participant } from '../../entities/participant.entity';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt-auth.guard';
import { ChallengeSeason } from '../../entities/challenge-season.entity';

type ChallengeStatusUpdateDto = {
  isOpen: boolean;
};

type CreateSeasonDto = {
  name: string;
};

type UpdateSeasonDto = {
  name: string;
};

@Controller('admin')
@UseGuards(AdminJwtAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  async adminRoot() {
    return { message: 'Admin route is protected' };
  }

  @Get('dashboard')
  async dashboard() {
    return { message: 'Admin dashboard route is protected' };
  }

  @Get('scores')
  async scores() {
    return { message: 'Admin scores route is protected' };
  }

  @Get('rankings')
  async rankings() {
    return { message: 'Admin rankings route is protected' };
  }

  @Get('challenge/status')
  async getChallengeStatus(): Promise<{ isOpen: boolean; seasonName: string | null; seasonId: string | null }> {
    return this.adminService.getChallengeStatus();
  }

  @Put('challenge/status')
  async setChallengeStatus(
    @Body() dto: ChallengeStatusUpdateDto,
  ): Promise<{ isOpen: boolean; seasonName: string | null; seasonId: string | null }> {
    return this.adminService.setChallengeStatus(Boolean(dto.isOpen));
  }

  @Get('challenge/seasons')
  async getSeasons(): Promise<ChallengeSeason[]> {
    return this.adminService.getSeasons();
  }

  @Post('challenge/seasons')
  async createSeason(@Body() dto: CreateSeasonDto): Promise<ChallengeSeason> {
    return this.adminService.createSeason(dto.name);
  }

  @Put('challenge/seasons/:id/activate')
  async activateSeason(@Param('id') id: string): Promise<ChallengeSeason> {
    return this.adminService.activateSeason(id);
  }

  @Put('challenge/seasons/:id')
  async updateSeason(
    @Param('id') id: string,
    @Body() dto: UpdateSeasonDto,
  ): Promise<ChallengeSeason> {
    return this.adminService.updateSeasonName(id, dto.name);
  }

  @Get('participants')
  async getAllParticipants(@Query('seasonId') seasonId?: string): Promise<Participant[]> {
    return this.adminService.getAllParticipants(seasonId);
  }

  @Get('participants/:id')
  async getParticipantById(@Param('id') id: string): Promise<Participant> {
    return this.adminService.getParticipantById(id);
  }

  @Put('participants/:id/scores')
  async updateScores(
    @Param('id') id: string,
    @Body() dto: AdminUpdateScoresDto,
  ): Promise<Participant> {
    return this.adminService.updateParticipantScores(id, dto);
  }

  @Delete('participants/:id')
  async deleteParticipant(@Param('id') id: string): Promise<{ message: string }> {
    return this.adminService.deleteParticipantById(id);
  }
}
