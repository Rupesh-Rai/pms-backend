import { CacheService, redis } from '@/utils/redis';

describe('CacheService Unit Tests', () => {
  let redisSetMock: jest.SpiedFunction<typeof redis.set>;
  let redisGetMock: jest.SpiedFunction<typeof redis.get>;
  let redisDelMock: jest.SpiedFunction<typeof redis.del>;

  beforeEach(() => {
    redisSetMock = jest.spyOn(redis, 'set');
    redisGetMock = jest.spyOn(redis, 'get');
    redisDelMock = jest.spyOn(redis, 'del');

    redisSetMock.mockResolvedValue('OK');
    redisGetMock.mockResolvedValue(null);
    redisDelMock.mockResolvedValue(1);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('set', () => {
    it('should serialize objects to JSON and set without TTL', async () => {
      const mockData = { id: 1, name: 'Test Object' };

      await CacheService.set('test:key', mockData);

      expect(redisSetMock).toHaveBeenCalledWith(
        'test:key',
        JSON.stringify(mockData)
      );
    });

    it('should set key with EX TTL when ttlSeconds is provided', async () => {
      await CacheService.set('test:key', 'value', 3600);

      expect(redisSetMock).toHaveBeenCalledWith(
        'test:key',
        'value',
        'EX',
        3600
      );
    });
  });

  describe('get', () => {
    it('should return parsed object when valid JSON string is stored', async () => {
      const mockData = { id: 1, name: 'Clinic Sync' };

      redisGetMock.mockResolvedValue(JSON.stringify(mockData));

      const result = await CacheService.get<typeof mockData>('test:key');

      expect(redisGetMock).toHaveBeenCalledWith('test:key');
      expect(result).toEqual(mockData);
    });

    it('should return null if key does not exist', async () => {
      redisGetMock.mockResolvedValue(null);

      const result = await CacheService.get('missing:key');

      expect(redisGetMock).toHaveBeenCalledWith('missing:key');
      expect(result).toBeNull();
    });
  });

  describe('del', () => {
    it('should call redis.del with filtered valid keys', async () => {
      await CacheService.del('key1', 'key2');

      expect(redisDelMock).toHaveBeenCalledWith('key1', 'key2');
    });
  });
});
