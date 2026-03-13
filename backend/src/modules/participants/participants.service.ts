import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Participant, ParticipantRole } from '../../entities/participant.entity';
import { CreateParticipantDto, LoginDto, QuickAccessDto } from '../../dto/create-participant.dto';
import * as bcrypt from 'bcrypt';
import { ChallengeStatusService } from '../challenge-status/challenge-status.service';
import { InbodyData } from '../../entities/inbody-data.entity';

@Injectable()
export class ParticipantsService {
  constructor(
    @InjectRepository(Participant)
    private participantsRepository: Repository<Participant>,
    @InjectRepository(InbodyData)
    private inbodyDataRepository: Repository<InbodyData>,
    private readonly challengeStatusService: ChallengeStatusService,
  ) {}

  async create(createParticipantDto: CreateParticipantDto): Promise<Participant> {
    const normalizedEmail = createParticipantDto.email?.trim().toLowerCase();
    const normalizedPhone = this.normalizePhone(createParticipantDto.phone);

    if (!normalizedEmail && !normalizedPhone) {
      throw new ConflictException('Email or phone is required');
    }

    if (normalizedEmail) {
      const existingByEmail = await this.participantsRepository.findOne({
        where: { email: normalizedEmail },
      });

      if (existingByEmail) {
        throw new ConflictException('Email already exists');
      }
    }

    if (normalizedPhone) {
      const existingByPhone = await this.participantsRepository.findOne({
        where: { phone: normalizedPhone },
      });

      if (existingByPhone) {
        throw new ConflictException('Phone already exists');
      }
    }

    const hashedPassword = await bcrypt.hash(createParticipantDto.password, 10);
    const activeSeason = await this.challengeStatusService.getActiveSeasonOrDefault();

    const participant = this.participantsRepository.create({
      ...createParticipantDto,
      email: normalizedEmail ?? null,
      phone: normalizedPhone,
      password: hashedPassword,
      seasonId: activeSeason.id,
    });

    return this.participantsRepository.save(participant);
  }

  async login(loginDto: LoginDto): Promise<Participant> {
    const loginId = loginDto.loginId?.trim();
    const normalizedEmail = loginId.toLowerCase();
    const normalizedPhone = this.normalizePhone(loginId);

    const where: Array<{ email?: string; phone?: string }> = [{ email: normalizedEmail }];
    if (normalizedPhone) {
      where.push({ phone: normalizedPhone });
    }

    const participant = await this.participantsRepository.findOne({
      where,
    });

    if (!participant) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, participant.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return participant;
  }

  async quickAccess(dto: QuickAccessDto): Promise<Participant> {
    const loginId = dto.loginId.trim();
    const normalizedEmail = loginId.includes('@') ? loginId.toLowerCase() : null;
    const normalizedPhone = this.normalizePhone(loginId);

    if (!normalizedEmail && !normalizedPhone) {
      throw new UnauthorizedException('Invalid access information');
    }

    const where: Array<{ email?: string; phone?: string }> = [];
    if (normalizedEmail) {
      where.push({ email: normalizedEmail });
    }
    if (normalizedPhone) {
      where.push({ phone: normalizedPhone });
    }

    let participant = await this.participantsRepository.findOne({ where });
    if (participant) {
      const activeSeason = await this.challengeStatusService.getActiveSeasonOrDefault();
      if (participant.seasonId !== activeSeason.id) {
        participant.seasonId = activeSeason.id;
        await this.inbodyDataRepository.delete({ participantId: participant.id });
      }

      if (dto.name && participant.name !== dto.name.trim()) {
        participant.name = dto.name.trim();
      }
      participant = await this.participantsRepository.save(participant);
      return participant;
    }

    const tempPassword = await bcrypt.hash(`quick-${Date.now()}`, 10);
    const activeSeason = await this.challengeStatusService.getActiveSeasonOrDefault();
    participant = this.participantsRepository.create({
      email: normalizedEmail,
      phone: normalizedPhone,
      password: tempPassword,
      name: dto.name.trim(),
      role: ParticipantRole.PARTICIPANT,
      teamName: null,
      isActive: true,
      seasonId: activeSeason.id,
    });

    return this.participantsRepository.save(participant);
  }

  async findAll(): Promise<Participant[]> {
    return this.participantsRepository.find({
      select: [
        'id',
        'email',
        'phone',
        'name',
        'teamName',
        'role',
        'isActive',
        'communicationScore',
        'inspirationScore',
        'createdAt',
      ],
    });
  }

  async findOne(id: string): Promise<Participant> {
    const participant = await this.participantsRepository.findOne({
      where: { id },
      relations: ['inbodyData'],
    });

    if (!participant) {
      throw new Error('Participant not found');
    }

    return participant;
  }

  async findByEmail(email: string): Promise<Participant | null> {
    return this.participantsRepository.findOne({
      where: { email: email.trim().toLowerCase() },
    });
  }

  private normalizePhone(value?: string): string | null {
    if (!value) {
      return null;
    }

    const onlyDigits = value.replace(/\D/g, '');
    return onlyDigits.length > 0 ? onlyDigits : null;
  }

  async updateScores(id: string, communicationScore: number, inspirationScore: number): Promise<Participant> {
    await this.participantsRepository.update(id, {
      communicationScore,
      inspirationScore,
    });

    return this.findOne(id);
  }

  async getParticipantsWithRankings(): Promise<Participant[]> {
    return this.participantsRepository.find({
      where: { isActive: true },
      relations: ['inbodyData'],
      order: { createdAt: 'DESC' },
    });
  }
}
