import {
  Controller,
  Post,
  Get,
  Body,
  Param,
} from '@nestjs/common';
import { ParticipantsService } from './participants.service';
import { CreateParticipantDto, LoginDto, QuickAccessDto } from '../../dto/create-participant.dto';
import { Participant } from '../../entities/participant.entity';

@Controller('participants')
export class ParticipantsController {
  constructor(private readonly participantsService: ParticipantsService) {}

  @Post('register')
  async register(@Body() createParticipantDto: CreateParticipantDto): Promise<Omit<Participant, 'password'>> {
    const participant = await this.participantsService.create(createParticipantDto);
    const { password, ...result } = participant;
    return result;
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto): Promise<Omit<Participant, 'password'>> {
    const participant = await this.participantsService.login(loginDto);
    const { password, ...result } = participant;
    return result;
  }

  @Post('quick-access')
  async quickAccess(@Body() dto: QuickAccessDto): Promise<Omit<Participant, 'password'>> {
    const participant = await this.participantsService.quickAccess(dto);
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
}
