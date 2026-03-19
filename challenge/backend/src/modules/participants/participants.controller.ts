import { Controller, Post, Get, Put, Body, Param } from '@nestjs/common';
import { ParticipantsService } from './participants.service';
import { CreateParticipantDto, LoginDto, UpdateSponsorDto } from '../../dto/participant.dto';
import { Participant } from '../../entities/participant.entity';

@Controller('participants')
export class ParticipantsController {
  constructor(private readonly participantsService: ParticipantsService) {}

  @Post('register')
  async register(@Body() dto: CreateParticipantDto): Promise<Omit<Participant, 'password'>> {
    const participant = await this.participantsService.create(dto);
    const { password, ...result } = participant;
    return result;
  }

  @Post('login')
  async login(@Body() dto: LoginDto): Promise<Omit<Participant, 'password'>> {
    const participant = await this.participantsService.login(dto);
    const { password, ...result } = participant;
    return result;
  }

  @Get()
  async findAll(): Promise<Omit<Participant, 'password'>[]> {
    const participants = await this.participantsService.findAll();
    return participants.map(({ password, ...rest }) => rest as Omit<Participant, 'password'>);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Omit<Participant, 'password'>> {
    const participant = await this.participantsService.findOne(id);
    const { password, ...result } = participant;
    return result;
  }

  @Put(':id/sponsor')
  async updateSponsor(
    @Param('id') id: string,
    @Body() dto: UpdateSponsorDto,
  ): Promise<Omit<Participant, 'password'>> {
    const participant = await this.participantsService.updateSponsorName(id, dto.sponsorName);
    const { password, ...result } = participant;
    return result;
  }
}
