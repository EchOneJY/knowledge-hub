import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TeamController } from './team.controller';
import { TeamService } from './team.service';
import { TeamEntity } from './entities/team.entity';
import { TeamMemberEntity } from './entities/team-member.entity';
import { UserEntity } from '../user/entities/user.entity';

describe('TeamController', () => {
  let controller: TeamController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TeamController],
      providers: [
        TeamService,
        { provide: getRepositoryToken(TeamEntity), useValue: {} },
        { provide: getRepositoryToken(TeamMemberEntity), useValue: {} },
        { provide: getRepositoryToken(UserEntity), useValue: {} },
      ],
    }).compile();

    controller = module.get<TeamController>(TeamController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
