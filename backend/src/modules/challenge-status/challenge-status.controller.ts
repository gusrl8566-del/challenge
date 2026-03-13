import { Controller, Get } from '@nestjs/common';
import { ChallengeStatusService } from './challenge-status.service';

@Controller('challenge')
export class ChallengeStatusController {
  constructor(private readonly challengeStatusService: ChallengeStatusService) {}

  @Get('status')
  async getStatus(): Promise<{ isOpen: boolean; seasonName: string | null; seasonId: string | null }> {
    return this.challengeStatusService.getStatus();
  }
}
