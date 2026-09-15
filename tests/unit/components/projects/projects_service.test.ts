import { ProjectsService } from '@/components/projects/projects_service';
import { DatabaseUtil } from '@/utils/db';
import { Users } from '@/components/users/users_entity';

jest.mock('@/utils/db', () => ({
  DatabaseUtil: {
    getInstance: jest.fn(),
  },
}));

describe('ProjectsService Unit Tests', () => {
  let mockProjectRepo: any;
  let mockUserRepo: any;
  let mockQueryBuilder: any;
  let service: ProjectsService;

  beforeEach(async () => {
    // 1. Create a chainable mock QueryBuilder for BaseService.findByIds
    mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    };

    // 2. Mock Project repository with metadata and createQueryBuilder
    mockProjectRepo = {
      metadata: {
        primaryColumns: [{ propertyName: 'id' }],
        columns: [{ propertyName: 'id' }, { propertyName: 'name' }],
      },
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      find: jest.fn(),
      findBy: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    // 3. Mock User repository (populateUsers uses userRepository.find)
    mockUserRepo = {
      find: jest.fn(),
    };

    (DatabaseUtil.getInstance as jest.Mock).mockResolvedValue({
      getRepository: jest.fn().mockImplementation((entity) => {
        if (entity === Users) return mockUserRepo;
        return mockProjectRepo;
      }),
    });

    service = await ProjectsService.createInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByIds', () => {
    it('should return projects data with populated users on successful lookup', async () => {
      const mockProjects = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Clinic Sync API',
          user_ids: ['usr_1'],
        },
      ];

      const mockUsers = [
        {
          user_id: 'usr_1',
          username: 'rupesh',
        },
      ];

      // QueryBuilder returns projects, User repo returns users
      mockQueryBuilder.getMany.mockResolvedValue(mockProjects);
      mockUserRepo.find.mockResolvedValue(mockUsers);

      const result = await service.findByIds([
        '123e4567-e89b-12d3-a456-426614174000',
      ]);

      // Assert QueryBuilder was used for projects and find() for users
      expect(mockProjectRepo.createQueryBuilder).toHaveBeenCalledTimes(1);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'entity.id IN (:...ids)',
        { ids: ['123e4567-e89b-12d3-a456-426614174000'] }
      );
      expect(mockUserRepo.find).toHaveBeenCalledTimes(1);

      expect(result).toEqual({
        statusCode: 200,
        status: 'success',
        data: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: 'Clinic Sync API',
            users: [{ user_id: 'usr_1', username: 'rupesh' }],
          },
        ],
      });
    });
  });
});
