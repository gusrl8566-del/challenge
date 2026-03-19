import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Participant } from '../../entities/participant.entity';
import { CreateParticipantDto, LoginDto } from '../../dto/participant.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class ParticipantsService {
  constructor(
    @InjectRepository(Participant)
    private participantsRepository: Repository<Participant>,
  ) {}

  async create(createDto: CreateParticipantDto): Promise<Participant> {
    const existing = await this.participantsRepository.findOne({
      where: { phone: createDto.phone },
    });

    if (existing) {
      throw new ConflictException('Phone number already registered');
    }

    const hashedPassword = await bcrypt.hash(createDto.password, 10);

    const participant = this.participantsRepository.create({
      name: createDto.name,
      phone: createDto.phone,
      password: hashedPassword,
      sponsorName: null,
    });

    return this.participantsRepository.save(participant);
  }

  async login(loginDto: LoginDto): Promise<Participant> {
    const participant = await this.participantsRepository.findOne({
      where: { phone: loginDto.phone },
    });

    if (!participant) {
      throw new UnauthorizedException('Invalid phone or password');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, participant.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid phone or password');
    }

    return participant;
  }

  async findAll(): Promise<Participant[]> {
    return this.participantsRepository.find({
      select: ['id', 'name', 'phone', 'isActive', 'sponsorName', 'createdAt'],
    });
  }

  async findOne(id: string): Promise<Participant> {
    const participant = await this.participantsRepository.findOne({
      where: { id },
      relations: ['inbodyRecords', 'score'],
    });

    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    return participant;
  }

  async findByPhone(phone: string): Promise<Participant | null> {
    return this.participantsRepository.findOne({
      where: { phone },
    });
  }

  async updateSponsorName(participantId: string, sponsorName: string): Promise<Participant> {
    const normalizedSponsorName = sponsorName.trim();
    if (!normalizedSponsorName) {
      throw new BadRequestException('Sponsor name is required');
    }

    const participant = await this.participantsRepository.findOne({
      where: { id: participantId },
    });

    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    participant.sponsorName = normalizedSponsorName;
    return this.participantsRepository.save(participant);
  }
}
